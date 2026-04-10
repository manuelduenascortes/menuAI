'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Plus, Trash2, X, AlertTriangle, Leaf, Pencil, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import type { Restaurant, Allergen, DietaryTag } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

interface Props {
  restaurant: Restaurant
  initialCategories: CategoryWithItems[]
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
}

interface CategoryWithItems {
  id: string
  name: string
  emoji?: string
  description?: string
  display_order: number
  menu_items: MenuItemFull[]
}

interface MenuItemFull {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  image_url?: string
  ingredients: { id: string; name: string }[]
  menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
  menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
}

export default function CartaManager({ restaurant, initialCategories, allergens, dietaryTags }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryWithItems[]>(initialCategories)
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '', description: '' })
  const [addingCategory, setAddingCategory] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newArray = arrayMove(items, oldIndex, newIndex)
        
        newArray.forEach((cat, idx) => {
          supabase.from('categories').update({ display_order: idx }).eq('id', cat.id).then(({ error }) => {
            if (error) toast.error('Error al guardar el nuevo orden de ' + cat.name)
          })
        })

        return newArray.map((cat, idx) => ({ ...cat, display_order: idx }))
      })
    }
  }

  async function addCategory() {
    if (!newCategory.name.trim()) return
    setLoadingCategory(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurant.id,
        name: newCategory.name,
        emoji: newCategory.emoji || null,
        description: newCategory.description || null,
        display_order: categories.length,
      })
      .select()
      .single()

    if (!error && data) {
      setCategories([...categories, { ...data, menu_items: [] }])
      setNewCategory({ name: '', emoji: '', description: '' })
      setAddingCategory(false)
      toast.success('Categoría añadida ✓')
    } else {
      toast.error('Error al añadir categoría')
    }
    setLoadingCategory(false)
  }

  function deleteCategory(categoryId: string) {
    setConfirmDialog({
      open: true,
      title: '¿Eliminar esta categoría?',
      description: 'Se eliminarán también todos los platos de esta categoría. Esta acción no se puede deshacer.',
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId)
        if (error) { toast.error('Error al eliminar categoría'); return }
        setCategories(prev => prev.filter(c => c.id !== categoryId))
        toast.success('Categoría eliminada')
      },
    })
  }

  async function toggleItemAvailable(itemId: string, available: boolean, categoryId: string) {
    const { error } = await supabase.from('menu_items').update({ available }).eq('id', itemId)
    if (error) { toast.error('Error al cambiar disponibilidad'); return }
    setCategories(categories.map(c =>
      c.id === categoryId
        ? { ...c, menu_items: c.menu_items.map(i => i.id === itemId ? { ...i, available } : i) }
        : c
    ))
    toast.success(available ? 'Plato disponible' : 'Plato no disponible')
  }

  function deleteItem(itemId: string, categoryId: string) {
    setConfirmDialog({
      open: true,
      title: '¿Eliminar este plato?',
      description: 'El plato se eliminará permanentemente. Esta acción no se puede deshacer.',
      onConfirm: async () => {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
        if (error) { toast.error('Error al eliminar plato'); return }
        setCategories(prev => prev.map(c =>
          c.id === categoryId ? { ...c, menu_items: c.menu_items.filter(i => i.id !== itemId) } : c
        ))
        toast.success('Plato eliminado')
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {categories.length} categorías · {categories.reduce((acc, c) => acc + c.menu_items.length, 0)} platos
        </p>
        <Button
          onClick={() => setAddingCategory(!addingCategory)}
          className="cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Añadir categoría
        </Button>
      </div>

      {/* New category form */}
      {addingCategory && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="pt-5 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Emoji (ej: 🍕)"
                value={newCategory.emoji}
                onChange={e => setNewCategory({ ...newCategory, emoji: e.target.value })}
                className="w-24"
              />
              <Input
                placeholder="Nombre de la categoría *"
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="Descripción (opcional)"
              value={newCategory.description}
              onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={addCategory} disabled={loadingCategory || !newCategory.name.trim()} className="cursor-pointer">
                {loadingCategory ? 'Guardando...' : 'Guardar categoría'}
              </Button>
              <Button variant="outline" onClick={() => setAddingCategory(false)} className="cursor-pointer">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {categories.length === 0 && !addingCategory && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <BookOpenIcon className="w-8 h-8 text-primary" />
          </div>
          <p className="font-serif text-xl text-foreground mb-2">Tu carta está vacía</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Empieza creando tu primera categoría (ej: Entrantes, Principales, Postres...)
          </p>
          <Button onClick={() => setAddingCategory(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" />
            Añadir primera categoría
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
              onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {categories.map(category => (
              <SortableCategory key={category.id} categoryId={category.id}>
                {(dragHandleProps) => (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 font-serif text-xl">
                          <div {...dragHandleProps} className="cursor-grab hover:bg-muted p-1 rounded md:-ml-2 text-muted-foreground mr-1">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          {category.emoji && <span>{category.emoji}</span>}
                          {category.name}
                          <Badge variant="secondary" className="text-xs font-normal">
                            {category.menu_items.length} platos
                          </Badge>
                        </CardTitle>
              <div className="flex gap-2">
                <AddItemDialog
                  categoryId={category.id}
                  allergens={allergens}
                  dietaryTags={dietaryTags}
                  onAdd={(item) => setCategories(categories.map(c =>
                    c.id === category.id ? { ...c, menu_items: [...c.menu_items, item] } : c
                  ))}
                />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>Eliminar categoría</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {category.menu_items.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-serif text-base text-foreground mb-1">Sin platos todavía</p>
                <p className="text-sm text-muted-foreground">Usa el botón &quot;Plato&quot; arriba para añadir el primero</p>
              </div>
            ) : (
              <div className="space-y-2">
                {category.menu_items.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-primary font-semibold tabular-nums">{item.price.toFixed(2)}€</span>
                        {!item.available && (
                          <Badge variant="destructive" className="text-xs">No disponible</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.menu_item_allergens.map(ma => (
                          <Badge key={ma.allergen_id} variant="outline" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {ma.allergens.name}
                          </Badge>
                        ))}
                        {item.menu_item_tags.map(mt => (
                          <Badge key={mt.tag_id} className="text-xs bg-secondary text-secondary-foreground border-0">
                            <Leaf className="w-3 h-3 mr-1" />
                            {mt.dietary_tags.name}
                          </Badge>
                        ))}
                      </div>
                      {item.ingredients.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {item.ingredients.map(i => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <EditItemDialog
                        item={item}
                        allergens={allergens}
                        dietaryTags={dietaryTags}
                        onUpdate={(updated) => setCategories(categories.map(c =>
                          c.id === category.id
                            ? { ...c, menu_items: c.menu_items.map(i => i.id === updated.id ? updated : i) }
                            : c
                        ))}
                      />
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Switch
                              checked={item.available}
                              onCheckedChange={v => toggleItemAvailable(item.id, v, category.id)}
                            />
                          }
                        />
                        <TooltipContent>{item.available ? 'Disponible' : 'No disponible'}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-7 w-7 p-0 cursor-pointer"
                              onClick={() => deleteItem(item.id, category.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>Eliminar plato</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
        </SortableCategory>
      ))}
      </div>
      </SortableContext>
      </DndContext>
    </div>
  )
}

/* Inline icon for empty state — avoids separate import */
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

// Dialog para añadir plato
function AddItemDialog({
  categoryId,
  allergens,
  dietaryTags,
  onAdd,
}: {
  categoryId: string
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
  onAdd: (item: MenuItemFull) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    ingredients: '',
  })
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function toggleAllergen(id: string) {
    setSelectedAllergens(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleTag(id: string) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price) return
    setLoading(true)

    // Insertar plato
    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        category_id: categoryId,
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        available: true,
      })
      .select()
      .single()

    if (error || !item) { toast.error('Error al añadir plato'); setLoading(false); return }

    // Ingredientes
    const ingredientNames = form.ingredients
      .split(',')
      .map(i => i.trim())
      .filter(Boolean)

    if (ingredientNames.length > 0) {
      await supabase.from('ingredients').insert(
        ingredientNames.map(name => ({ menu_item_id: item.id, name }))
      )
    }

    // Alergenos
    if (selectedAllergens.length > 0) {
      await supabase.from('menu_item_allergens').insert(
        selectedAllergens.map(allergen_id => ({ menu_item_id: item.id, allergen_id }))
      )
    }

    // Tags
    if (selectedTags.length > 0) {
      await supabase.from('menu_item_tags').insert(
        selectedTags.map(tag_id => ({ menu_item_id: item.id, tag_id }))
      )
    }

    // Construir objeto completo para el estado
    const newItem: MenuItemFull = {
      ...item,
      ingredients: ingredientNames.map((name, i) => ({ id: `temp-${i}`, name })),
      menu_item_allergens: selectedAllergens.map(aid => ({
        allergen_id: aid,
        allergens: allergens.find(a => a.id === aid)!,
      })),
      menu_item_tags: selectedTags.map(tid => ({
        tag_id: tid,
        dietary_tags: dietaryTags.find(t => t.id === tid)!,
      })),
    }

    onAdd(newItem)
    toast.success('Plato añadido ✓')
    setForm({ name: '', description: '', price: '', ingredients: '' })
    setSelectedAllergens([])
    setSelectedTags([])
    setOpen(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Plato
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Añadir plato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Ensalada César"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Breve descripción del plato..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Precio (€) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="12.50"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Ingredientes (separados por comas)</Label>
            <Input
              placeholder="Lechuga, pollo, parmesano, crutones, salsa César"
              value={form.ingredients}
              onChange={e => setForm({ ...form, ingredients: e.target.value })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Alergenos</Label>
            <div className="grid grid-cols-2 gap-2">
              {allergens.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`allergen-${a.id}`}
                    checked={selectedAllergens.includes(a.id)}
                    onCheckedChange={() => toggleAllergen(a.id)}
                  />
                  <label htmlFor={`allergen-${a.id}`} className="text-sm cursor-pointer">
                    {a.icon} {a.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Etiquetas dietéticas</Label>
            <div className="grid grid-cols-2 gap-2">
              {dietaryTags.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tag-${t.id}`}
                    checked={selectedTags.includes(t.id)}
                    onCheckedChange={() => toggleTag(t.id)}
                  />
                  <label htmlFor={`tag-${t.id}`} className="text-sm cursor-pointer">
                    {t.icon} {t.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
              {loading ? 'Guardando...' : 'Añadir plato'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Dialog para editar plato existente
function EditItemDialog({
  item,
  allergens,
  dietaryTags,
  onUpdate,
}: {
  item: MenuItemFull
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
  onUpdate: (item: MenuItemFull) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? '',
    price: item.price.toString(),
    ingredients: item.ingredients.map(i => i.name).join(', '),
  })
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    item.menu_item_allergens.map(ma => ma.allergen_id)
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    item.menu_item_tags.map(mt => mt.tag_id)
  )

  // Reset form when dialog opens (in case item changed externally)
  function handleOpenChange(v: boolean) {
    if (v) {
      setForm({
        name: item.name,
        description: item.description ?? '',
        price: item.price.toString(),
        ingredients: item.ingredients.map(i => i.name).join(', '),
      })
      setSelectedAllergens(item.menu_item_allergens.map(ma => ma.allergen_id))
      setSelectedTags(item.menu_item_tags.map(mt => mt.tag_id))
    }
    setOpen(v)
  }

  function toggleAllergen(id: string) {
    setSelectedAllergens(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleTag(id: string) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.price) return
    setLoading(true)

    // Update item
    const { error } = await supabase
      .from('menu_items')
      .update({
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
      })
      .eq('id', item.id)

    if (error) { toast.error('Error al guardar cambios'); setLoading(false); return }

    // Replace ingredients: delete old, insert new
    await supabase.from('ingredients').delete().eq('menu_item_id', item.id)
    const ingredientNames = form.ingredients.split(',').map(i => i.trim()).filter(Boolean)
    if (ingredientNames.length > 0) {
      await supabase.from('ingredients').insert(
        ingredientNames.map(name => ({ menu_item_id: item.id, name }))
      )
    }

    // Replace allergens
    await supabase.from('menu_item_allergens').delete().eq('menu_item_id', item.id)
    if (selectedAllergens.length > 0) {
      await supabase.from('menu_item_allergens').insert(
        selectedAllergens.map(allergen_id => ({ menu_item_id: item.id, allergen_id }))
      )
    }

    // Replace tags
    await supabase.from('menu_item_tags').delete().eq('menu_item_id', item.id)
    if (selectedTags.length > 0) {
      await supabase.from('menu_item_tags').insert(
        selectedTags.map(tag_id => ({ menu_item_id: item.id, tag_id }))
      )
    }

    // Optimistic update
    const updated: MenuItemFull = {
      ...item,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      ingredients: ingredientNames.map((name, i) => ({ id: `temp-${i}`, name })),
      menu_item_allergens: selectedAllergens.map(aid => ({
        allergen_id: aid,
        allergens: allergens.find(a => a.id === aid)!,
      })),
      menu_item_tags: selectedTags.map(tid => ({
        tag_id: tid,
        dietary_tags: dietaryTags.find(t => t.id === tid)!,
      })),
    }

    onUpdate(updated)
    toast.success('Plato actualizado ✓')
    setOpen(false)
    setLoading(false)
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={() => handleOpenChange(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          }
        />
        <TooltipContent>Editar plato</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Editar plato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Ensalada César"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Breve descripción del plato..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio (€) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="12.50"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ingredientes (separados por comas)</Label>
              <Input
                placeholder="Lechuga, pollo, parmesano, crutones, salsa César"
                value={form.ingredients}
                onChange={e => setForm({ ...form, ingredients: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Alergenos</Label>
              <div className="grid grid-cols-2 gap-2">
                {allergens.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-allergen-${item.id}-${a.id}`}
                      checked={selectedAllergens.includes(a.id)}
                      onCheckedChange={() => toggleAllergen(a.id)}
                    />
                    <label htmlFor={`edit-allergen-${item.id}-${a.id}`} className="text-sm cursor-pointer">
                      {a.icon} {a.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Etiquetas dietéticas</Label>
              <div className="grid grid-cols-2 gap-2">
                {dietaryTags.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-tag-${item.id}-${t.id}`}
                      checked={selectedTags.includes(t.id)}
                      onCheckedChange={() => toggleTag(t.id)}
                    />
                    <label htmlFor={`edit-tag-${item.id}-${t.id}`} className="text-sm cursor-pointer">
                      {t.icon} {t.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SortableCategory({ categoryId, children }: { categoryId: string, children: (dragHandleProps: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: categoryId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}
