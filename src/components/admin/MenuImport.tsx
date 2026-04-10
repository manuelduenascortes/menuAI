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
import { Camera, FileText, Sparkles, Trash2, ArrowLeft, Save, Loader2, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'

interface ExtractedItem {
  name: string
  description: string | null
  price: number
  ingredients: string[]
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

export default function MenuImport({ restaurantId, onComplete }: {
  restaurantId: string
  onComplete: () => void
}) {
  const [step, setStep] = useState<Step>('input')
  const [mode, setMode] = useState<'image' | 'text'>('image')
  const [textContent, setTextContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedMenu | null>(null)
  const [error, setError] = useState('')
  const [saveProgress, setSaveProgress] = useState({ catIdx: 0, itemIdx: 0, totalCats: 0, totalItems: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function handleExtract() {
    setError('')
    setStep('loading')

    const body = mode === 'image'
      ? { type: 'image', content: imagePreview }
      : { type: 'text', content: textContent }

    try {
      const res = await fetch('/api/menu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error procesando')
      }

      const data: ExtractedMenu = await res.json()

      if (!data.categories?.length) {
        throw new Error('No se encontraron platos en la carta')
      }

      setExtracted(data)
      setStep('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      toast.error(msg)
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

  async function handleSave() {
    if (!extracted) return
    const totalItems = extracted.categories.reduce((acc, c) => acc + c.items.length, 0)
    setSaveProgress({ catIdx: 0, itemIdx: 0, totalCats: extracted.categories.length, totalItems })
    setStep('saving')

    try {
      let itemsDone = 0
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

        if (catErr || !catData) continue

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
            })
            .select()
            .single()

          if (itemErr || !itemData) continue

          if (item.ingredients?.length) {
            await supabase.from('ingredients').insert(
              item.ingredients.map(name => ({
                menu_item_id: itemData.id,
                name,
              }))
            )
          }
        }
      }

      toast.success('Carta importada correctamente ✓')
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
            Sube una foto de tu carta en papel o pega el texto. La IA extraerá los platos automáticamente.
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
            disabled={mode === 'image' ? !imagePreview : !textContent.trim()}
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
          <p className="text-lg font-medium text-foreground">Analizando tu carta...</p>
          <p className="text-sm text-muted-foreground mt-2">La IA está extrayendo los platos. Esto puede tardar unos segundos.</p>
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
                  Revisa el resultado. Puedes eliminar lo que no quieras antes de guardar.
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  {cat.emoji} {cat.name}
                  <Badge variant="secondary" className="text-xs font-normal">{cat.items.length} platos</Badge>
                </CardTitle>
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
                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.price > 0 && (
                          <span className="text-primary font-semibold tabular-nums">{item.price.toFixed(2)}€</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      {item.ingredients?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.ingredients.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive ml-2 shrink-0 cursor-pointer transition-colors"
                      onClick={() => removeItem(catIdx, itemIdx)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
