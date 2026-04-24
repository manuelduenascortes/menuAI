'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import type { Allergen, Restaurant } from '@/lib/types'
import { getVenueConfig, normalizeVenueType } from '@/lib/venue-config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

interface ExtractedItem {
  name: string
  description: string | null
  price: number
  ingredients: string[]
  allergens?: string[]
  _allergenIds?: string[]
  _imageUrl?: string
}

interface ExtractedCategory {
  name: string
  emoji: string
  items: ExtractedItem[]
}

interface ExtractedMenu {
  categories: ExtractedCategory[]
}

type Step = 'input' | 'loading' | 'preview' | 'saving' | 'done'
type ImportMode = 'image' | 'text' | 'pdf'

export default function MenuImport({
  restaurantId,
  allergens,
  venueType,
  onComplete,
}: {
  restaurantId: string
  allergens: Allergen[]
  venueType?: Restaurant['venue_type']
  onComplete: () => void
}) {
  const venueConfig = getVenueConfig(venueType)
  const normalizedVenueType = normalizeVenueType(venueType)
  const itemSingular = venueConfig.itemSingular
  const itemPlural = venueConfig.itemPlural

  const [step, setStep] = useState<Step>('input')
  const [mode, setMode] = useState<ImportMode>('image')
  const [textContent, setTextContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedMenu | null>(null)
  const [error, setError] = useState('')
  const [saveProgress, setSaveProgress] = useState({
    catIdx: 0,
    itemIdx: 0,
    totalCats: 0,
    totalItems: 0,
  })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [ingredientTexts, setIngredientTexts] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [pdfProgress, setPdfProgress] = useState<{
    current: number
    total: number
    itemsFound: number
  } | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Archivo demasiado grande (max. 10 MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  function resolveAllergenIds(allergenNames: string[]): string[] {
    return allergenNames
      .map((name) => allergens.find((allergen) => allergen.name.toLowerCase() === name.toLowerCase())?.id)
      .filter((id): id is string => !!id)
  }

  function removeCategory(index: number) {
    if (!extracted) return

    setExtracted({
      categories: extracted.categories.filter((_, categoryIndex) => categoryIndex !== index),
    })
  }

  function removeItem(catIdx: number, itemIdx: number) {
    if (!extracted) return

    setExtracted({
      categories: extracted.categories.map((category, categoryIndex) =>
        categoryIndex === catIdx
          ? { ...category, items: category.items.filter((_, currentItemIndex) => currentItemIndex !== itemIdx) }
          : category,
      ),
    })
  }

  function toggleAllergen(catIdx: number, itemIdx: number, allergenId: string) {
    if (!extracted) return

    setExtracted({
      categories: extracted.categories.map((category, categoryIndex) =>
        categoryIndex === catIdx
          ? {
              ...category,
              items: category.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIdx
                  ? {
                      ...item,
                      _allergenIds: item._allergenIds?.includes(allergenId)
                        ? item._allergenIds.filter((id) => id !== allergenId)
                        : [...(item._allergenIds ?? []), allergenId],
                    }
                  : item,
              ),
            }
          : category,
      ),
    })
  }

  function updateItem(catIdx: number, itemIdx: number, patch: Partial<ExtractedItem>) {
    if (!extracted) return

    setExtracted({
      categories: extracted.categories.map((category, categoryIndex) =>
        categoryIndex === catIdx
          ? {
              ...category,
              items: category.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIdx ? { ...item, ...patch } : item,
              ),
            }
          : category,
      ),
    })
  }

  function updateCategory(catIdx: number, patch: Partial<ExtractedCategory>) {
    if (!extracted) return

    setExtracted({
      categories: extracted.categories.map((category, categoryIndex) =>
        categoryIndex === catIdx ? { ...category, ...patch } : category,
      ),
    })
  }

  function toggleExpanded(key: string) {
    setExpandedItems((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleImageUpload(catIdx: number, itemIdx: number, file: File) {
    const key = `${catIdx}-${itemIdx}`
    setUploadingImage(key)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurantId)

      const response = await fetch('/api/upload', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setExtracted((previous) => {
        if (!previous) return previous

        return {
          categories: previous.categories.map((category, categoryIndex) =>
            categoryIndex === catIdx
              ? {
                  ...category,
                  items: category.items.map((item, currentItemIndex) =>
                    currentItemIndex === itemIdx ? { ...item, _imageUrl: data.url } : item,
                  ),
                }
              : category,
          ),
        }
      })
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploadingImage(null)
    }
  }

  async function processPdf(file: File): Promise<ExtractedMenu> {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>

    try {
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    } catch (error: unknown) {
      const pdfError = error as { name?: string }
      if (pdfError.name === 'PasswordException') {
        throw new Error('Este PDF esta protegido. Desbloquealo antes de subirlo.')
      }
      if (pdfError.name === 'InvalidPDFException') {
        throw new Error('El archivo no es un PDF valido.')
      }

      throw new Error('No se pudo leer el PDF. Prueba otra vez o usa Foto o Texto.')
    }

    let merged: ExtractedMenu = { categories: [] }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setPdfProgress({
        current: pageNum,
        total: pdf.numPages,
        itemsFound: merged.categories.reduce((acc, category) => acc + category.items.length, 0),
      })

      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext('2d')

      if (!context) throw new Error('No se pudo preparar la pagina del PDF.')

      await page.render({ canvas, canvasContext: context, viewport }).promise
      const base64 = canvas.toDataURL('image/jpeg', 0.85)

      let pageResult: ExtractedMenu | null = null

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch('/api/menu/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', content: base64 }),
          })

          if (response.ok) {
            pageResult = await response.json()
            break
          }
        } catch {
          // retry
        }
      }

      if (pageResult?.categories?.length) {
        merged = mergeExtractedMenus(merged, pageResult)
      }
    }

    return merged
  }

  async function handleExtract() {
    setError('')
    setStep('loading')
    setPdfProgress(null)

    try {
      let data: ExtractedMenu

      if (mode === 'pdf') {
        const file = pdfRef.current?.files?.[0]
        if (!file) throw new Error('No has seleccionado ningun PDF.')
        data = await processPdf(file)
        setPdfProgress(null)
      } else {
        const body =
          mode === 'image'
            ? { type: 'image', content: imagePreview }
            : { type: 'text', content: textContent }

        const response = await fetch('/api/menu/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error procesando la carta.')
        }

        data = await response.json()
      }

      if (!data.categories?.length) {
        throw new Error(`No se encontraron ${itemPlural}. Prueba con Foto, PDF o Texto.`)
      }

      for (const category of data.categories) {
        for (const item of category.items) {
          item._allergenIds = resolveAllergenIds(item.allergens ?? [])
        }
      }

      setExtracted(data)
      setStep('preview')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setError(message)
      toast.error(message)
      setPdfProgress(null)
      setStep('input')
    }
  }

  async function handleSave() {
    if (!extracted) return

    const totalItems = extracted.categories.reduce((acc, category) => acc + category.items.length, 0)
    setSaveProgress({
      catIdx: 0,
      itemIdx: 0,
      totalCats: extracted.categories.length,
      totalItems,
    })
    setStep('saving')

    try {
      let itemsDone = 0
      let failedCategories = 0
      let failedItems = 0

      for (let categoryIndex = 0; categoryIndex < extracted.categories.length; categoryIndex++) {
        const category = extracted.categories[categoryIndex]
        setSaveProgress((previous) => ({ ...previous, catIdx: categoryIndex + 1 }))

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurantId,
            name: category.name,
            emoji: category.emoji || null,
            display_order: categoryIndex,
          })
          .select()
          .single()

        if (categoryError || !categoryData) {
          failedCategories++
          failedItems += category.items.length
          continue
        }

        for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
          const item = category.items[itemIndex]
          itemsDone++
          setSaveProgress((previous) => ({ ...previous, itemIdx: itemsDone }))

          const { data: itemData, error: itemError } = await supabase
            .from('menu_items')
            .insert({
              category_id: categoryData.id,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              available: true,
              display_order: itemIndex,
              image_url: item._imageUrl || null,
            })
            .select()
            .single()

          if (itemError || !itemData) {
            failedItems++
            continue
          }

          if (item.ingredients?.length) {
            await supabase.from('ingredients').insert(
              item.ingredients.map((name) => ({ menu_item_id: itemData.id, name })),
            )
          }

          if (item._allergenIds?.length) {
            await supabase.from('menu_item_allergens').insert(
              item._allergenIds.map((allergen_id) => ({ menu_item_id: itemData.id, allergen_id })),
            )
          }
        }
      }

      if (failedCategories > 0 || failedItems > 0) {
        toast.warning(
          `Importacion parcial: ${failedCategories} categorias y ${failedItems} ${itemPlural} no se pudieron guardar.`,
        )
      } else {
        toast.success('Carta importada correctamente')
      }

      setStep('done')
    } catch {
      toast.error('Error guardando en la base de datos')
      setError('Error guardando en la base de datos')
      setStep('preview')
    }
  }

  if (step === 'input') {
    return (
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar carta del local con IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sube una foto, un PDF o pega texto. La IA extraera categorias, {itemPlural}, precios e ingredientes.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('image')}
              className="cursor-pointer"
            >
              <Camera className="mr-1.5 h-4 w-4" />
              Foto
            </Button>
            <Button
              variant={mode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('text')}
              className="cursor-pointer"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              Texto
            </Button>
            <Button
              variant={mode === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('pdf')}
              className="cursor-pointer"
            >
              <FileUp className="mr-1.5 h-4 w-4" />
              PDF
            </Button>
          </div>

          {mode === 'image' ? (
            <div className="space-y-3">
              <Label>Sube una foto o captura de la carta</Label>
              <Input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} />
              {imagePreview && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Vista previa de la carta"
                    className="mx-auto max-h-64 rounded-lg border border-border object-contain"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
                    onClick={() => {
                      setImagePreview(null)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : mode === 'pdf' ? (
            <div className="space-y-3">
              <Label>Sube tu carta en PDF</Label>
              <div
                className="cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 p-8 text-center transition-colors hover:border-primary/60"
                onClick={() => pdfRef.current?.click()}
              >
                <FileUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Haz clic para seleccionar un PDF</p>
                <p className="mt-1 text-xs text-muted-foreground">Digital o escaneado · Max. 20 MB</p>
                <input
                  ref={pdfRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return

                    if (file.size > 20 * 1024 * 1024) {
                      setError('El PDF es demasiado grande (max. 20 MB).')
                      event.target.value = ''
                      setPdfFileName(null)
                      return
                    }

                    setError('')
                    setPdfFileName(file.name)
                  }}
                />
              </div>
              {pdfFileName && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileUp className="h-4 w-4 text-primary" />
                  {pdfFileName}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Pega aquí el texto de la carta</Label>
              <Textarea
                placeholder={getImportTextPlaceholder(normalizedVenueType)}
                value={textContent}
                onChange={(event) => setTextContent(event.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleExtract}
            disabled={
              mode === 'image' ? !imagePreview : mode === 'pdf' ? !pdfFileName : !textContent.trim()
            }
            className="w-full cursor-pointer"
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Extraer {itemPlural} con IA
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'loading') {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          {pdfProgress ? (
            <>
              <p className="text-lg font-medium text-foreground">Extrayendo la carta del PDF...</p>
              <div className="mx-auto mt-6 max-w-xs space-y-2">
                <Progress value={Math.round((pdfProgress.current / pdfProgress.total) * 100)} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Pagina {pdfProgress.current} de {pdfProgress.total}
                  {pdfProgress.itemsFound > 0 && <> · {pdfProgress.itemsFound} {itemPlural} encontrados</>}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-foreground">Analizando la carta...</p>
              <p className="mt-2 text-sm text-muted-foreground">
                La IA esta detectando categorias, {itemPlural}, ingredientes y alérgenos.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (step === 'preview' && extracted) {
    const totalItems = extracted.categories.reduce((acc, category) => acc + category.items.length, 0)

    return (
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Se encontraron {extracted.categories.length} categorias y {totalItems} {itemPlural}
                </p>
                <p className="text-sm text-muted-foreground">
                  Revisa y edita el resultado antes de guardar. Puedes ajustar nombres, alérgenos, imagenes y precios.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('input')
                    setExtracted(null)
                  }}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Volver
                </Button>
                <Button onClick={handleSave} className="cursor-pointer">
                  <Save className="mr-1.5 h-4 w-4" />
                  Guardar todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {extracted.categories.map((category, catIdx) => (
          <Card key={`${category.name}-${catIdx}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input
                    value={category.emoji}
                    onChange={(event) => updateCategory(catIdx, { emoji: event.target.value })}
                    className="w-12 px-1 text-center"
                    placeholder="🍽"
                  />
                  <Input
                    value={category.name}
                    onChange={(event) => updateCategory(catIdx, { name: event.target.value })}
                    className="flex-1 font-serif font-semibold"
                    placeholder="Nombre de categoria"
                  />
                  <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                    {category.items.length} {itemPlural}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  onClick={() => removeCategory(catIdx)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {category.items.map((item, itemIdx) => {
                  const itemKey = `${catIdx}-${itemIdx}`
                  const isExpanded = expandedItems.has(itemKey)
                  const allergenCount = item._allergenIds?.length ?? 0

                  return (
                    <div key={itemKey} className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          {item._imageUrl ? (
                            <div className="relative shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item._imageUrl}
                                alt={item.name}
                                className="h-14 w-14 rounded-lg border border-border object-cover"
                              />
                              <button
                                type="button"
                                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                                onClick={() => {
                                  setExtracted((previous) => {
                                    if (!previous) return previous

                                    return {
                                      categories: previous.categories.map((currentCategory, categoryIndex) =>
                                        categoryIndex === catIdx
                                          ? {
                                              ...currentCategory,
                                              items: currentCategory.items.map((currentItem, currentItemIndex) =>
                                                currentItemIndex === itemIdx
                                                  ? { ...currentItem, _imageUrl: undefined }
                                                  : currentItem,
                                              ),
                                            }
                                          : currentCategory,
                                      ),
                                    }
                                  })
                                }}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50">
                              {uploadingImage === itemKey ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file) handleImageUpload(catIdx, itemIdx, file)
                                  event.target.value = ''
                                }}
                              />
                            </label>
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Input
                                value={item.name}
                                onChange={(event) => updateItem(catIdx, itemIdx, { name: event.target.value })}
                                className="h-8 flex-1 text-sm font-medium"
                                placeholder={`Nombre del ${itemSingular}`}
                              />
                              <div className="flex shrink-0 items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price || ''}
                                  onChange={(event) =>
                                    updateItem(catIdx, itemIdx, {
                                      price: parseFloat(event.target.value) || 0,
                                    })
                                  }
                                  className="h-8 w-24 text-right text-sm tabular-nums"
                                  placeholder="0.00"
                                />
                                <span className="text-sm text-muted-foreground">EUR</span>
                              </div>
                            </div>

                            <Input
                              value={item.description ?? ''}
                              onChange={(event) =>
                                updateItem(catIdx, itemIdx, {
                                  description: event.target.value || null,
                                })
                              }
                              className="h-7 text-xs text-muted-foreground"
                              placeholder={`Descripción del ${itemSingular} (opcional)`}
                            />

                            <Input
                              value={ingredientTexts[itemKey] ?? item.ingredients?.join(', ') ?? ''}
                              onChange={(event) =>
                                setIngredientTexts((previous) => ({
                                  ...previous,
                                  [itemKey]: event.target.value,
                                }))
                              }
                              onBlur={() => {
                                const text = ingredientTexts[itemKey]
                                if (text != null) {
                                  updateItem(catIdx, itemIdx, {
                                    ingredients: text
                                      .split(',')
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  })
                                }
                              }}
                              className="h-7 text-xs text-muted-foreground"
                              placeholder="Ingredientes o componentes separados por comas"
                            />

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {allergenCount > 0 ? (
                                item._allergenIds?.map((allergenId) => {
                                  const allergen = allergens.find((current) => current.id === allergenId)
                                  if (!allergen) return null

                                  return (
                                    <Badge
                                      key={allergenId}
                                      variant="outline"
                                      className="gap-0.5 px-1.5 py-0 text-[10px]"
                                    >
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      {allergen.icon} {allergen.name}
                                    </Badge>
                                  )
                                })
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Sin alérgenos detectados</span>
                              )}

                              <button
                                type="button"
                                className="ml-1 cursor-pointer text-[10px] text-primary hover:underline"
                                onClick={() => toggleExpanded(itemKey)}
                              >
                                {isExpanded ? (
                                  <span className="flex items-center gap-0.5">
                                    <ChevronUp className="h-3 w-3" />
                                    Cerrar
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <ChevronDown className="h-3 w-3" />
                                    Editar alérgenos
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="ml-2 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => removeItem(catIdx, itemIdx)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border/50 pt-2">
                          <Label className="mb-2 block text-xs text-muted-foreground">Alérgenos</Label>
                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {allergens.map((allergen) => (
                              <div key={allergen.id} className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`import-allergen-${catIdx}-${itemIdx}-${allergen.id}`}
                                  checked={item._allergenIds?.includes(allergen.id) ?? false}
                                  onCheckedChange={() => toggleAllergen(catIdx, itemIdx, allergen.id)}
                                />
                                <label
                                  htmlFor={`import-allergen-${catIdx}-${itemIdx}-${allergen.id}`}
                                  className="cursor-pointer text-xs"
                                >
                                  {allergen.icon} {allergen.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep('input')
              setExtracted(null)
            }}
            className="cursor-pointer"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">
            <Save className="mr-1.5 h-4 w-4" />
            Guardar {totalItems} {itemPlural}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    const percent =
      saveProgress.totalItems > 0
        ? Math.round((saveProgress.itemIdx / saveProgress.totalItems) * 100)
        : 0

    return (
      <Card>
        <CardContent className="space-y-6 py-16">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Guardando la carta...</p>
          </div>
          <div className="mx-auto max-w-md space-y-3">
            <Progress value={percent} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              Guardando categoria {saveProgress.catIdx} de {saveProgress.totalCats}
              {saveProgress.totalItems > 0 && (
                <>
                  {' '}
                  · {itemSingular} {saveProgress.itemIdx} de {saveProgress.totalItems}
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <p className="font-serif text-xl text-foreground">Carta importada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos los {itemPlural} se han guardado correctamente.
        </p>
        <Button className="mt-6 cursor-pointer" onClick={onComplete}>
          Ver mi carta
        </Button>
      </CardContent>
    </Card>
  )
}

function mergeExtractedMenus(first: ExtractedMenu, second: ExtractedMenu): ExtractedMenu {
  const result: ExtractedMenu = {
    categories: first.categories.map((category) => ({ ...category, items: [...category.items] })),
  }

  for (const secondCategory of second.categories) {
    const existing = result.categories.find(
      (currentCategory) => currentCategory.name.toLowerCase() === secondCategory.name.toLowerCase(),
    )

    if (existing) {
      for (const secondItem of secondCategory.items) {
        const isDuplicate = existing.items.some(
          (currentItem) => currentItem.name.toLowerCase() === secondItem.name.toLowerCase(),
        )

        if (!isDuplicate) existing.items.push(secondItem)
      }
    } else {
      result.categories.push({ ...secondCategory, items: [...secondCategory.items] })
    }
  }

  return result
}

function getImportTextPlaceholder(venueType: ReturnType<typeof normalizeVenueType>) {
  if (venueType === 'bar_cafe') {
    return `CAFES
Cafe con leche - 1.80
Americano - 1.70

DESAYUNOS
Tostada de tomate - 2.90
Croissant mixto - 3.50`
  }

  if (venueType === 'cocktail_bar') {
    return `CLASICOS
Negroni - 10.00
Mojito - 9.50

SIN ALCOHOL
Virgin Colada - 8.00
Spritz 0,0 - 7.50`
  }

  return `ENTRANTES
Ensalada Cesar - 9.50
Croquetas caseras - 7.00

PRINCIPALES
Entrecot de ternera - 18.00
Merluza a la plancha - 15.50`
}
