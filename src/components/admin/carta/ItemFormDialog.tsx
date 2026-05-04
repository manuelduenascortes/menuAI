'use client'

import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { MenuItemFull } from './types'

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
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

export default function ItemFormDialog({
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
