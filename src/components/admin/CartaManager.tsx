'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Plus, Trash2, X, AlertTriangle, Leaf, Pencil, GripVertical, ImagePlus, Loader2 } from 'lucide-react'
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
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const [newCategory, setNewCategory] = useState({ name: '', emoji: '', description: '' })
  const [addingCategory, setAddingCategory] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  function toggleSelectAll() {
    const allCatIds = categories.map(c => c.id)
    const allItemIds = categories.flatMap(c => c.menu_items.map(i => i.id))
    
    if (selectedCategories.size === allCatIds.length && selectedItems.size === allItemIds.length && allCatIds.length + allItemIds.length > 0) {
      setSelectedCategories(new Set())
      setSelectedItems(new Set())
    } else {
      setSelectedCategories(new Set(allCatIds))
      setSelectedItems(new Set(allItemIds))
    }
  }

  function handleBulkDelete() {
    const count = selectedCategories.size + selectedItems.size
    if (count === 0) return

    setConfirmDialog({
      open: true,
      title: '¿Borrar selección?',
      description: `Se eliminarán ${selectedCategories.size} categorías y ${selectedItems.size} platos. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        let errorOccurred = false
        if (selectedCategories.size > 0) {
          const { error } = await supabase.from('categories').delete().in('id', Array.from(selectedCategories))
          if (error) errorOccurred = true
        }
        if (selectedItems.size > 0) {
          const itemsToExplicitlyDelete = Array.from(selectedItems).filter(itemId => {
             const cat = categories.find(c => c.menu_items.some(i => i.id === itemId))
             return cat && !selectedCategories.has(cat.id)
          })
          if (itemsToExplicitlyDelete.length > 0) {
            const { error } = await supabase.from('menu_items').delete().in('id', itemsToExplicitlyDelete)
            if (error) errorOccurred = true
          }
        }

        if (errorOccurred) {
          toast.error('Ocurrió un error al borrar algunos elementos')
        } else {
          toast.success('Elementos seleccionados eliminados')
        }

        setCategories(prev => prev
          .filter(c => !selectedCategories.has(c.id))
          .map(c => ({
            ...c,
            menu_items: c.menu_items.filter(i => !selectedItems.has(i.id))
          }))
        )
        setSelectedCategories(new Set())
        setSelectedItems(new Set())
      }
    })
  }

  function toggleCategorySelection(id: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleItemSelection(id: string) {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((i) => i.id === active.id)
    const newIndex = categories.findIndex((i) => i.id === over.id)
    const newArray = arrayMove(categories, oldIndex, newIndex)

    // Optimistic update
    setCategories(newArray.map((cat, idx) => ({ ...cat, display_order: idx })))

    // Batch update with error recovery
    const results = await Promise.all(
      newArray.map((cat, idx) =>
        supabase.from('categories').update({ display_order: idx }).eq('id', cat.id)
      )
    )
    const failed = results.some((r) => r.error)
    if (failed) {
      toast.error('Error al guardar orden. Recargando...')
      router.refresh()
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground mr-2">
            {categories.length} categorías · {categories.reduce((acc, c) => acc + c.menu_items.length, 0)} platos
          </p>
          <Button variant="outline" size="sm" onClick={toggleSelectAll} className="cursor-pointer text-xs h-8 hidden sm:flex">
            {selectedCategories.size === categories.length && selectedItems.size === categories.reduce((a,c) => a + c.menu_items.length, 0) && categories.length > 0 
              ? 'Deseleccionar todo' 
              : 'Seleccionar todo'}
          </Button>
          {(selectedCategories.size > 0 || selectedItems.size > 0) && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="cursor-pointer text-xs h-8">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Borrar ({selectedCategories.size + selectedItems.size})
            </Button>
          )}
        </div>
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
                          <Checkbox
                            checked={selectedCategories.has(category.id)}
                            onCheckedChange={() => toggleCategorySelection(category.id)}
                            className="mr-1"
                          />
                          {category.emoji && <span>{category.emoji}</span>}
                          {category.name}
                          <Badge variant="secondary" className="text-xs font-normal">
                            {category.menu_items.length} platos
                          </Badge>
                        </CardTitle>
              <div className="flex gap-2">
                <ItemFormDialog
                  mode="add"
                  categoryId={category.id}
                  allergens={allergens}
                  dietaryTags={dietaryTags}
                  restaurantId={restaurant.id}
                  onSave={(item) => setCategories(categories.map(c =>
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
                <p className="font-serif text-base text-foreground mb-1">Sin platos todavía</p>
                <p className="text-sm text-muted-foreground mb-3">Añade el primer plato a esta categoría</p>
                <ItemFormDialog
                  mode="add"
                  categoryId={category.id}
                  allergens={allergens}
                  dietaryTags={dietaryTags}
                  restaurantId={restaurant.id}
                  onSave={(item) => setCategories(categories.map(c =>
                    c.id === category.id ? { ...c, menu_items: [...c.menu_items, item] } : c
                  ))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {category.menu_items.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      />
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
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <ItemFormDialog
                        mode="edit"
                        item={item}
                        allergens={allergens}
                        dietaryTags={dietaryTags}
                        restaurantId={restaurant.id}
                        onSave={(updated) => setCategories(categories.map(c =>
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

/* Inline icon for empty state */
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

// ─── UNIFIED ITEM FORM DIALOG ───
// Handles both "add" and "edit" modes, eliminating ~400 lines of duplication.
function ItemFormDialog({
  mode,
  categoryId,
  item,
  allergens,
  dietaryTags,
  restaurantId,
  onSave,
}: {
  mode: 'add' | 'edit'
  categoryId?: string
  item?: MenuItemFull
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
  restaurantId: string
  onSave: (item: MenuItemFull) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const emptyForm = { name: '', description: '', price: '', ingredients: '' }
  const itemForm = item
    ? {
        name: item.name,
        description: item.description ?? '',
        price: item.price.toString(),
        ingredients: item.ingredients.map((i) => i.name).join(', '),
      }
    : emptyForm

  const [form, setForm] = useState(itemForm)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    item?.menu_item_allergens.map((ma) => ma.allergen_id) ?? []
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    item?.menu_item_tags.map((mt) => mt.tag_id) ?? []
  )

  function handleOpenChange(v: boolean) {
    if (v && item) {
      setForm({
        name: item.name,
        description: item.description ?? '',
        price: item.price.toString(),
        ingredients: item.ingredients.map((i) => i.name).join(', '),
      })
      setSelectedAllergens(item.menu_item_allergens.map((ma) => ma.allergen_id))
      setSelectedTags(item.menu_item_tags.map((mt) => mt.tag_id))
      setImageUrl(item.image_url ?? null)
    }
    if (v && !item) {
      setForm(emptyForm)
      setSelectedAllergens([])
      setSelectedTags([])
      setImageUrl(null)
    }
    setOpen(v)
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurantId)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImageUrl(data.url)
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  function toggleAllergen(id: string) {
    setSelectedAllergens((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function buildFullItem(baseItem: { id: string; available: boolean }): MenuItemFull {
    const ingredientNames = form.ingredients
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean)

    return {
      ...baseItem,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      image_url: imageUrl ?? undefined,
      ingredients: ingredientNames.map((name, i) => ({ id: `temp-${i}`, name })),
      menu_item_allergens: selectedAllergens
        .map((aid) => {
          const found = allergens.find((a) => a.id === aid)
          return found ? { allergen_id: aid, allergens: found } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      menu_item_tags: selectedTags
        .map((tid) => {
          const found = dietaryTags.find((t) => t.id === tid)
          return found ? { tag_id: tid, dietary_tags: found } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.price || !categoryId) return
    setLoading(true)

    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert({
        category_id: categoryId,
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        available: true,
        image_url: imageUrl || null,
      })
      .select()
      .single()

    if (error || !newItem) {
      toast.error('Error al añadir plato')
      setLoading(false)
      return
    }

    const ingredientNames = form.ingredients.split(',').map((i) => i.trim()).filter(Boolean)

    // Insert relations in parallel
    await Promise.all([
      ingredientNames.length > 0
        ? supabase.from('ingredients').insert(ingredientNames.map((name) => ({ menu_item_id: newItem.id, name })))
        : Promise.resolve(),
      selectedAllergens.length > 0
        ? supabase.from('menu_item_allergens').insert(selectedAllergens.map((allergen_id) => ({ menu_item_id: newItem.id, allergen_id })))
        : Promise.resolve(),
      selectedTags.length > 0
        ? supabase.from('menu_item_tags').insert(selectedTags.map((tag_id) => ({ menu_item_id: newItem.id, tag_id })))
        : Promise.resolve(),
    ])

    onSave(buildFullItem(newItem))
    toast.success('Plato añadido ✓')
    setForm(emptyForm)
    setSelectedAllergens([])
    setSelectedTags([])
    setImageUrl(null)
    setOpen(false)
    setLoading(false)
  }

  async function handleEdit() {
    if (!form.name.trim() || !form.price || !item) return
    setLoading(true)

    // Update the item itself
    const { error } = await supabase
      .from('menu_items')
      .update({
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        image_url: imageUrl || null,
      })
      .eq('id', item.id)

    if (error) {
      toast.error('Error al guardar cambios')
      setLoading(false)
      return
    }

    // Replace relations: delete all then re-insert.
    // Wrapped in error handling — if insert fails after delete, warn user.
    const ingredientNames = form.ingredients.split(',').map((i) => i.trim()).filter(Boolean)

    const [delIng, delAll, delTag] = await Promise.all([
      supabase.from('ingredients').delete().eq('menu_item_id', item.id),
      supabase.from('menu_item_allergens').delete().eq('menu_item_id', item.id),
      supabase.from('menu_item_tags').delete().eq('menu_item_id', item.id),
    ])

    const deleteErrors = [delIng.error, delAll.error, delTag.error].filter(Boolean)
    if (deleteErrors.length > 0) {
      toast.error('Error al actualizar relaciones del plato')
      setLoading(false)
      return
    }

    const insertResults = await Promise.all([
      ingredientNames.length > 0
        ? supabase.from('ingredients').insert(ingredientNames.map((name) => ({ menu_item_id: item.id, name })))
        : Promise.resolve({ error: null }),
      selectedAllergens.length > 0
        ? supabase.from('menu_item_allergens').insert(selectedAllergens.map((allergen_id) => ({ menu_item_id: item.id, allergen_id })))
        : Promise.resolve({ error: null }),
      selectedTags.length > 0
        ? supabase.from('menu_item_tags').insert(selectedTags.map((tag_id) => ({ menu_item_id: item.id, tag_id })))
        : Promise.resolve({ error: null }),
    ])

    const insertErrors = insertResults.filter((r) => r.error)
    if (insertErrors.length > 0) {
      toast.error('Error al guardar relaciones. Algunos datos pueden haberse perdido. Recarga la página.')
    }

    onSave(buildFullItem(item))
    toast.success('Plato actualizado ✓')
    setOpen(false)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'add') await handleAdd()
    else await handleEdit()
  }

  const addTrigger =
    mode === 'add' ? (
      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => handleOpenChange(true)}>
        <Plus className="w-3.5 h-3.5 mr-1" />
        Plato
      </Button>
    ) : null

  const editTrigger =
    mode === 'edit' ? (
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
    ) : null

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">
          {mode === 'add' ? 'Añadir plato' : 'Editar plato'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Imagen</Label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Plato" className="w-20 h-20 rounded-lg object-cover border border-border" />
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(f)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nombre *</Label>
          <Input
            placeholder="Ej: Ensalada César"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Breve descripción del plato..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Ingredientes (separados por comas)</Label>
          <Input
            placeholder="Lechuga, pollo, parmesano, crutones, salsa César"
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Alergenos</Label>
          <div className="grid grid-cols-2 gap-2">
            {allergens.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${mode}-allergen-${item?.id ?? 'new'}-${a.id}`}
                  checked={selectedAllergens.includes(a.id)}
                  onCheckedChange={() => toggleAllergen(a.id)}
                />
                <label htmlFor={`${mode}-allergen-${item?.id ?? 'new'}-${a.id}`} className="text-sm cursor-pointer">
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
            {dietaryTags.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${mode}-tag-${item?.id ?? 'new'}-${t.id}`}
                  checked={selectedTags.includes(t.id)}
                  onCheckedChange={() => toggleTag(t.id)}
                />
                <label htmlFor={`${mode}-tag-${item?.id ?? 'new'}-${t.id}`} className="text-sm cursor-pointer">
                  {t.icon} {t.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
            {loading ? 'Guardando...' : mode === 'add' ? 'Añadir plato' : 'Guardar cambios'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
            Cancelar
          </Button>
        </div>
      </form>
    </DialogContent>
  )

  if (mode === 'edit') {
    return (
      <>
        {editTrigger}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          {dialogContent}
        </Dialog>
      </>
    )
  }

  return (
    <>
      {addTrigger}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    </>
  )
}

function SortableCategory({ categoryId, children }: { categoryId: string; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
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
