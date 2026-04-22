'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Camera, FileText, FileUp, Sparkles, Trash2, ArrowLeft, Save, Loader2, CheckCircle2, X, ChevronDown, ChevronUp, ImagePlus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Allergen } from '@/lib/types'

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

function mergeExtractedMenus(a: ExtractedMenu, b: ExtractedMenu): ExtractedMenu {
  const result: ExtractedMenu = {
    categories: a.categories.map(c => ({ ...c, items: [...c.items] })),
  }
  for (const bCat of b.categories) {
    const existing = result.categories.find(
      c => c.name.toLowerCase() === bCat.name.toLowerCase()
    )
    if (existing) {
      for (const bItem of bCat.items) {
        const isDuplicate = existing.items.some(
          i => i.name.toLowerCase() === bItem.name.toLowerCase()
        )
        if (!isDuplicate) existing.items.push(bItem)
      }
    } else {
      result.categories.push({ ...bCat, items: [...bCat.items] })
    }
  }
  return result
}

export default function MenuImport({ restaurantId, allergens, onComplete }: {
  restaurantId: string
  allergens: Allergen[]
  onComplete: () => void
}) {
  const [step, setStep] = useState<Step>('input')
  const [mode, setMode] = useState<'image' | 'text' | 'pdf'>('image')
  const [textContent, setTextContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedMenu | null>(null)
  const [error, setError] = useState('')
  const [saveProgress, setSaveProgress] = useState({ catIdx: 0, itemIdx: 0, totalCats: 0, totalItems: 0 })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [ingredientTexts, setIngredientTexts] = useState<Record<string, string>>({})
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; itemsFound: number } | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Archivo demasiado grande (máx. 10MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  // Match AI-returned allergen names to DB allergen IDs
  function resolveAllergenIds(allergenNames: string[]): string[] {
    return allergenNames
      .map(name => allergens.find(a => a.name.toLowerCase() === name.toLowerCase())?.id)
      .filter((id): id is string => !!id)
  }

  async function processPdf(file: File): Promise<ExtractedMenu> {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>
    try {
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    } catch (err: unknown) {
      const pdfError = err as { name?: string }
      if (pdfError.name === 'PasswordException') {
        throw new Error('Este PDF está protegido. Desbloquéalo antes de subirlo.')
      }
      if (pdfError.name === 'InvalidPDFException') {
        throw new Error('El archivo no es un PDF válido.')
      }
      throw new Error('No se pudo leer el PDF. Prueba de nuevo o usa la opción Foto o Texto.')
    }

    const total = pdf.numPages
    let merged: ExtractedMenu = { categories: [] }

    for (let pageNum = 1; pageNum <= total; pageNum++) {
      setPdfProgress({
        current: pageNum,
        total,
        itemsFound: merged.categories.reduce((acc, c) => acc + c.items.length, 0),
      })

      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo preparar la página del PDF.')
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const base64 = canvas.toDataURL('image/jpeg', 0.85)

      let pageResult: ExtractedMenu | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/menu/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', content: base64 }),
          })
          if (res.ok) {
            pageResult = await res.json()
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
        if (!file) throw new Error('No se ha seleccionado ningún PDF')
        data = await processPdf(file)
        setPdfProgress(null)
      } else {
        const body = mode === 'image'
          ? { type: 'image', content: imagePreview }
          : { type: 'text', content: textContent }

        const res = await fetch('/api/menu/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Error procesando')
        }

        data = await res.json()
      }

      if (!data.categories?.length) {
        throw new Error('No se encontraron platos. Prueba con la opción Foto o Texto.')
      }

      // Resolve allergen names → IDs
      for (const cat of data.categories) {
        for (const item of cat.items) {
          item._allergenIds = resolveAllergenIds(item.allergens ?? [])
        }
      }

      setExtracted(data)
      setStep('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
      setPdfProgress(null)
      setStep('input')
    }
  }

  function removeCategory(idx: number) {
    if (!extracted) return
    setExtracted({
      categories: extracted.categories.filter((_, i) => i !== idx),
    })
  }

  function removeItem(catIdx: number, itemIdx: number) {
    if (!extracted) return
    setExtracted({
      categories: extracted.categories.map((cat, ci) =>
        ci === catIdx
          ? { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) }
          : cat
      ),
    })
  }

  function toggleAllergen(catIdx: number, itemIdx: number, allergenId: string) {
    if (!extracted) return
    setExtracted({
      categories: extracted.categories.map((cat, ci) =>
        ci === catIdx
          ? {
              ...cat,
              items: cat.items.map((item, ii) =>
                ii === itemIdx
                  ? {
                      ...item,
                      _allergenIds: item._allergenIds?.includes(allergenId)
                        ? item._allergenIds.filter(id => id !== allergenId)
                        : [...(item._allergenIds ?? []), allergenId],
                    }
                  : item
              ),
            }
          : cat
      ),
    })
  }

  function updateItem(catIdx: number, itemIdx: number, patch: Partial<ExtractedItem>) {
    if (!extracted) return
    setExtracted({
      categories: extracted.categories.map((cat, ci) =>
        ci === catIdx
          ? {
              ...cat,
              items: cat.items.map((item, ii) =>
                ii === itemIdx ? { ...item, ...patch } : item
              ),
            }
          : cat
      ),
    })
  }

  function updateCategory(catIdx: number, patch: Partial<ExtractedCategory>) {
    if (!extracted) return
    setExtracted({
      categories: extracted.categories.map((cat, ci) =>
        ci === catIdx ? { ...cat, ...patch } : cat
      ),
    })
  }

  function toggleExpanded(key: string) {
    setExpandedItems(prev => {
      const next = new Set(prev)
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

      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setExtracted(prev => {
        if (!prev) return prev
        return {
          categories: prev.categories.map((cat, ci) =>
            ci === catIdx
              ? {
                  ...cat,
                  items: cat.items.map((item, ii) =>
                    ii === itemIdx ? { ...item, _imageUrl: data.url } : item
                  ),
                }
              : cat
          ),
        }
      })
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploadingImage(null)
    }
  }

  async function handleSave() {
    if (!extracted) return
    const totalItems = extracted.categories.reduce((acc, c) => acc + c.items.length, 0)
    setSaveProgress({ catIdx: 0, itemIdx: 0, totalCats: extracted.categories.length, totalItems })
    setStep('saving')

    try {
      let itemsDone = 0
      let failedCats = 0
      let failedItems = 0

      for (let i = 0; i < extracted.categories.length; i++) {
        const cat = extracted.categories[i]
        setSaveProgress(prev => ({ ...prev, catIdx: i + 1 }))

        const { data: catData, error: catErr } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurantId,
            name: cat.name,
            emoji: cat.emoji || null,
            display_order: i,
          })
          .select()
          .single()

        if (catErr || !catData) {
          failedCats++
          failedItems += cat.items.length
          continue
        }

        for (let j = 0; j < cat.items.length; j++) {
          const item = cat.items[j]
          itemsDone++
          setSaveProgress(prev => ({ ...prev, itemIdx: itemsDone }))

          const { data: itemData, error: itemErr } = await supabase
            .from('menu_items')
            .insert({
              category_id: catData.id,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              available: true,
              display_order: j,
              image_url: item._imageUrl || null,
            })
            .select()
            .single()

          if (itemErr || !itemData) {
            failedItems++
            continue
          }

          if (item.ingredients?.length) {
            await supabase.from('ingredients').insert(
              item.ingredients.map(name => ({
                menu_item_id: itemData.id,
                name,
              }))
            )
          }

          if (item._allergenIds?.length) {
            await supabase.from('menu_item_allergens').insert(
              item._allergenIds.map(allergen_id => ({
                menu_item_id: itemData.id,
                allergen_id,
              }))
            )
          }
        }
      }

      if (failedCats > 0 || failedItems > 0) {
        toast.warning(`Importación parcial: ${failedCats} categorías y ${failedItems} platos no se pudieron guardar.`)
      } else {
        toast.success('Carta importada correctamente ✓')
      }
      setStep('done')
    } catch {
      toast.error('Error guardando en base de datos')
      setError('Error guardando en base de datos')
      setStep('preview')
    }
  }

  // ─── STEP: INPUT ───
  if (step === 'input') {
    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar carta con IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sube una foto, un PDF o pega el texto de tu carta. La IA extraerá los platos automáticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('image')}
              className="cursor-pointer"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Foto de carta
            </Button>
            <Button
              variant={mode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('text')}
              className="cursor-pointer"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Pegar texto
            </Button>
            <Button
              variant={mode === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('pdf')}
              className="cursor-pointer"
            >
              <FileUp className="w-4 h-4 mr-1.5" />
              PDF
            </Button>
          </div>

          {mode === 'image' ? (
            <div className="space-y-3">
              <Label>Sube una foto o captura de tu carta</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
              />
              {imagePreview && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview carta"
                    className="max-h-64 rounded-lg border border-border object-contain mx-auto"
                  />
                  <button
                    className="absolute top-2 right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                    onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : mode === 'pdf' ? (
            <div className="space-y-3">
              <Label>Sube tu carta en PDF</Label>
              <div
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors bg-muted/30"
                onClick={() => pdfRef.current?.click()}
              >
                <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Haz clic para seleccionar un PDF</p>
                <p className="text-xs text-muted-foreground mt-1">Digital o escaneado · Máx. 20 MB</p>
                <input
                  ref={pdfRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 20 * 1024 * 1024) {
                      setError('El PDF es demasiado grande (máx. 20 MB).')
                      e.target.value = ''
                      setPdfFileName(null)
                      return
                    }
                    setError('')
                    setPdfFileName(file.name)
                  }}
                />
              </div>
              {pdfFileName && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-primary" />
                  {pdfFileName}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Pega aquí el texto de tu carta</Label>
              <Textarea
                placeholder={"ENTRANTES\nEnsalada César - 9.50€\nCroquetas caseras - 7.00€\n\nPRINCIPALES\nEntrecot de ternera - 18.00€\nMerluza a la plancha - 15.50€"}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
          )}

          <Button
            onClick={handleExtract}
            disabled={
              mode === 'image' ? !imagePreview :
              mode === 'pdf' ? !pdfFileName :
              !textContent.trim()
            }
            className="w-full cursor-pointer"
            size="lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Extraer carta con IA
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: LOADING ───
  if (step === 'loading') {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary animate-spin" />
          {pdfProgress ? (
            <>
              <p className="text-lg font-medium text-foreground">Extrayendo carta del PDF...</p>
              <div className="max-w-xs mx-auto mt-6 space-y-2">
                <Progress value={Math.round((pdfProgress.current / pdfProgress.total) * 100)} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Página {pdfProgress.current} de {pdfProgress.total}
                  {pdfProgress.itemsFound > 0 && (
                    <> · {pdfProgress.itemsFound} platos encontrados</>
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-foreground">Analizando tu carta...</p>
              <p className="text-sm text-muted-foreground mt-2">La IA está extrayendo los platos y detectando alérgenos. Esto puede tardar unos segundos.</p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: PREVIEW ───
  if (step === 'preview' && extracted) {
    const totalItems = extracted.categories.reduce((acc, c) => acc + c.items.length, 0)

    return (
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Se encontraron {extracted.categories.length} categorías y {totalItems} platos
                </p>
                <p className="text-sm text-muted-foreground">
                  Revisa y edita el resultado antes de guardar. Puedes modificar cualquier campo, alérgenos y fotos.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('input'); setExtracted(null) }} className="cursor-pointer">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Volver
                </Button>
                <Button onClick={handleSave} className="cursor-pointer">
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {extracted.categories.map((cat, catIdx) => (
          <Card key={catIdx}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    value={cat.emoji}
                    onChange={e => updateCategory(catIdx, { emoji: e.target.value })}
                    className="w-12 text-center px-1"
                    placeholder="🍕"
                  />
                  <Input
                    value={cat.name}
                    onChange={e => updateCategory(catIdx, { name: e.target.value })}
                    className="flex-1 font-serif font-semibold"
                    placeholder="Nombre categoría"
                  />
                  <Badge variant="secondary" className="text-xs font-normal shrink-0">{cat.items.length} platos</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => removeCategory(catIdx)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cat.items.map((item, itemIdx) => {
                  const itemKey = `${catIdx}-${itemIdx}`
                  const isExpanded = expandedItems.has(itemKey)
                  const allergenCount = item._allergenIds?.length ?? 0

                  return (
                    <div
                      key={itemIdx}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      {/* Item header */}
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3 flex-1 min-w-0">
                          {/* Image thumbnail or upload */}
                          {item._imageUrl ? (
                            <div className="relative shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item._imageUrl}
                                alt={item.name}
                                className="w-14 h-14 rounded-lg object-cover border border-border"
                              />
                              <button
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                                onClick={() => {
                                  setExtracted(prev => {
                                    if (!prev) return prev
                                    return {
                                      categories: prev.categories.map((c, ci) =>
                                        ci === catIdx
                                          ? { ...c, items: c.items.map((it, ii) => ii === itemIdx ? { ...it, _imageUrl: undefined } : it) }
                                          : c
                                      ),
                                    }
                                  })
                                }}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                              {uploadingImage === itemKey ? (
                                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                              ) : (
                                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0]
                                  if (f) handleImageUpload(catIdx, itemIdx, f)
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          )}

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Input
                                value={item.name}
                                onChange={e => updateItem(catIdx, itemIdx, { name: e.target.value })}
                                className="flex-1 h-8 text-sm font-medium"
                                placeholder="Nombre del plato"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price || ''}
                                  onChange={e => updateItem(catIdx, itemIdx, { price: parseFloat(e.target.value) || 0 })}
                                  className="w-20 h-8 text-sm text-right tabular-nums"
                                  placeholder="0.00"
                                />
                                <span className="text-sm text-muted-foreground">€</span>
                              </div>
                            </div>
                            <Input
                              value={item.description ?? ''}
                              onChange={e => updateItem(catIdx, itemIdx, { description: e.target.value || null })}
                              className="h-7 text-xs text-muted-foreground"
                              placeholder="Descripción (opcional)"
                            />
                            <Input
                              value={ingredientTexts[itemKey] ?? item.ingredients?.join(', ') ?? ''}
                              onChange={e => setIngredientTexts(prev => ({ ...prev, [itemKey]: e.target.value }))}
                              onBlur={() => {
                                const text = ingredientTexts[itemKey]
                                if (text != null) {
                                  updateItem(catIdx, itemIdx, {
                                    ingredients: text.split(',').map(s => s.trim()).filter(Boolean)
                                  })
                                }
                              }}
                              className="h-7 text-xs text-muted-foreground"
                              placeholder="Ingredientes separados por comas"
                            />
                            {/* Allergen summary badges */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {allergenCount > 0 ? (
                                item._allergenIds?.map(aId => {
                                  const a = allergens.find(al => al.id === aId)
                                  if (!a) return null
                                  return (
                                    <Badge key={aId} variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      {a.icon} {a.name}
                                    </Badge>
                                  )
                                })
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Sin alérgenos detectados</span>
                              )}
                              <button
                                className="text-[10px] text-primary hover:underline cursor-pointer ml-1"
                                onClick={() => toggleExpanded(itemKey)}
                              >
                                {isExpanded ? (
                                  <span className="flex items-center gap-0.5"><ChevronUp className="w-3 h-3" /> Cerrar</span>
                                ) : (
                                  <span className="flex items-center gap-0.5"><ChevronDown className="w-3 h-3" /> Editar alérgenos</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          className="text-muted-foreground hover:text-destructive ml-2 shrink-0 cursor-pointer transition-colors"
                          onClick={() => removeItem(catIdx, itemIdx)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded allergen editor */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-border/50">
                          <Label className="text-xs text-muted-foreground mb-2 block">Alérgenos</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {allergens.map((a) => (
                              <div key={a.id} className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`import-allergen-${catIdx}-${itemIdx}-${a.id}`}
                                  checked={item._allergenIds?.includes(a.id) ?? false}
                                  onCheckedChange={() => toggleAllergen(catIdx, itemIdx, a.id)}
                                />
                                <label
                                  htmlFor={`import-allergen-${catIdx}-${itemIdx}-${a.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  {a.icon} {a.name}
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

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setStep('input'); setExtracted(null) }} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">
            <Save className="w-4 h-4 mr-1.5" />
            Guardar {totalItems} platos
          </Button>
        </div>
      </div>
    )
  }

  // ─── STEP: SAVING ───
  if (step === 'saving') {
    const pct = saveProgress.totalItems > 0
      ? Math.round((saveProgress.itemIdx / saveProgress.totalItems) * 100)
      : 0

    return (
      <Card>
        <CardContent className="py-16 space-y-6">
          <div className="text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">Guardando carta...</p>
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <Progress value={pct} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Guardando categoría {saveProgress.catIdx} de {saveProgress.totalCats}
              {saveProgress.totalItems > 0 && (
                <> · plato {saveProgress.itemIdx} de {saveProgress.totalItems}</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: DONE ───
  return (
    <Card className="border-primary/20">
      <CardContent className="py-16 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-primary" />
        <p className="text-xl font-serif text-foreground">¡Carta importada!</p>
        <p className="text-sm text-muted-foreground mt-2">
          Todos los platos se han guardado correctamente.
        </p>
        <Button className="mt-6 cursor-pointer" onClick={onComplete}>
          Ver mi carta
        </Button>
      </CardContent>
    </Card>
  )
}
