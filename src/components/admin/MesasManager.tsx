'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Download, Trash2, Plus, QrCode, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import QRCodeLib from 'qrcode'
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; tableId: string }>({ open: false, tableId: '' })
  const [multiDialog, setMultiDialog] = useState(false)
  const [multiCount, setMultiCount] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  function getTableUrl(tableId: string) {
    return `${baseUrl}/${restaurant.slug}/mesa/${tableId}`
  }

  async function generateQR(tableId: string): Promise<string> {
    const url = getTableUrl(tableId)
    return QRCodeLib.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1C1917', light: '#ffffff' },
    })
  }

  async function addTable() {
    const num = parseInt(newNumber)
    if (!num || num < 1) return
    setLoading(true)
    setError('')

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
      toast.error(dbError.message.includes('unique') ? `La mesa ${num} ya existe` : 'Error al crear mesa')
      setLoading(false)
      return
    }

    const realQr = await generateQR(data.id)
    await supabase.from('tables').update({ qr_code_url: realQr }).eq('id', data.id)

    setTables([...tables, { ...data, qr_code_url: realQr }].sort((a, b) => a.number - b.number))
    setNewNumber('')
    setNewLabel('')
    toast.success('Mesa creada ✓')
    setLoading(false)
  }

  function deleteTable(tableId: string) {
    setDeleteConfirm({ open: true, tableId })
  }

  async function confirmDeleteTable() {
    const { error } = await supabase.from('tables').delete().eq('id', deleteConfirm.tableId)
    if (error) { toast.error('Error al eliminar mesa'); return }
    setTables(prev => prev.filter(t => t.id !== deleteConfirm.tableId))
    toast.success('Mesa eliminada')
    setDeleteConfirm({ open: false, tableId: '' })
  }

  function downloadQR(table: Table) {
    if (!table.qr_code_url) return
    const link = document.createElement('a')
    link.href = table.qr_code_url
    link.download = `qr-mesa-${table.number}-${restaurant.slug}.png`
    link.click()
  }

  async function copyTableUrl(tableId: string) {
    await navigator.clipboard.writeText(getTableUrl(tableId))
    setCopiedId(tableId)
    toast.success('Enlace copiado ✓')
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function doAddMultipleTables() {
    const count = parseInt(multiCount)
    if (!count || count < 1) return
    setMultiDialog(false)
    setMultiCount('')

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
    toast.success(`${count} mesas añadidas ✓`)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Add table form */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5 flex-1 min-w-32">
              <Label>Etiqueta (opcional)</Label>
              <Input
                placeholder="Ej: Terraza, VIP..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
            </div>
            <Button onClick={addTable} disabled={loading || !newNumber} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              {loading ? 'Generando...' : 'Añadir mesa'}
            </Button>
            <Button variant="outline" onClick={() => setMultiDialog(true)} disabled={loading} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              Añadir varias
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tables.length} mesas configuradas</p>
        <p className="text-xs text-muted-foreground">
          URL: <span className="font-mono">{baseUrl}/{restaurant.slug}/mesa/[id]</span>
        </p>
      </div>

      {/* Table grid */}
      {tables.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <p className="font-serif text-xl text-foreground mb-2">No hay mesas configuradas</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Crea mesas para generar códigos QR únicos que tus clientes podrán escanear
          </p>
          <Button onClick={() => setMultiDialog(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" />
            Añadir mesas
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <Card key={table.id} className="overflow-hidden">
              <div className="bg-secondary p-4 text-center border-b border-border">
                <div className="font-serif text-xl text-foreground">Mesa {table.number}</div>
                {table.label && <Badge variant="secondary" className="mt-1.5 text-xs">{table.label}</Badge>}
              </div>
              <CardContent className="p-4 space-y-3">
                {table.qr_code_url ? (
                  <div className="flex justify-center">
                    <img
                      src={table.qr_code_url}
                      alt={`QR Mesa ${table.number}`}
                      className="w-32 h-32 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-lg mx-auto flex items-center justify-center text-muted-foreground text-sm">
                    Sin QR
                  </div>
                )}
                <div className="flex items-center justify-center gap-1">
                  <p className="text-[10px] text-muted-foreground text-center font-mono break-all leading-relaxed">
                    {getTableUrl(table.id)}
                  </p>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 cursor-pointer"
                          onClick={() => copyTableUrl(table.id)}
                        >
                          {copiedId === table.id
                            ? <Check className="w-3 h-3 text-green-600" />
                            : <Copy className="w-3 h-3 text-muted-foreground" />
                          }
                        </Button>
                      }
                    />
                    <TooltipContent>Copiar enlace</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 cursor-pointer"
                          onClick={() => downloadQR(table)}
                          disabled={!table.qr_code_url}
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar
                        </Button>
                      }
                    />
                    <TooltipContent>Descargar QR</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive cursor-pointer"
                          onClick={() => deleteTable(table.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Eliminar mesa</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, tableId: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la mesa y su código QR. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
              onClick={confirmDeleteTable}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add multiple tables dialog */}
      <Dialog open={multiDialog} onOpenChange={setMultiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Añadir varias mesas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>¿Cuántas mesas quieres añadir?</Label>
            <p className="text-sm text-muted-foreground">Se añadirán a partir de la última mesa existente.</p>
            <Input
              type="number"
              min="1"
              max="50"
              placeholder="Ej: 10"
              value={multiCount}
              onChange={e => setMultiCount(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMultiDialog(false); setMultiCount('') }} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={doAddMultipleTables} disabled={!multiCount || parseInt(multiCount) < 1} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              Añadir {multiCount && parseInt(multiCount) > 0 ? `${multiCount} mesas` : 'mesas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
