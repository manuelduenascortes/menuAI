'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      setError(err instanceof Error ? err.message : 'Error desconocido')
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
    setStep('saving')

    try {
      for (let i = 0; i < extracted.categories.length; i++) {
        const cat = extracted.categories[i]

        // Create category
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

        // Create items in this category
        for (let j = 0; j < cat.items.length; j++) {
          const item = cat.items[j]

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

          // Add ingredients
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

      setStep('done')
    } catch {
      setError('Error guardando en base de datos')
      setStep('preview')
    }
  }

  // ─── STEP: INPUT ───
  if (step === 'input') {
    return (
      <Card className="border-2 border-dashed border-orange-300 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📸 Importar carta con IA
          </CardTitle>
          <p className="text-sm text-gray-500">
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
            >
              📷 Foto de carta
            </Button>
            <Button
              variant={mode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('text')}
            >
              📝 Pegar texto
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
                    className="max-h-64 rounded-lg border object-contain mx-auto"
                  />
                  <button
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                    onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  >
                    ✕
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
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          )}

          <Button
            onClick={handleExtract}
            disabled={mode === 'image' ? !imagePreview : !textContent.trim()}
            className="w-full"
            size="lg"
          >
            🤖 Extraer carta con IA
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: LOADING ───
  if (step === 'loading') {
    return (
      <Card className="border-2 border-orange-300">
        <CardContent className="py-16 text-center">
          <div className="text-5xl mb-4 animate-bounce">🤖</div>
          <p className="text-lg font-medium">Analizando tu carta...</p>
          <p className="text-sm text-gray-500 mt-2">La IA está extrayendo los platos. Esto puede tardar unos segundos.</p>
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: PREVIEW ───
  if (step === 'preview' && extracted) {
    const totalItems = extracted.categories.reduce((acc, c) => acc + c.items.length, 0)

    return (
      <div className="space-y-4">
        <Card className="border-green-300 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">
                  ✅ Se encontraron {extracted.categories.length} categorías y {totalItems} platos
                </p>
                <p className="text-sm text-green-600">
                  Revisa el resultado. Puedes eliminar lo que no quieras antes de guardar.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('input'); setExtracted(null) }}>
                  ← Volver
                </Button>
                <Button onClick={handleSave} size="lg">
                  💾 Guardar todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {extracted.categories.map((cat, catIdx) => (
          <Card key={catIdx}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {cat.emoji} {cat.name}
                  <Badge variant="secondary">{cat.items.length} platos</Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeCategory(catIdx)}
                >
                  Eliminar categoría
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.name}</span>
                        {item.price > 0 && (
                          <span className="text-orange-600 font-semibold">{item.price.toFixed(2)}€</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                      {item.ingredients?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.ingredients.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-red-400 hover:text-red-600 ml-2 shrink-0"
                      onClick={() => removeItem(catIdx, itemIdx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setStep('input'); setExtracted(null) }}>
            ← Volver
          </Button>
          <Button onClick={handleSave} size="lg">
            💾 Guardar {totalItems} platos
          </Button>
        </div>
      </div>
    )
  }

  // ─── STEP: SAVING ───
  if (step === 'saving') {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="text-5xl mb-4 animate-spin">💾</div>
          <p className="text-lg font-medium">Guardando carta...</p>
        </CardContent>
      </Card>
    )
  }

  // ─── STEP: DONE ───
  return (
    <Card className="border-green-300 bg-green-50/50">
      <CardContent className="py-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-bold text-green-800">¡Carta importada!</p>
        <p className="text-sm text-green-600 mt-2">
          Todos los platos se han guardado correctamente.
        </p>
        <Button className="mt-6" onClick={onComplete}>
          Ver mi carta
        </Button>
      </CardContent>
    </Card>
  )
}
