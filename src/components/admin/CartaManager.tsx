'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Leaf,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import type { Allergen, DietaryTag, Restaurant } from '@/lib/types'
import { getVenueConfig, normalizeVenueType } from '@/lib/venue-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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

export default function CartaManager({
  restaurant,
  initialCategories,
  allergens,
  dietaryTags,
}: Props) {
  const router = useRouter()
  const venueConfig = getVenueConfig(restaurant.venue_type)
  const itemSingular = venueConfig.itemSingular
  const itemPlural = venueConfig.itemPlural
  const itemSingularTitle = capitalize(itemSingular)
  const categoryExamples = getCategoryExamples(restaurant.venue_type)

  const [categories, setCategories] = useState<CategoryWithItems[]>(initialCategories)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryData, setEditingCategoryData] = useState({ name: '', emoji: '', description: '' })
  const [bulkPriceDialog, setBulkPriceDialog] = useState({ open: false, price: '' })
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '', description: '' })
  const [addingCategory, setAddingCategory] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set())

  function toggleDesc(id: string) {
    setExpandedDescs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalItems = categories.reduce((acc, category) => acc + category.menu_items.length, 0)

  const filteredCategories = searchTerm.trim()
    ? categories
        .map((cat) => ({
          ...cat,
          menu_items: cat.menu_items.filter((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.menu_items.length > 0)
    : categories

  async function saveEditCategory(categoryId: string) {
    const { name, emoji, description } = editingCategoryData
    if (!name.trim()) return
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim(), emoji: emoji || null, description: description || null })
      .eq('id', categoryId)
    if (error) {
      toast.error('Error al guardar categoría')
      return
    }
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, name: name.trim(), emoji, description } : cat,
      ),
    )
    setEditingCategoryId(null)
    toast.success('Categoría actualizada')
    invalidateCache()
  }

  async function handleBulkPrice() {
    const price = parseFloat(bulkPriceDialog.price)
    if (isNaN(price) || price < 0) return
    const ids = Array.from(selectedItems)
    const { error } = await supabase.from('menu_items').update({ price }).in('id', ids)
    if (error) {
      toast.error('Error al actualizar precios')
      return
    }
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        menu_items: cat.menu_items.map((item) =>
          selectedItems.has(item.id) ? { ...item, price } : item,
        ),
      })),
    )
    setBulkPriceDialog({ open: false, price: '' })
    setSelectedItems(new Set())
    toast.success(`Precio actualizado en ${ids.length} ${ids.length === 1 ? itemSingular : itemPlural}`)
    invalidateCache()
  }

  async function handleBulkAvailability(available: boolean) {
    const ids = Array.from(selectedItems)
    const { error } = await supabase.from('menu_items').update({ available }).in('id', ids)
    if (error) {
      toast.error('Error al cambiar disponibilidad')
      return
    }
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        menu_items: cat.menu_items.map((item) =>
          selectedItems.has(item.id) ? { ...item, available } : item,
        ),
      })),
    )
    setSelectedItems(new Set())
    toast.success(
      available
        ? `${ids.length} ${ids.length === 1 ? itemSingular : itemPlural} marcados como disponibles`
        : `${ids.length} ${ids.length === 1 ? itemSingular : itemPlural} marcados como no disponibles`,
    )
    invalidateCache()
  }

  function invalidateCache() {
    fetch('/api/admin/menu/invalidate-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: restaurant.slug }),
    }).catch(() => {})
  }

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function toggleSelectAll() {
    const allCategoryIds = categories.map((category) => category.id)
    const allItemIds = categories.flatMap((category) => category.menu_items.map((item) => item.id))

    if (
      selectedCategories.size === allCategoryIds.length &&
      selectedItems.size === allItemIds.length &&
      allCategoryIds.length + allItemIds.length > 0
    ) {
      setSelectedCategories(new Set())
      setSelectedItems(new Set())
      return
    }

    setSelectedCategories(new Set(allCategoryIds))
    setSelectedItems(new Set(allItemIds))
  }

  function toggleCategorySelection(id: string) {
    setSelectedCategories((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleItemSelection(id: string) {
    setSelectedItems((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkDelete() {
    const count = selectedCategories.size + selectedItems.size
    if (count === 0) return

    setConfirmDialog({
      open: true,
      title: '¿Borrar selección?',
      description: `Se eliminarán ${selectedCategories.size} categorías y ${selectedItems.size} ${itemPlural}. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        let errorOccurred = false

        if (selectedCategories.size > 0) {
          const { error } = await supabase
            .from('categories')
            .delete()
            .in('id', Array.from(selectedCategories))

          if (error) errorOccurred = true
        }

        if (selectedItems.size > 0) {
          const itemsToDelete = Array.from(selectedItems).filter((itemId) => {
            const category = categories.find((currentCategory) =>
              currentCategory.menu_items.some((item) => item.id === itemId),
            )

            return !!category && !selectedCategories.has(category.id)
          })

          if (itemsToDelete.length > 0) {
            const { error } = await supabase
              .from('menu_items')
              .delete()
              .in('id', itemsToDelete)

            if (error) errorOccurred = true
          }
        }

        if (errorOccurred) {
          toast.error('Ocurrió un error al borrar algunos elementos')
        } else {
          toast.success('Elementos seleccionados eliminados')
          invalidateCache()
        }

        setCategories((previous) =>
          previous
            .filter((category) => !selectedCategories.has(category.id))
            .map((category) => ({
              ...category,
              menu_items: category.menu_items.filter((item) => !selectedItems.has(item.id)),
            })),
        )
        setSelectedCategories(new Set())
        setSelectedItems(new Set())
      },
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((category) => category.id === active.id)
    const newIndex = categories.findIndex((category) => category.id === over.id)
    const newArray = arrayMove(categories, oldIndex, newIndex)

    setCategories(newArray.map((category, index) => ({ ...category, display_order: index })))

    const results = await Promise.all(
      newArray.map((category, index) =>
        supabase.from('categories').update({ display_order: index }).eq('id', category.id),
      ),
    )

    if (results.some((result) => result.error)) {
      toast.error('Error al guardar el orden. Recargando...')
      router.refresh()
    } else {
      invalidateCache()
    }
  }

  async function handleItemDragEnd(event: DragEndEvent, categoryId: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    const oldIndex = category.menu_items.findIndex((i) => i.id === active.id)
    const newIndex = category.menu_items.findIndex((i) => i.id === over.id)
    const newItems = arrayMove(category.menu_items, oldIndex, newIndex)

    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, menu_items: newItems.map((item, idx) => ({ ...item, display_order: idx })) }
          : c,
      ),
    )

    const results = await Promise.all(
      newItems.map((item, idx) =>
        supabase.from('menu_items').update({ display_order: idx }).eq('id', item.id),
      ),
    )

    if (results.some((r) => r.error)) {
      toast.error('Error al guardar el orden. Recargando...')
      router.refresh()
    } else {
      invalidateCache()
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
      toast.success('Categoría añadida')
      invalidateCache()
    } else {
      toast.error('Error al añadir categoría')
    }

    setLoadingCategory(false)
  }

  function deleteCategory(categoryId: string) {
    setConfirmDialog({
      open: true,
      title: '¿Eliminar esta categoría?',
      description: `Se eliminarán también todos los ${itemPlural} de esta categoría. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId)

        if (error) {
          toast.error('Error al eliminar categoría')
          return
        }

        setCategories((previous) => previous.filter((category) => category.id !== categoryId))
        toast.success('Categoría eliminada')
        invalidateCache()
      },
    })
  }

  async function toggleItemAvailable(itemId: string, available: boolean, categoryId: string) {
    const { error } = await supabase.from('menu_items').update({ available }).eq('id', itemId)
    if (error) {
      toast.error('Error al cambiar disponibilidad')
      return
    }

    setCategories((previous) =>
      previous.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              menu_items: category.menu_items.map((item) =>
                item.id === itemId ? { ...item, available } : item,
              ),
            }
          : category,
      ),
    )

    toast.success(available ? `${itemSingularTitle} disponible` : `${itemSingularTitle} no disponible`)
    invalidateCache()
  }

  async function updateItemImage(itemId: string, categoryId: string, newUrl: string | null) {
    const { error } = await supabase
      .from('menu_items')
      .update({ image_url: newUrl })
      .eq('id', itemId)

    if (error) {
      toast.error('Error al actualizar imagen')
      return
    }

    setCategories((previous) =>
      previous.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              menu_items: category.menu_items.map((item) =>
                item.id === itemId ? { ...item, image_url: newUrl ?? undefined } : item,
              ),
            }
          : category,
      ),
    )

    toast.success(newUrl ? 'Imagen actualizada' : 'Imagen eliminada')
    invalidateCache()
  }

  function deleteItem(itemId: string, categoryId: string) {
    setConfirmDialog({
      open: true,
      title: `Eliminar este ${itemSingular}?`,
      description: `El ${itemSingular} se eliminará permanentemente. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId)

        if (error) {
          toast.error(`Error al eliminar ${itemSingular}`)
          return
        }

        setCategories((previous) =>
          previous.map((category) =>
            category.id === categoryId
              ? {
                  ...category,
                  menu_items: category.menu_items.filter((item) => item.id !== itemId),
                }
              : category,
          ),
        )
        toast.success(`${itemSingularTitle} eliminado`)
        invalidateCache()
      },
    })
  }

  return (
    <>
      {(selectedCategories.size > 0 || selectedItems.size > 0) && (
        <div className="sticky top-14 z-40 -mx-5 px-5 py-2 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground mr-1">
              {selectedCategories.size + selectedItems.size} seleccionados
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8 shrink-0 cursor-pointer text-xs"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Borrar ({selectedCategories.size + selectedItems.size})
            </Button>
            {selectedItems.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkPriceDialog({ open: true, price: '' })}
                  className="h-8 shrink-0 cursor-pointer text-xs"
                >
                  Cambiar precio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAvailability(true)}
                  className="h-8 shrink-0 cursor-pointer text-xs"
                >
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Activar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAvailability(false)}
                  className="h-8 shrink-0 cursor-pointer text-xs"
                >
                  <EyeOff className="mr-1 h-3.5 w-3.5" />
                  Desactivar
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedCategories(new Set()); setSelectedItems(new Set()) }}
              className="h-8 shrink-0 cursor-pointer text-xs ml-auto text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <p className="mr-2 shrink-0 text-sm text-muted-foreground">
              {categories.length} categorías · {categories.reduce((acc, category) => acc + category.menu_items.length, 0)} {itemPlural}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="hidden h-8 shrink-0 cursor-pointer text-xs sm:flex"
            >
              {selectedCategories.size === categories.length && selectedItems.size === totalItems && categories.length > 0
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </Button>
          </div>

          <Button onClick={() => setAddingCategory((current) => !current)} className="cursor-pointer">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir categoría
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ítem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {addingCategory && (
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="space-y-3 pt-5">
            <div className="flex gap-2">
              <Input
                placeholder="Emoji"
                value={newCategory.emoji}
                onChange={(event) => setNewCategory({ ...newCategory, emoji: event.target.value })}
                className="w-24"
              />
              <Input
                placeholder="Nombre de la categoría *"
                value={newCategory.name}
                onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="Descripción (opcional)"
              value={newCategory.description}
              onChange={(event) => setNewCategory({ ...newCategory, description: event.target.value })}
            />
            <div className="flex gap-2">
              <Button
                onClick={addCategory}
                disabled={loadingCategory || !newCategory.name.trim()}
                className="cursor-pointer"
              >
                {loadingCategory ? 'Guardando...' : 'Guardar categoría'}
              </Button>
              <Button variant="outline" onClick={() => setAddingCategory(false)} className="cursor-pointer">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length === 0 && !addingCategory && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpenIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="mb-2 font-serif text-xl text-foreground">Tu carta está vacía</p>
          <p className="mx-auto mb-6 max-w-xs text-sm text-muted-foreground">
            Empieza creando tu primera categoría. Por ejemplo: {categoryExamples.join(', ')}.
          </p>
          <Button onClick={() => setAddingCategory(true)} className="cursor-pointer">
            <Plus className="mr-1.5 h-4 w-4" />
            Añadir primera categoría
          </Button>
        </div>
      )}

      <Dialog open={bulkPriceDialog.open} onOpenChange={(open) => !open && setBulkPriceDialog({ open: false, price: '' })}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Cambiar precio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nuevo precio para {selectedItems.size} {selectedItems.size === 1 ? itemSingular : itemPlural} seleccionados
          </p>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={bulkPriceDialog.price}
            onChange={(e) => setBulkPriceDialog((prev) => ({ ...prev, price: e.target.value }))}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => setBulkPriceDialog({ open: false, price: '' })}>
              Cancelar
            </Button>
            <Button
              className="cursor-pointer"
              disabled={!bulkPriceDialog.price || isNaN(parseFloat(bulkPriceDialog.price))}
              onClick={handleBulkPrice}
            >
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog((previous) => ({ ...previous, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                confirmDialog.onConfirm()
                setConfirmDialog((previous) => ({ ...previous, open: false }))
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={filteredCategories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <SortableCategory key={category.id} categoryId={category.id}>
                {(dragHandleProps) => (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="flex min-w-0 flex-1 items-start gap-1.5 font-serif text-lg leading-snug sm:text-xl">
                          <div
                            {...dragHandleProps}
                            suppressHydrationWarning
                            className="mt-0.5 shrink-0 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <Checkbox
                            checked={selectedCategories.has(category.id)}
                            onCheckedChange={() => toggleCategorySelection(category.id)}
                            className="mt-1 shrink-0"
                          />
                          {category.emoji && <span className="shrink-0">{category.emoji}</span>}
                          <span>{category.name}</span>
                        </CardTitle>

                        <div className="flex shrink-0 items-center gap-1 pt-0.5">
                          <Badge variant="secondary" className="text-xs font-normal tabular-nums">
                            {category.menu_items.length}
                            <span className="hidden sm:inline"> {itemPlural}</span>
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 cursor-pointer p-0"
                                  onClick={() => {
                                    setEditingCategoryId(category.id)
                                    setEditingCategoryData({
                                      name: category.name,
                                      emoji: category.emoji ?? '',
                                      description: category.description ?? '',
                                    })
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <TooltipContent>Editar categoría</TooltipContent>
                          </Tooltip>
                          <ItemFormDialog
                            mode="add"
                            categoryId={category.id}
                            restaurantId={restaurant.id}
                            venueType={restaurant.venue_type}
                            allergens={allergens}
                            dietaryTags={dietaryTags}
                            onSave={(item) => {
                              setCategories((previous) =>
                                previous.map((currentCategory) =>
                                  currentCategory.id === category.id
                                    ? { ...currentCategory, menu_items: [...currentCategory.menu_items, item] }
                                    : currentCategory,
                                ),
                              )
                              invalidateCache()
                            }}
                          />
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 cursor-pointer p-0 text-destructive hover:text-destructive"
                                  onClick={() => deleteCategory(category.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <TooltipContent>Eliminar categoría</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {editingCategoryId === category.id ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Emoji"
                              value={editingCategoryData.emoji}
                              onChange={(e) => setEditingCategoryData((p) => ({ ...p, emoji: e.target.value }))}
                              className="w-24"
                            />
                            <Input
                              placeholder="Nombre *"
                              value={editingCategoryData.name}
                              onChange={(e) => setEditingCategoryData((p) => ({ ...p, name: e.target.value }))}
                              className="flex-1"
                            />
                          </div>
                          <Input
                            placeholder="Descripción (opcional)"
                            value={editingCategoryData.description}
                            onChange={(e) => setEditingCategoryData((p) => ({ ...p, description: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="cursor-pointer"
                              disabled={!editingCategoryData.name.trim()}
                              onClick={() => saveEditCategory(category.id)}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => setEditingCategoryId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )
                      )}
                    </CardHeader>

                    <CardContent>
                      {category.menu_items.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="mb-1 font-serif text-base text-foreground">Sin {itemPlural} todavía</p>
                          <p className="mb-3 text-sm text-muted-foreground">
                            Añade el primer {itemSingular} a esta categoría
                          </p>
                          <ItemFormDialog
                            mode="add"
                            categoryId={category.id}
                            restaurantId={restaurant.id}
                            venueType={restaurant.venue_type}
                            allergens={allergens}
                            dietaryTags={dietaryTags}
                            onSave={(item) => {
                              setCategories((previous) =>
                                previous.map((currentCategory) =>
                                  currentCategory.id === category.id
                                    ? { ...currentCategory, menu_items: [...currentCategory.menu_items, item] }
                                    : currentCategory,
                                ),
                              )
                              invalidateCache()
                            }}
                          />
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleItemDragEnd(event, category.id)}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext items={category.menu_items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {category.menu_items.map((item) => (
                                <SortableItem key={item.id} itemId={item.id}>
                                  {(dragHandleProps) => (
                                    <div className="rounded-lg bg-muted/50 p-3">
                                      {/* Fila superior: drag + checkbox + imagen + nombre/precio + acciones */}
                                      <div className="flex items-center gap-2">
                                        <div
                                          {...dragHandleProps}
                                          suppressHydrationWarning
                                          className="shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        <Checkbox
                                          checked={selectedItems.has(item.id)}
                                          onCheckedChange={() => toggleItemSelection(item.id)}
                                          className="shrink-0"
                                        />
                                        <ItemImageThumb
                                          imageUrl={item.image_url}
                                          itemName={item.name}
                                          restaurantId={restaurant.id}
                                          onChange={(newUrl) => updateItemImage(item.id, category.id, newUrl)}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="font-semibold tabular-nums text-primary">
                                              {item.price.toFixed(2)} EUR
                                            </span>
                                            {!item.available && (
                                              <Badge variant="destructive" className="text-xs">
                                                No disponible
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                          <ItemFormDialog
                                            mode="edit"
                                            item={item}
                                            restaurantId={restaurant.id}
                                            venueType={restaurant.venue_type}
                                            allergens={allergens}
                                            dietaryTags={dietaryTags}
                                            onSave={(updatedItem) => {
                                              setCategories((previous) =>
                                                previous.map((currentCategory) =>
                                                  currentCategory.id === category.id
                                                    ? {
                                                        ...currentCategory,
                                                        menu_items: currentCategory.menu_items.map((currentItem) =>
                                                          currentItem.id === updatedItem.id ? updatedItem : currentItem,
                                                        ),
                                                      }
                                                    : currentCategory,
                                                ),
                                              )
                                              invalidateCache()
                                            }}
                                          />
                                          <Tooltip>
                                            <TooltipTrigger
                                              render={
                                                <Switch
                                                  checked={item.available}
                                                  onCheckedChange={(value) =>
                                                    toggleItemAvailable(item.id, value, category.id)
                                                  }
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
                                                  className="h-8 w-8 min-h-[32px] min-w-[32px] cursor-pointer touch-manipulation p-0 text-destructive hover:text-destructive"
                                                  onClick={() => deleteItem(item.id, category.id)}
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              }
                                            />
                                            <TooltipContent>{`Eliminar ${itemSingular}`}</TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>

                                      {/* Contenido a ancho completo debajo */}
                                      {(item.description || item.menu_item_allergens.length > 0 || item.menu_item_tags.length > 0 || item.ingredients.length > 0) && (
                                        <div className="mt-2 space-y-1.5">
                                          {item.description && (
                                            <div>
                                              <p className={cn('text-sm text-muted-foreground', !expandedDescs.has(item.id) && 'line-clamp-2')}>
                                                {item.description}
                                              </p>
                                              {item.description.length > 80 && (
                                                <button
                                                  type="button"
                                                  onClick={() => toggleDesc(item.id)}
                                                  className="mt-0.5 text-xs text-muted-foreground underline underline-offset-2"
                                                >
                                                  {expandedDescs.has(item.id) ? 'ver menos' : 'ver más'}
                                                </button>
                                              )}
                                            </div>
                                          )}

                                          {(item.menu_item_allergens.length > 0 || item.menu_item_tags.length > 0) && (
                                            <div className="flex flex-wrap gap-1">
                                              {item.menu_item_allergens.map((menuAllergen) => (
                                                <Badge key={menuAllergen.allergen_id} variant="outline" className="text-xs">
                                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                                  {menuAllergen.allergens.name}
                                                </Badge>
                                              ))}
                                              {item.menu_item_tags.map((menuTag) => (
                                                <Badge
                                                  key={menuTag.tag_id}
                                                  className="border-0 bg-secondary text-xs text-secondary-foreground"
                                                >
                                                  <Leaf className="mr-1 h-3 w-3" />
                                                  {menuTag.dietary_tags.name}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}

                                          {item.ingredients.length > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                              {item.ingredients.map((ingredient) => ingredient.name).join(', ')}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </SortableItem>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
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
    </>
  )
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getCategoryExamples(venueType?: Restaurant['venue_type']) {
  const normalized = normalizeVenueType(venueType)

  if (normalized === 'bar_cafe') return ['Cafes', 'Desayunos', 'Tapas']
  if (normalized === 'cocktail_bar') return ['Clasicos', 'De autor', 'Sin alcohol']

  return ['Entrantes', 'Principales', 'Postres']
}

function getDefaultItemName(venueType?: Restaurant['venue_type']) {
  const normalized = normalizeVenueType(venueType)

  if (normalized === 'bar_cafe') return 'Cafe con leche'
  if (normalized === 'cocktail_bar') return 'Negroni'

  return 'Ensalada Cesar'
}

function getIngredientPlaceholder(venueType?: Restaurant['venue_type']) {
  const normalized = normalizeVenueType(venueType)

  if (normalized === 'bar_cafe') return 'Cafe, leche, hielo, canela...'
  if (normalized === 'cocktail_bar') return 'Ginebra, vermut, bitter, naranja...'

  return 'Lechuga, pollo, parmesano, salsa...'
}

function ItemFormDialog({
  mode,
  categoryId,
  item,
  allergens,
  dietaryTags,
  restaurantId,
  venueType,
  onSave,
}: {
  mode: 'add' | 'edit'
  categoryId?: string
  item?: MenuItemFull
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
  restaurantId: string
  venueType?: Restaurant['venue_type']
  onSave: (item: MenuItemFull) => void
}) {
  const venueConfig = getVenueConfig(venueType)
  const itemSingular = venueConfig.itemSingular
  const itemSingularTitle = capitalize(itemSingular)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [aiLoading, setAiLoading] = useState({ photo: false, description: false, allergens: false })
  const [aiPreviewPhoto, setAiPreviewPhoto] = useState<string | null>(null)
  const [aiPreviewDescription, setAiPreviewDescription] = useState<string | null>(null)
  const [aiPreviewAllergenIds, setAiPreviewAllergenIds] = useState<string[]>([])
  const [aiPreviewAllergenNames, setAiPreviewAllergenNames] = useState<string[]>([])

  const emptyForm = { name: '', description: '', price: '', ingredients: '' }
  const itemForm = item
    ? {
        name: item.name,
        description: item.description ?? '',
        price: item.price.toString(),
        ingredients: item.ingredients.map((ingredient) => ingredient.name).join(', '),
      }
    : emptyForm

  const [form, setForm] = useState(itemForm)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    item?.menu_item_allergens.map((menuAllergen) => menuAllergen.allergen_id) ?? [],
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    item?.menu_item_tags.map((menuTag) => menuTag.tag_id) ?? [],
  )

  function handleOpenChange(value: boolean) {
    setAiLoading({ photo: false, description: false, allergens: false })
    setAiPreviewPhoto(null)
    setAiPreviewDescription(null)
    setAiPreviewAllergenIds([])
    setAiPreviewAllergenNames([])

    if (value && item) {
      setForm({
        name: item.name,
        description: item.description ?? '',
        price: item.price.toString(),
        ingredients: item.ingredients.map((ingredient) => ingredient.name).join(', '),
      })
      setSelectedAllergens(item.menu_item_allergens.map((menuAllergen) => menuAllergen.allergen_id))
      setSelectedTags(item.menu_item_tags.map((menuTag) => menuTag.tag_id))
      setImageUrl(item.image_url ?? null)
    }

    if (value && !item) {
      setForm(emptyForm)
      setSelectedAllergens([])
      setSelectedTags([])
      setImageUrl(null)
    }

    setOpen(value)
  }

  async function callEnrich() {
    const response = await fetch('/api/products/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), restaurantId }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }

  async function handleAIPhoto() {
    setAiLoading((p) => ({ ...p, photo: true }))
    try {
      const data = await callEnrich()
      if (data.imageUrl) {
        setAiPreviewPhoto(data.imageUrl)
      } else {
        toast.info('No se encontró foto para este producto')
      }
    } catch {
      toast.error('Error buscando foto')
    } finally {
      setAiLoading((p) => ({ ...p, photo: false }))
    }
  }

  async function handleAIDescription() {
    setAiLoading((p) => ({ ...p, description: true }))
    try {
      const data = await callEnrich()
      if (data.description) {
        setAiPreviewDescription(data.description)
      } else {
        toast.info('No se pudo generar descripción')
      }
    } catch {
      toast.error('Error generando descripción')
    } finally {
      setAiLoading((p) => ({ ...p, description: false }))
    }
  }

  async function handleAIAllergens() {
    setAiLoading((p) => ({ ...p, allergens: true }))
    try {
      const data = await callEnrich()
      if (data.allergenNames?.length > 0) {
        const idsToAdd = (data.allergenNames as string[])
          .map((n) => allergens.find((a) => a.name === n)?.id)
          .filter((id): id is string => Boolean(id) && !selectedAllergens.includes(id!))
        if (idsToAdd.length > 0) {
          const namesToShow = (data.allergenNames as string[]).filter((n) => {
            const id = allergens.find((a) => a.name === n)?.id
            return id && !selectedAllergens.includes(id)
          })
          setAiPreviewAllergenIds(idsToAdd)
          setAiPreviewAllergenNames(namesToShow)
        } else {
          toast.info('No se detectaron alérgenos nuevos')
        }
      } else {
        toast.info('No se detectaron alérgenos')
      }
    } catch {
      toast.error('Error detectando alérgenos')
    } finally {
      setAiLoading((p) => ({ ...p, allergens: false }))
    }
  }

  function acceptPhoto() {
    if (aiPreviewPhoto) setImageUrl(aiPreviewPhoto)
    setAiPreviewPhoto(null)
  }

  function acceptDescription() {
    if (aiPreviewDescription) setForm((p) => ({ ...p, description: aiPreviewDescription }))
    setAiPreviewDescription(null)
  }

  function acceptAllergens() {
    if (aiPreviewAllergenIds.length > 0) {
      setSelectedAllergens((p) => [...p, ...aiPreviewAllergenIds.filter((id) => !p.includes(id))])
    }
    setAiPreviewAllergenIds([])
    setAiPreviewAllergenNames([])
  }

  function acceptAll() {
    if (aiPreviewPhoto) setImageUrl(aiPreviewPhoto)
    if (aiPreviewDescription) setForm((p) => ({ ...p, description: aiPreviewDescription }))
    if (aiPreviewAllergenIds.length > 0) {
      setSelectedAllergens((p) => [...p, ...aiPreviewAllergenIds.filter((id) => !p.includes(id))])
    }
    setAiPreviewPhoto(null)
    setAiPreviewDescription(null)
    setAiPreviewAllergenIds([])
    setAiPreviewAllergenNames([])
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurantId)

      const response = await fetch('/api/upload', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setImageUrl(data.url)
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  function toggleAllergen(id: string) {
    setSelectedAllergens((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    )
  }

  function toggleTag(id: string) {
    setSelectedTags((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    )
  }

  function buildFullItem(baseItem: { id: string; available: boolean }): MenuItemFull {
    const ingredientNames = form.ingredients
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)

    return {
      ...baseItem,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      image_url: imageUrl ?? undefined,
      ingredients: ingredientNames.map((name, index) => ({ id: `temp-${index}`, name })),
      menu_item_allergens: selectedAllergens
        .map((allergenId) => {
          const found = allergens.find((allergen) => allergen.id === allergenId)
          return found ? { allergen_id: allergenId, allergens: found } : null
        })
        .filter((value): value is NonNullable<typeof value> => value !== null),
      menu_item_tags: selectedTags
        .map((tagId) => {
          const found = dietaryTags.find((tag) => tag.id === tagId)
          return found ? { tag_id: tagId, dietary_tags: found } : null
        })
        .filter((value): value is NonNullable<typeof value> => value !== null),
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
      toast.error(`Error al añadir ${itemSingular}`)
      setLoading(false)
      return
    }

    const ingredientNames = form.ingredients
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)

    await Promise.all([
      ingredientNames.length > 0
        ? supabase
            .from('ingredients')
            .insert(ingredientNames.map((name) => ({ menu_item_id: newItem.id, name })))
        : Promise.resolve(),
      selectedAllergens.length > 0
        ? supabase.from('menu_item_allergens').insert(
            selectedAllergens.map((allergen_id) => ({ menu_item_id: newItem.id, allergen_id })),
          )
        : Promise.resolve(),
      selectedTags.length > 0
        ? supabase
            .from('menu_item_tags')
            .insert(selectedTags.map((tag_id) => ({ menu_item_id: newItem.id, tag_id })))
        : Promise.resolve(),
    ])

    onSave(buildFullItem(newItem))
    toast.success(`${itemSingularTitle} añadido`)
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

    const ingredientNames = form.ingredients
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)

    const [deleteIngredients, deleteAllergens, deleteTags] = await Promise.all([
      supabase.from('ingredients').delete().eq('menu_item_id', item.id),
      supabase.from('menu_item_allergens').delete().eq('menu_item_id', item.id),
      supabase.from('menu_item_tags').delete().eq('menu_item_id', item.id),
    ])

    if ([deleteIngredients.error, deleteAllergens.error, deleteTags.error].filter(Boolean).length > 0) {
      toast.error(`Error al actualizar datos del ${itemSingular}`)
      setLoading(false)
      return
    }

    const insertResults = await Promise.all([
      ingredientNames.length > 0
        ? supabase
            .from('ingredients')
            .insert(ingredientNames.map((name) => ({ menu_item_id: item.id, name })))
        : Promise.resolve({ error: null }),
      selectedAllergens.length > 0
        ? supabase.from('menu_item_allergens').insert(
            selectedAllergens.map((allergen_id) => ({ menu_item_id: item.id, allergen_id })),
          )
        : Promise.resolve({ error: null }),
      selectedTags.length > 0
        ? supabase
            .from('menu_item_tags')
            .insert(selectedTags.map((tag_id) => ({ menu_item_id: item.id, tag_id })))
        : Promise.resolve({ error: null }),
    ])

    if (insertResults.some((result) => result.error)) {
      toast.error('Error al guardar relaciones. Algunos datos pueden haberse perdido. Recarga la página.')
    }

    onSave(buildFullItem(item))
    toast.success(`${itemSingularTitle} actualizado`)
    setOpen(false)
    setLoading(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'add') await handleAdd()
    else await handleEdit()
  }

  const dialogContent = (
    <DialogContent className="max-h-[90vh] sm:max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">
          {mode === 'add' ? `Añadir ${itemSingular}` : `Editar ${itemSingular}`}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Las descripciones, fotos y alérgenos pueden ser incorrectos debido al uso de IA. Revisa siempre antes de publicar.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Imagen</Label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={itemSingularTitle}
                  className="h-20 w-20 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50">
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) handleImageUpload(file)
                    event.target.value = ''
                  }}
                />
              </label>
            )}
            <button
              type="button"
              disabled={form.name.trim().length < 3 || aiLoading.photo}
              onClick={handleAIPhoto}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-primary hover:underline disabled:cursor-default disabled:opacity-40"
            >
              {aiLoading.photo
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              {imageUrl ? 'Cambiar con IA' : 'Buscar con IA'}
            </button>
          </div>
          {aiPreviewPhoto && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiPreviewPhoto} alt="Preview" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              <div className="flex-1 space-y-1.5">
                <p className="text-xs text-muted-foreground">Foto encontrada por IA</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 cursor-pointer text-xs" onClick={acceptPhoto}>✓ Usar esta</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer text-xs" onClick={() => setAiPreviewPhoto(null)}>✗ Descartar</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Nombre *</Label>
          <Input
            placeholder={`Ej: ${getDefaultItemName(venueType)}`}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Descripción</Label>
            <button
              type="button"
              disabled={form.name.trim().length < 3 || aiLoading.description}
              onClick={handleAIDescription}
              className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline disabled:cursor-default disabled:opacity-40"
            >
              {aiLoading.description
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              Generar con IA
            </button>
          </div>
          <Textarea
            placeholder={`Breve descripción del ${itemSingular}...`}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={2}
          />
          {aiPreviewDescription && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Descripción generada por IA:</p>
              <p className="text-sm">{aiPreviewDescription}</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 cursor-pointer text-xs" onClick={acceptDescription}>✓ Usar esta</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer text-xs" onClick={() => setAiPreviewDescription(null)}>✗ Descartar</Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Precio (EUR) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="12.50"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Ingredientes o componentes</Label>
          <Input
            placeholder={getIngredientPlaceholder(venueType)}
            value={form.ingredients}
            onChange={(event) => setForm({ ...form, ingredients: event.target.value })}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Alérgenos</Label>
            <button
              type="button"
              disabled={form.name.trim().length < 3 || aiLoading.allergens}
              onClick={handleAIAllergens}
              className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline disabled:cursor-default disabled:opacity-40"
            >
              {aiLoading.allergens
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              Detectar con IA
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allergens.map((allergen) => (
              <div key={allergen.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${mode}-allergen-${item?.id ?? 'new'}-${allergen.id}`}
                  checked={selectedAllergens.includes(allergen.id)}
                  onCheckedChange={() => toggleAllergen(allergen.id)}
                />
                <label
                  htmlFor={`${mode}-allergen-${item?.id ?? 'new'}-${allergen.id}`}
                  className="cursor-pointer text-sm"
                >
                  {allergen.icon} {allergen.name}
                </label>
              </div>
            ))}
          </div>
          {aiPreviewAllergenIds.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Alérgenos detectados por IA:</p>
              <div className="flex flex-wrap gap-1">
                {aiPreviewAllergenNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 cursor-pointer text-xs" onClick={acceptAllergens}>✓ Añadir</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer text-xs" onClick={() => { setAiPreviewAllergenIds([]); setAiPreviewAllergenNames([]) }}>✗ Descartar</Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Etiquetas dieteticas</Label>
          <div className="grid grid-cols-2 gap-2">
            {dietaryTags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${mode}-tag-${item?.id ?? 'new'}-${tag.id}`}
                  checked={selectedTags.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                <label
                  htmlFor={`${mode}-tag-${item?.id ?? 'new'}-${tag.id}`}
                  className="cursor-pointer text-sm"
                >
                  {tag.icon} {tag.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {(aiPreviewPhoto ? 1 : 0) + (aiPreviewDescription ? 1 : 0) + (aiPreviewAllergenIds.length > 0 ? 1 : 0) >= 2 && (
          <Button type="button" variant="outline" className="w-full cursor-pointer" onClick={acceptAll}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Aceptar todo
          </Button>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
            {loading ? 'Guardando...' : mode === 'add' ? `Añadir ${itemSingular}` : 'Guardar cambios'}
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 min-h-[32px] min-w-[32px] cursor-pointer touch-manipulation p-0"
                onClick={() => handleOpenChange(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <TooltipContent>{`Editar ${itemSingular}`}</TooltipContent>
        </Tooltip>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          {dialogContent}
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 min-h-[32px] min-w-[32px] cursor-pointer touch-manipulation p-0"
              onClick={() => handleOpenChange(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
        <TooltipContent>{`Añadir ${itemSingular}`}</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    </>
  )
}

function ItemImageThumb({
  imageUrl,
  itemName,
  restaurantId,
  onChange,
}: {
  imageUrl?: string
  itemName: string
  restaurantId: string
  onChange: (newUrl: string | null) => void | Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function openPicker() {
    fileInputRef.current?.click()
  }

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurantId)

      const response = await fetch('/api/upload', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      await onChange(data.url)
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) handleFile(file)
        event.target.value = ''
      }}
    />
  )

  if (!imageUrl) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-background transition-colors hover:border-primary/60 hover:bg-primary/5"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            }
          />
          <TooltipContent>Añadir imagen</TooltipContent>
        </Tooltip>
        {hiddenInput}
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={uploading}
              className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={itemName} className="h-full w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={openPicker} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Cambiar imagen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChange(null)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar imagen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {hiddenInput}
    </>
  )
}

function SortableCategory({
  categoryId,
  children,
}: {
  categoryId: string
  children: (dragHandleProps: Record<string, unknown>) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: categoryId,
  })

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

function SortableItem({
  itemId,
  children,
}: {
  itemId: string
  children: (dragHandleProps: Record<string, unknown>) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
  })

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
