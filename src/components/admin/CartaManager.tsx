'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Leaf,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import type { Allergen, DietaryTag, Restaurant } from '@/lib/types'
import { getVenueConfig, normalizeVenueType } from '@/lib/venue-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import SortableCategory from './carta/SortableCategory'
import SortableItem from './carta/SortableItem'
import ItemImageThumb from './carta/ItemImageThumb'
import ItemFormDialog from './carta/ItemFormDialog'
import type { CategoryWithItems } from './carta/types'

interface Props {
  restaurant: Restaurant
  initialCategories: CategoryWithItems[]
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
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
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput), 150)
    return () => clearTimeout(handle)
  }, [searchInput])
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

  const totalItems = useMemo(
    () => categories.reduce((acc, category) => acc + category.menu_items.length, 0),
    [categories],
  )

  const filteredCategories = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) return categories
    return categories
      .map((cat) => ({
        ...cat,
        menu_items: cat.menu_items.filter((item) => item.name.toLowerCase().includes(normalized)),
      }))
      .filter((cat) => cat.menu_items.length > 0)
  }, [categories, searchTerm])

  async function saveEditCategory(categoryId: string) {
    const { name, emoji, description } = editingCategoryData
    if (!name.trim()) return
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim(), emoji: emoji || null, description: description || null })
      .eq('id', categoryId)
    if (error) {
      toast.error('Error al guardar categorÃ­a')
      return
    }
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, name: name.trim(), emoji, description } : cat,
      ),
    )
    setEditingCategoryId(null)
    toast.success('CategorÃ­a actualizada')
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

  // Sincroniza con el servidor solo cuando los IDs cambian â€” evitar machacar
  // ediciones locales si el padre rerenderiza con la misma referencia distinta.
  const initialCategoriesSignature = useMemo(
    () =>
      initialCategories
        .map((cat) => `${cat.id}:${cat.menu_items.map((it) => it.id).join(',')}`)
        .join('|'),
    [initialCategories],
  )
  useEffect(() => {
    setCategories(initialCategories)
    // Intencional: solo cuando cambia la firma (ids), no la referencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategoriesSignature])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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
      title: 'Â¿Borrar selecciÃ³n?',
      description: `Se eliminarÃ¡n ${selectedCategories.size} categorÃ­as y ${selectedItems.size} ${itemPlural}. Esta acciÃ³n no se puede deshacer.`,
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
          toast.error('OcurriÃ³ un error al borrar algunos elementos')
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

    const res = await fetch('/api/admin/menu/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'category', ids: newArray.map((c) => c.id) }),
    })

    if (!res.ok) {
      toast.error('Error al guardar el orden. Recargando...')
      router.refresh()
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

    const res = await fetch('/api/admin/menu/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'item',
        categoryId,
        ids: newItems.map((i) => i.id),
      }),
    })

    if (!res.ok) {
      toast.error('Error al guardar el orden. Recargando...')
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
      toast.success('CategorÃ­a aÃ±adida')
      invalidateCache()
    } else {
      toast.error('Error al aÃ±adir categorÃ­a')
    }

    setLoadingCategory(false)
  }

  function deleteCategory(categoryId: string) {
    setConfirmDialog({
      open: true,
      title: 'Â¿Eliminar esta categorÃ­a?',
      description: `Se eliminarÃ¡n tambiÃ©n todos los ${itemPlural} de esta categorÃ­a. Esta acciÃ³n no se puede deshacer.`,
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId)

        if (error) {
          toast.error('Error al eliminar categorÃ­a')
          return
        }

        setCategories((previous) => previous.filter((category) => category.id !== categoryId))
        toast.success('CategorÃ­a eliminada')
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
      description: `El ${itemSingular} se eliminarÃ¡ permanentemente. Esta acciÃ³n no se puede deshacer.`,
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
        <div className="sticky top-14 z-40 -mx-5 px-5 py-2 bg-background border-b border-border shadow-sm">
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
              {categories.length} categorÃ­as Â· {categories.reduce((acc, category) => acc + category.menu_items.length, 0)} {itemPlural}
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
            AÃ±adir categorÃ­a
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar Ã­tem..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            type="search"
            enterKeyHint="search"
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
                placeholder="Nombre de la categorÃ­a *"
                value={newCategory.name}
                onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="DescripciÃ³n (opcional)"
              value={newCategory.description}
              onChange={(event) => setNewCategory({ ...newCategory, description: event.target.value })}
            />
            <div className="flex gap-2">
              <Button
                onClick={addCategory}
                disabled={loadingCategory || !newCategory.name.trim()}
                className="cursor-pointer"
              >
                {loadingCategory ? 'Guardando...' : 'Guardar categorÃ­a'}
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
          <p className="mb-2 font-serif text-xl text-foreground">Tu carta estÃ¡ vacÃ­a</p>
          <p className="mx-auto mb-6 max-w-xs text-sm text-muted-foreground">
            Empieza creando tu primera categorÃ­a. Por ejemplo: {categoryExamples.join(', ')}.
          </p>
          <Button onClick={() => setAddingCategory(true)} className="cursor-pointer">
            <Plus className="mr-1.5 h-4 w-4" />
            AÃ±adir primera categorÃ­a
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
                            style={{ touchAction: 'none' }}
                            aria-label="Arrastrar para reordenar categorÃ­a"
                            className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing"
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
                            <TooltipContent>Editar categorÃ­a</TooltipContent>
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
                            <TooltipContent>Eliminar categorÃ­a</TooltipContent>
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
                            placeholder="DescripciÃ³n (opcional)"
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
                          <p className="mb-1 font-serif text-base text-foreground">Sin {itemPlural} todavÃ­a</p>
                          <p className="mb-3 text-sm text-muted-foreground">
                            AÃ±ade el primer {itemSingular} a esta categorÃ­a
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
                                          style={{ touchAction: 'none' }}
                                          aria-label="Arrastrar para reordenar"
                                          className="shrink-0 cursor-grab touch-none rounded p-2 text-muted-foreground hover:bg-muted active:cursor-grabbing"
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
                                                  {expandedDescs.has(item.id) ? 'ver menos' : 'ver mÃ¡s'}
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

