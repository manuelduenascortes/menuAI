'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import QRCode from 'qrcode'
import type { Restaurant, Table } from '@/lib/types'

interface Props {
  restaurant: Restaurant
  initialTables: Table[]
}

export default function MesasManager({ restaurant, initialTables }: Props) {
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [newNumber, setNewNumber] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  function getTableUrl(tableId: string) {
    return `${baseUrl}/${restaurant.slug}/mesa/${tableId}`
  }

  async function generateQR(tableId: string): Promise<string> {
    const url = getTableUrl(tableId)
    return QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })
  }

  async function addTable() {
    const num = parseInt(newNumber)
    if (!num || num < 1) return
    setLoading(true)
    setError('')

    // Generar QR
    const tableIdTemp = crypto.randomUUID()
    const qrDataUrl = await generateQR(tableIdTemp)

    const { data, error: dbError } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurant.id,
        number: num,
        label: newLabel || null,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message.includes('unique') ? `La mesa ${num} ya existe.` : dbError.message)
      setLoading(false)
      return
    }

    // Actualizar con QR real usando el ID real
    const realQr = await generateQR(data.id)
    await supabase.from('tables').update({ qr_code_url: realQr }).eq('id', data.id)

    setTables([...tables, { ...data, qr_code_url: realQr }].sort((a, b) => a.number - b.number))
    setNewNumber('')
    setNewLabel('')
    setLoading(false)
  }

  async function deleteTable(tableId: string) {
    if (!confirm('¿Eliminar esta mesa?')) return
    await supabase.from('tables').delete().eq('id', tableId)
    setTables(tables.filter(t => t.id !== tableId))
  }

  function downloadQR(table: Table) {
    if (!table.qr_code_url) return
    const link = document.createElement('a')
    link.href = table.qr_code_url
    link.download = `qr-mesa-${table.number}-${restaurant.slug}.png`
    link.click()
  }

  async function addMultipleTables() {
    const count = parseInt(prompt('¿Cuántas mesas quieres añadir? (se añadirán a partir de la última)') ?? '0')
    if (!count || count < 1) return

    const lastNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0
    setLoading(true)

    for (let i = 1; i <= count; i++) {
      const num = lastNumber + i
      const { data, error } = await supabase
        .from('tables')
        .insert({ restaurant_id: restaurant.id, number: num })
        .select()
        .single()

      if (!error && data) {
        const qr = await generateQR(data.id)
        await supabase.from('tables').update({ qr_code_url: qr }).eq('id', data.id)
        setTables(prev => [...prev, { ...data, qr_code_url: qr }].sort((a, b) => a.number - b.number))
      }
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Añadir mesa */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label>Número de mesa</Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={newNumber}
                onChange={e => setNewNumber(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-32">
              <Label>Etiqueta (opcional)</Label>
              <Input
                placeholder="Ej: Terraza, VIP..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
            </div>
            <Button onClick={addTable} disabled={loading || !newNumber}>
              {loading ? 'Generando...' : '+ Añadir mesa'}
            </Button>
            <Button variant="outline" onClick={addMultipleTables} disabled={loading}>
              + Añadir varias
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{tables.length} mesas configuradas</p>
        <p className="text-xs text-gray-400">
          URL formato: <span className="font-mono">{baseUrl}/{restaurant.slug}/mesa/[id]</span>
        </p>
      </div>

      {/* Grid de mesas */}
      {tables.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🪑</div>
          <p>No hay mesas configuradas. Añade la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <Card key={table.id} className="overflow-hidden">
              <div className="bg-orange-50 p-4 text-center border-b">
                <div className="text-2xl font-bold text-orange-700">Mesa {table.number}</div>
                {table.label && <Badge variant="secondary" className="mt-1">{table.label}</Badge>}
              </div>
              <CardContent className="p-3 space-y-3">
                {table.qr_code_url ? (
                  <div className="flex justify-center">
                    <img
                      src={table.qr_code_url}
                      alt={`QR Mesa ${table.number}`}
                      className="w-32 h-32 rounded"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded mx-auto flex items-center justify-center text-gray-400 text-sm">
                    Sin QR
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center font-mono break-all">
                  {getTableUrl(table.id)}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => downloadQR(table)}
                    disabled={!table.qr_code_url}
                  >
                    ⬇ Descargar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteTable(table.id)}
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
