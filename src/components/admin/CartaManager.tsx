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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { Restaurant, Allergen, DietaryTag } from '@/lib/types'

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
    }
    setLoadingCategory(false)
  }

  async function deleteCategory(categoryId: string) {
    if (!confirm('¿Eliminar esta categoría y todos sus platos?')) return
    await supabase.from('categories').delete().eq('id', categoryId)
    setCategories(categories.filter(c => c.id !== categoryId))
  }

  async function toggleItemAvailable(itemId: string, available: boolean, categoryId: string) {
    await supabase.from('menu_items').update({ available }).eq('id', itemId)
    setCategories(categories.map(c =>
      c.id === categoryId
        ? { ...c, menu_items: c.menu_items.map(i => i.id === itemId ? { ...i, available } : i) }
        : c
    ))
  }

  async function deleteItem(itemId: string, categoryId: string) {
    if (!confirm('¿Eliminar este plato?')) return
    await supabase.from('menu_items').delete().eq('id', itemId)
    setCategories(categories.map(c =>
      c.id === categoryId ? { ...c, menu_items: c.menu_items.filter(i => i.id !== itemId) } : c
    ))
  }

  return (
    <div className="space-y-6">
      {/* Botón añadir categoría */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{categories.length} categorías · {categories.reduce((acc, c) => acc + c.menu_items.length, 0)} platos</p>
        <Button onClick={() => setAddingCategory(!addingCategory)}>
          + Añadir categoría
        </Button>
      </div>

      {/* Form nueva categoría */}
      {addingCategory && (
        <Card className="border-dashed border-2 border-orange-300">
          <CardContent className="pt-4 space-y-3">
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
              <Button onClick={addCategory} disabled={loadingCategory || !newCategory.name.trim()}>
                {loadingCategory ? 'Guardando...' : 'Guardar categoría'}
              </Button>
              <Button variant="outline" onClick={() => setAddingCategory(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de categorías */}
      {categories.length === 0 && !addingCategory && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>No hay categorías aún. ¡Añade la primera!</p>
        </div>
      )}

      {categories.map(category => (
        <Card key={category.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                {category.emoji && <span>{category.emoji}</span>}
                {category.name}
                <Badge variant="secondary">{category.menu_items.length} platos</Badge>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteCategory(category.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
            {category.description && (
              <p className="text-sm text-gray-500">{category.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {category.menu_items.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin platos en esta categoría</p>
            ) : (
              <div className="space-y-3">
                {category.menu_items.map(item => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-orange-600 font-semibold">{item.price.toFixed(2)}€</span>
                        {!item.available && <Badge variant="destructive">No disponible</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.menu_item_allergens.map(ma => (
                          <Badge key={ma.allergen_id} variant="outline" className="text-xs">
                            {ma.allergens.icon} {ma.allergens.name}
                          </Badge>
                        ))}
                        {item.menu_item_tags.map(mt => (
                          <Badge key={mt.tag_id} className="text-xs bg-green-100 text-green-800 border-green-200">
                            {mt.dietary_tags.icon} {mt.dietary_tags.name}
                          </Badge>
                        ))}
                      </div>
                      {item.ingredients.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.ingredients.map(i => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Switch
                        checked={item.available}
                        onCheckedChange={v => toggleItemAvailable(item.id, v, category.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 h-7 px-2"
                        onClick={() => deleteItem(item.id, category.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
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

    if (error || !item) { setLoading(false); return }

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
    setForm({ name: '', description: '', price: '', ingredients: '' })
    setSelectedAllergens([])
    setSelectedTags([])
    setOpen(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button className="inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3">
          + Plato
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir plato</DialogTitle>
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : 'Añadir plato'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
