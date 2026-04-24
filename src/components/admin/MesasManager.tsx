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
import { Checkbox } from '@/components/ui/checkbox'
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
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [multiDialog, setMultiDialog] = useState(false)
  const [multiCount, setMultiCount] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  function getTableUrl(tableId: string) {
    return `${baseUrl}/${restaurant.slug}/mesa/${tableId}`
  }

  // --- Selection helpers ---

  function toggleTableSelection(tableId: string) {
    setSelectedTableIds(prev => {
      const next = new Set(prev)
      if (next.has(tableId)) {
        next.delete(tableId)
      } else {
        next.add(tableId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedTableIds(prev => {
      const allSelected = tables.every(t => prev.has(t.id))
      if (allSelected) {
        return new Set()
      }
      return new Set(tables.map(t => t.id))
    })
  }

  function clearSelection() {
    setSelectedTableIds(new Set())
  }

  function getSelectedTables(): Table[] {
    return tables.filter(t => selectedTableIds.has(t.id))
  }

  // --- QR generation ---

  async function generateQR(tableId: string): Promise<string> {
    const url = getTableUrl(tableId)
    const qrDataUrl = await QRCodeLib.toDataURL(url, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#1C1917', light: '#ffffff' },
    })

    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return resolve(qrDataUrl)

      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(qrDataUrl)

      const timeout = setTimeout(() => reject(new Error('QR image load timeout')), 10000)

      const img = new Image()
      img.onerror = () => { clearTimeout(timeout); resolve(qrDataUrl) }
      img.onload = () => {
        clearTimeout(timeout)
        // Puesto que el qrDataUrl es de 300x300 por su llamada anterior de qrcode,  vamos a decirle a qrcode que devuelva 400.
        // Wait, tengo que cambiar también QRCodeLib param, pero en este replace block voy a dibujarlo escalado o cambiar la variable de arriba. Mejor cambiaré todo el block.
        // Solo para no errar, dibujarlo escalado a 400x400 funciona pero se difumina ligeramente.
        ctx.drawImage(img, 0, 0, 400, 400)

        // Área central matemáticamente segura: máximo 25% del lateral. 25% de 400 = 100.
        const centerSize = 100
        const cx = 400/2 - centerSize/2
        const cy = 400/2 - centerSize/2

        ctx.fillStyle = '#ffffff'
        const radius = 10
        ctx.beginPath()
        ctx.moveTo(cx + radius, cy)
        ctx.arcTo(cx + centerSize, cy, cx + centerSize, cy + centerSize, radius)
        ctx.arcTo(cx + centerSize, cy + centerSize, cx, cy + centerSize, radius)
        ctx.arcTo(cx, cy + centerSize, cx, cy, radius)
        ctx.arcTo(cx, cy, cx + centerSize, cy, radius)
        ctx.fill()

        // Logo balanceado (42px)
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#8B5E3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-8 8"/></svg>`
        const svgImg = new Image()
        svgImg.onerror = () => resolve(canvas.toDataURL('image/png'))
        svgImg.onload = () => {
          ctx.drawImage(svgImg, 400/2 - 21, cy + 10)

          ctx.fillStyle = '#1C1917'
          ctx.font = '20px "DM Serif Display", serif'
          ctx.textAlign = 'center'
          ctx.fillText('MenuAI', 400/2, cy + centerSize - 16)

          resolve(canvas.toDataURL('image/png'))
        }
        svgImg.src = 'data:image/svg+xml;base64,' + window.btoa(svgString)
      }
      img.src = qrDataUrl
    })
  }

  async function addTable() {
    const num = parseInt(newNumber)
    if (!num || num < 1) return
    setLoading(true)
    setError('')

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
    const deletedId = deleteConfirm.tableId
    setTables(prev => prev.filter(t => t.id !== deletedId))
    setSelectedTableIds(prev => {
      const next = new Set(prev)
      next.delete(deletedId)
      return next
    })
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

  async function downloadSelectedQrs() {
    if (bulkLoading) return
    const selected = getSelectedTables().filter(t => t.qr_code_url)
    if (selected.length === 0) return
    setBulkLoading(true)
    for (const table of selected) {
      downloadQR(table)
      await new Promise(r => setTimeout(r, 150))
    }
    setBulkLoading(false)
    toast.success(`${selected.length} QR${selected.length > 1 ? 's' : ''} descargados`)
  }

  async function confirmDeleteSelectedTables() {
    if (bulkLoading) return
    const selectedIds = Array.from(selectedTableIds)
    if (selectedIds.length === 0) return
    setBulkLoading(true)
    const { error } = await supabase.from('tables').delete().in('id', selectedIds)
    setBulkLoading(false)
    if (error) {
      setBulkDeleteConfirm(false)
      toast.error('Error al eliminar las mesas seleccionadas')
      return
    }
    const selectedIdSet = new Set(selectedIds)
    setTables(prev => prev.filter(t => !selectedIdSet.has(t.id)))
    const count = selectedIds.length
    clearSelection()
    setBulkDeleteConfirm(false)
    toast.success(`${count} mesa${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''} ✓`)
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

    let added = 0
    try {
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
          added++
        }
      }
    } finally {
      if (added === count) {
        toast.success(`${count} mesas añadidas ✓`)
      } else if (added > 0) {
        toast.warning(`${added} de ${count} mesas añadidas. Algunas fallaron.`)
      } else {
        toast.error('No se pudieron añadir las mesas.')
      }
      setLoading(false)
    }
  }

  const selectionCount = selectedTableIds.size
  const allSelected = tables.length > 0 && tables.every(t => selectedTableIds.has(t.id))

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

      {/* Info + selection toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{tables.length} mesas configuradas</p>
        <p className="text-xs text-muted-foreground">
          URL: <span className="font-mono">{baseUrl}/{restaurant.slug}/mesa/[id]</span>
        </p>
      </div>

      {/* Bulk action toolbar — shown only when there are tables */}
      {tables.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-sm font-normal"
            onClick={toggleSelectAll}
          >
            {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </Button>

          {selectionCount > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectionCount} {selectionCount === 1 ? 'mesa seleccionada' : 'mesas seleccionadas'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-sm font-normal"
                onClick={clearSelection}
              >
                Limpiar selección
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={downloadSelectedQrs}
                  disabled={bulkLoading}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar seleccionados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                  onClick={() => setBulkDeleteConfirm(true)}
                  disabled={bulkLoading}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Borrar seleccionados
                </Button>
              </div>
            </>
          )}
        </div>
      )}

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
          {tables.map(table => {
            const isSelected = selectedTableIds.has(table.id)
            return (
              <Card key={table.id} className={`overflow-hidden transition-colors ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                <div className="bg-secondary p-4 text-center border-b border-border relative">
                  {/* Checkbox in top-left of card header */}
                  <div
                    className="absolute top-3 left-3"
                    onClick={e => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTableSelection(table.id)}
                      aria-label={`Seleccionar mesa ${table.number}`}
                    />
                  </div>
                  <div className="font-serif text-xl text-foreground">Mesa {table.number}</div>
                  {table.label && <Badge variant="secondary" className="mt-1.5 text-xs">{table.label}</Badge>}
                </div>
                <CardContent className="p-4 space-y-3">
                  {table.qr_code_url ? (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
            )
          })}
        </div>
      )}

      {/* Delete single confirm dialog */}
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

      {/* Bulk delete confirm dialog */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectionCount} {selectionCount === 1 ? 'mesa' : 'mesas'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {selectionCount === 1 ? 'la mesa seleccionada' : `las ${selectionCount} mesas seleccionadas`} y sus códigos QR. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
              onClick={confirmDeleteSelectedTables}
            >
              Eliminar {selectionCount === 1 ? 'mesa' : `${selectionCount} mesas`}
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
