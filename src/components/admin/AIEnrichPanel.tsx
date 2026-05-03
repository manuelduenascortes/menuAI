'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import type { Allergen, DietaryTag, Restaurant } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface MenuItem {
  id: string
  name: string
  description?: string
  image_url?: string
  menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
  menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
}

interface CategoryWithItems {
  id: string
  name: string
  emoji?: string
  menu_items: MenuItem[]
}

interface Props {
  restaurant: Restaurant
  categories: CategoryWithItems[]
  allergens: Allergen[]
  onClose: () => void
}

type Phase = 'select' | 'processing' | 'done'
type Fields = { photo: boolean; description: boolean; allergens: boolean }
type ItemResult = { name: string; status: 'waiting' | 'processing' | 'done' | 'error'; filled: string[] }

interface EnrichResponse {
  description?: string | null
  imageUrl?: string | null
  allergenNames?: string[]
}

function StatusPill({ has, label }: { has: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        has ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label} {has ? '✓' : '✗'}
    </span>
  )
}

export default function AIEnrichPanel({ restaurant, categories, allergens, onClose }: Props) {
  const allItems = categories.flatMap((c) => c.menu_items)

  const [phase, setPhase] = useState<Phase>('select')
  const [fields, setFields] = useState<Fields>({ photo: true, description: true, allergens: true })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, ItemResult>>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectWithoutPhoto() {
    setSelectedItems(new Set(allItems.filter((i) => !i.image_url).map((i) => i.id)))
  }
  function selectWithoutDescription() {
    setSelectedItems(new Set(allItems.filter((i) => !i.description).map((i) => i.id)))
  }
  function selectWithoutAllergens() {
    setSelectedItems(new Set(allItems.filter((i) => i.menu_item_allergens.length === 0).map((i) => i.id)))
  }
  function selectAll() {
    setSelectedItems(new Set(allItems.map((i) => i.id)))
  }
  function selectNone() {
    setSelectedItems(new Set())
  }

  function toggleField(key: keyof Fields) {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleProcess() {
    const queue = allItems.filter((i) => selectedItems.has(i.id))
    if (queue.length === 0) return

    const initialResults: Record<string, ItemResult> = {}
    for (const item of queue) {
      initialResults[item.id] = { name: item.name, status: 'waiting', filled: [] }
    }
    setResults(initialResults)
    setCurrentIndex(0)
    setPhase('processing')

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      setCurrentIndex(i)
      setResults((prev) => ({ ...prev, [item.id]: { ...prev[item.id], status: 'processing' } }))

      try {
        const response = await fetch('/api/products/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name, restaurantId: restaurant.id }),
        })
        const data: EnrichResponse = await response.json()

        const updates: { description?: string; image_url?: string } = {}
        const filled: string[] = []

        if (fields.description && data.description && !item.description) {
          updates.description = data.description
          filled.push('descripción')
        }

        if (fields.photo && data.imageUrl && !item.image_url) {
          updates.image_url = data.imageUrl
          filled.push('foto')
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('menu_items').update(updates).eq('id', item.id)
        }

        if (fields.allergens && data.allergenNames && data.allergenNames.length > 0) {
          const currentIds = item.menu_item_allergens.map((ma) => ma.allergen_id)
          const newIds = data.allergenNames
            .map((name) => allergens.find((a) => a.name === name)?.id)
            .filter((id): id is string => Boolean(id) && !currentIds.includes(id!))

          if (newIds.length > 0) {
            await supabase
              .from('menu_item_allergens')
              .insert(newIds.map((allergen_id) => ({ menu_item_id: item.id, allergen_id })))
            filled.push('alérgenos')
          }
        }

        setResults((prev) => ({ ...prev, [item.id]: { name: item.name, status: 'done', filled } }))
      } catch {
        setResults((prev) => ({ ...prev, [item.id]: { name: item.name, status: 'error', filled: [] } }))
      }
    }

    await fetch('/api/admin/menu/invalidate-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: restaurant.slug }),
    }).catch(() => {})
    setPhase('done')
  }

  const resultsList = Object.values(results)
  const doneCount = resultsList.filter((r) => r.status === 'done' && r.filled.length > 0).length
  const unchangedCount = resultsList.filter((r) => r.status === 'done' && r.filled.length === 0).length
  const errorCount = resultsList.filter((r) => r.status === 'error').length
  const progressPct = resultsList.length > 0
    ? Math.round((resultsList.filter((r) => r.status === 'done' || r.status === 'error').length / resultsList.length) * 100)
    : 0

  const sortedResults = phase === 'done'
    ? [...resultsList].sort((a, b) => {
        const rank = (r: ItemResult) => {
          if (r.status === 'done' && r.filled.length > 0) return 0
          if (r.status === 'error') return 1
          return 2
        }
        return rank(a) - rank(b)
      })
    : resultsList

  if (phase !== 'select') {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-xl">
          {phase === 'processing'
            ? `Procesando... ${Math.min(currentIndex + 1, resultsList.length)}/${resultsList.length}`
            : '¡Completado!'}
        </h2>

        {phase === 'processing' && (
          <Progress value={progressPct} className="h-2" />
        )}

        {phase === 'done' && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="text-green-700">{doneCount} enriquecidos</span>
            {unchangedCount > 0 && <span>· {unchangedCount} sin cambios</span>}
            {errorCount > 0 && <span className="text-destructive">· {errorCount} errores</span>}
          </div>
        )}

        <div className="max-h-96 overflow-y-auto space-y-1 rounded-lg border border-border p-3">
          {sortedResults.map((result) => (
            <div key={result.name} className="flex items-center gap-2 py-1 text-sm">
              {result.status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
              {result.status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
              {result.status === 'processing' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
              {result.status === 'waiting' && <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className={result.status === 'waiting' ? 'text-muted-foreground' : ''}>
                {result.name}
                {result.filled.length > 0 && (
                  <span className="ml-2 text-muted-foreground">— {result.filled.join(' + ')}</span>
                )}
                {result.status === 'done' && result.filled.length === 0 && (
                  <span className="ml-2 text-muted-foreground">— sin cambios</span>
                )}
                {result.status === 'error' && (
                  <span className="ml-2 text-destructive">— error</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {phase === 'done' && (
          <div className="flex justify-center pt-2">
            <Button onClick={onClose} className="cursor-pointer px-8">
              {doneCount > 0 ? 'Cerrar y actualizar' : 'Cerrar'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">Enriquecer carta con IA</h2>
        <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
          <X className="mr-1.5 h-4 w-4" />
          Cerrar
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Las descripciones, fotos y alérgenos pueden ser incorrectos debido al uso de IA. Revisa siempre antes de publicar.</span>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">¿Qué rellenar? <span className="font-normal text-muted-foreground">(solo campos vacíos)</span></p>
        <div className="flex flex-wrap gap-4">
          {([
            { key: 'photo' as const, label: 'Foto oficial' },
            { key: 'description' as const, label: 'Descripción' },
            { key: 'allergens' as const, label: 'Alérgenos' },
          ]).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={fields[key]} onCheckedChange={() => toggleField(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Selección rápida</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectWithoutPhoto} className="cursor-pointer h-7 text-xs">Sin foto</Button>
          <Button variant="outline" size="sm" onClick={selectWithoutDescription} className="cursor-pointer h-7 text-xs">Sin descripción</Button>
          <Button variant="outline" size="sm" onClick={selectWithoutAllergens} className="cursor-pointer h-7 text-xs">Sin alérgenos</Button>
          <Separator orientation="vertical" className="h-7" />
          <Button variant="outline" size="sm" onClick={selectAll} className="cursor-pointer h-7 text-xs">Todos</Button>
          <Button variant="ghost" size="sm" onClick={selectNone} className="cursor-pointer h-7 text-xs">Ninguno</Button>
        </div>
        <p className="text-xs text-muted-foreground">{selectedItems.size} de {allItems.length} productos seleccionados</p>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const categoryIds = category.menu_items.map((i) => i.id)
          const allSelected = categoryIds.length > 0 && categoryIds.every((id) => selectedItems.has(id))
          const someSelected = categoryIds.some((id) => selectedItems.has(id))

          function toggleCategory() {
            setSelectedItems((prev) => {
              const next = new Set(prev)
              if (allSelected) {
                categoryIds.forEach((id) => next.delete(id))
              } else {
                categoryIds.forEach((id) => next.add(id))
              }
              return next
            })
          }

          return (
            <div key={category.id}>
              <label className="mb-2 flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                  onCheckedChange={toggleCategory}
                  className={someSelected && !allSelected ? 'opacity-60' : ''}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {category.emoji && <span className="mr-1">{category.emoji}</span>}
                  {category.name}
                </span>
              </label>
              <div className="space-y-1 pl-6">
                {category.menu_items.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:bg-muted/50 has-[:checked]:border-primary/20 has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <span className="flex-1 text-sm">{item.name}</span>
                    <div className="flex shrink-0 gap-1">
                      <StatusPill has={Boolean(item.image_url)} label="Foto" />
                      <StatusPill has={Boolean(item.description)} label="Desc" />
                      <StatusPill has={item.menu_item_allergens.length > 0} label="Alg" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background pt-4">
        <Button
          className="w-full cursor-pointer"
          disabled={selectedItems.size === 0}
          onClick={handleProcess}
        >
          {selectedItems.size === 0
            ? 'Selecciona productos para enriquecer'
            : `Enriquecer ${selectedItems.size} producto${selectedItems.size === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
