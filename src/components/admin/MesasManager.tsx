'use client'

import { useEffect, useReducer, useState } from 'react'
import QRCodeLib from 'qrcode'
import { toast } from 'sonner'
import { Check, Copy, Download, Link as LinkIcon, Loader2, Plus, QrCode, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import tableSelection from '@/lib/table-selection.cjs'
import type { Restaurant, Table } from '@/lib/types'
import { getAccessModeLabel, supportsGeneralQr, supportsTableQr } from '@/lib/venue-config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

interface Props {
  restaurant: Restaurant
  initialTables: Table[]
}

export default function MesasManager({ restaurant, initialTables }: Props) {
  const { areAllTablesSelected, createSelectionState, reduceTableSelection } = tableSelection
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
  const [selectionState, dispatchSelection] = useReducer(reduceTableSelection, undefined, () => createSelectionState())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [generalQrUrl, setGeneralQrUrl] = useState<string | null>(null)
  const [generalQrLoading, setGeneralQrLoading] = useState(false)

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  const generalUrl = `${baseUrl}/${restaurant.slug}`
  const hasGeneralQr = supportsGeneralQr(restaurant.menu_access_mode)
  const hasTableQr = supportsTableQr(restaurant.menu_access_mode)
  const tableIds = tables.map((table) => table.id)
  const selectionCount = selectionState.selectedTableIds.length
  const selectionMode = selectionState.selectionMode
  const allSelected = areAllTablesSelected(selectionState.selectedTableIds, tableIds)

  useEffect(() => {
    let cancelled = false

    async function loadGeneralQr() {
      if (!hasGeneralQr) return
      setGeneralQrLoading(true)
      try {
        const qr = await generateQrForUrl(generalUrl)
        if (!cancelled) {
          setGeneralQrUrl(qr)
        }
      } finally {
        if (!cancelled) {
          setGeneralQrLoading(false)
        }
      }
    }

    void loadGeneralQr()

    return () => {
      cancelled = true
    }
  }, [generalUrl, hasGeneralQr])

  useEffect(() => {
    dispatchSelection({
      type: 'sync-table-ids',
      tableIds: tables.map((table) => table.id),
    })
  }, [tables])

  function getTableUrl(tableId: string) {
    return `${baseUrl}/${restaurant.slug}/mesa/${tableId}`
  }

  function enterSelectionMode() {
    dispatchSelection({ type: 'enter-selection' })
  }

  function exitSelectionMode() {
    dispatchSelection({ type: 'exit-selection' })
  }

  function toggleTableSelection(tableId: string) {
    dispatchSelection({ type: 'toggle-table', tableId })
  }

  function toggleSelectAll() {
    dispatchSelection({ type: 'toggle-select-all', tableIds })
  }

  function getSelectedTables(): Table[] {
    const selectedIds = new Set(selectionState.selectedTableIds)
    return tables.filter((table) => selectedIds.has(table.id))
  }

  async function generateQrForUrl(url: string): Promise<string> {
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
      img.onerror = () => {
        clearTimeout(timeout)
        resolve(qrDataUrl)
      }
      img.onload = () => {
        clearTimeout(timeout)
        ctx.drawImage(img, 0, 0, 400, 400)

        const centerSize = 100
        const cx = 400 / 2 - centerSize / 2
        const cy = 400 / 2 - centerSize / 2

        ctx.fillStyle = '#ffffff'
        const radius = 10
        ctx.beginPath()
        ctx.moveTo(cx + radius, cy)
        ctx.arcTo(cx + centerSize, cy, cx + centerSize, cy + centerSize, radius)
        ctx.arcTo(cx + centerSize, cy + centerSize, cx, cy + centerSize, radius)
        ctx.arcTo(cx, cy + centerSize, cx, cy, radius)
        ctx.arcTo(cx, cy, cx + centerSize, cy, radius)
        ctx.fill()

        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#8B5E3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-8 8"/></svg>`
        const svgImg = new Image()
        svgImg.onerror = () => resolve(canvas.toDataURL('image/png'))
        svgImg.onload = () => {
          ctx.drawImage(svgImg, 400 / 2 - 21, cy + 10)
          ctx.fillStyle = '#1C1917'
          ctx.font = '20px "DM Serif Display", serif'
          ctx.textAlign = 'center'
          ctx.fillText('MenuAI', 400 / 2, cy + centerSize - 16)
          resolve(canvas.toDataURL('image/png'))
        }
        svgImg.src = `data:image/svg+xml;base64,${window.btoa(svgString)}`
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

    const realQr = await generateQrForUrl(getTableUrl(data.id))
    await supabase.from('tables').update({ qr_code_url: realQr }).eq('id', data.id)

    setTables((prev) => [...prev, { ...data, qr_code_url: realQr }].sort((a, b) => a.number - b.number))
    setNewNumber('')
    setNewLabel('')
    toast.success('Mesa creada')
    setLoading(false)
  }

  function deleteTable(tableId: string) {
    setDeleteConfirm({ open: true, tableId })
  }

  async function confirmDeleteTable() {
    const { error: deleteError } = await supabase.from('tables').delete().eq('id', deleteConfirm.tableId)
    if (deleteError) {
      toast.error('Error al eliminar mesa')
      return
    }

    const deletedId = deleteConfirm.tableId
    setTables((prev) => prev.filter((table) => table.id !== deletedId))
    toast.success('Mesa eliminada')
    setDeleteConfirm({ open: false, tableId: '' })
  }

  function downloadQr(dataUrl: string, fileName: string) {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    link.click()
  }

  async function downloadSelectedQrs() {
    if (bulkLoading) return
    const selectedTables = getSelectedTables().filter((table) => table.qr_code_url)
    if (selectedTables.length === 0) return

    setBulkLoading(true)
    for (const table of selectedTables) {
      if (!table.qr_code_url) continue
      downloadQr(table.qr_code_url, `qr-mesa-${table.number}-${restaurant.slug}.png`)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    setBulkLoading(false)
    toast.success(`${selectedTables.length} QR${selectedTables.length > 1 ? 's' : ''} descargados`)
  }

  async function confirmDeleteSelectedTables() {
    if (bulkLoading) return
    const selectedIds = [...selectionState.selectedTableIds]
    if (selectedIds.length === 0) return

    setBulkLoading(true)
    const { error: deleteError } = await supabase.from('tables').delete().in('id', selectedIds)
    setBulkLoading(false)

    if (deleteError) {
      setBulkDeleteConfirm(false)
      toast.error('Error al eliminar las mesas seleccionadas')
      return
    }

    const selectedIdSet = new Set(selectedIds)
    const count = selectedIds.length
    setTables((prev) => prev.filter((table) => !selectedIdSet.has(table.id)))
    exitSelectionMode()
    setBulkDeleteConfirm(false)
    toast.success(`${count} mesa${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''}`)
  }

  async function copyUrl(value: string, id: string) {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    toast.success('Enlace copiado')
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  async function doAddMultipleTables() {
    const count = parseInt(multiCount)
    if (!count || count < 1) return

    setMultiDialog(false)
    setMultiCount('')

    const lastNumber = tables.length > 0 ? Math.max(...tables.map((table) => table.number)) : 0
    setLoading(true)

    let added = 0
    try {
      for (let index = 1; index <= count; index++) {
        const num = lastNumber + index
        const { data, error: insertError } = await supabase
          .from('tables')
          .insert({ restaurant_id: restaurant.id, number: num })
          .select()
          .single()

        if (!insertError && data) {
          const qr = await generateQrForUrl(getTableUrl(data.id))
          await supabase.from('tables').update({ qr_code_url: qr }).eq('id', data.id)
          setTables((prev) => [...prev, { ...data, qr_code_url: qr }].sort((a, b) => a.number - b.number))
          added++
        }
      }
    } finally {
      if (added === count) {
        toast.success(`${count} mesas anadidas`)
      } else if (added > 0) {
        toast.warning(`${added} de ${count} mesas se anadieron. Algunas fallaron.`)
      } else {
        toast.error('No se pudieron añadir las mesas.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {hasGeneralQr && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <LinkIcon className="h-5 w-5 text-primary" />
              QR general del local
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[180px,1fr] md:items-center">
            <div className="flex justify-center">
              {generalQrLoading ? (
                <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : generalQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={generalQrUrl} alt="QR general del local" className="h-36 w-36 rounded-lg border border-border" />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                  Sin QR
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Acceso directo a la carta pública</p>
                <p className="mt-1 text-xs text-muted-foreground">{getAccessModeLabel(restaurant.menu_access_mode)}</p>
              </div>
              <p className="break-all font-mono text-xs text-muted-foreground">{generalUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    void copyUrl(generalUrl, 'general')
                  }}
                >
                  {copiedId === 'general' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  Copiar enlace
                </Button>
                <Button
                  className="cursor-pointer"
                  disabled={!generalQrUrl}
                  onClick={() => {
                    if (generalQrUrl) {
                      downloadQr(generalQrUrl, `qr-general-${restaurant.slug}.png`)
                    }
                  }}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Descargar QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasTableQr ? (
        <>
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Número de mesa</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={newNumber}
                    onChange={(event) => setNewNumber(event.target.value)}
                    className="w-28"
                  />
                </div>
                <div className="min-w-32 flex-1 space-y-1.5">
                  <Label>Etiqueta (opcional)</Label>
                  <Input
                    placeholder="Ej: Terraza, VIP..."
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                  />
                </div>
                <Button onClick={addTable} disabled={loading || !newNumber} className="cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" />
                  {loading ? 'Generando...' : 'Añadir mesa'}
                </Button>
                <Button variant="outline" onClick={() => setMultiDialog(true)} disabled={loading} className="cursor-pointer">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Añadir varias
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{tables.length} mesas configuradas</p>
            <p className="text-xs text-muted-foreground">
              URL: <span className="font-mono">{baseUrl}/{restaurant.slug}/mesa/[id]</span>
            </p>
          </div>

          {tables.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 text-sm text-muted-foreground">
                {selectionMode
                  ? selectionCount > 0
                    ? `${selectionCount} ${selectionCount === 1 ? 'mesa seleccionada' : 'mesas seleccionadas'}`
                    : 'Modo seleccion activo. Toca cualquier tarjeta QR para seleccionarla.'
                  : null}
              </div>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                {selectionMode ? (
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={exitSelectionMode}>
                    Cancelar
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={enterSelectionMode}>
                    Seleccionar
                  </Button>
                )}

                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={toggleSelectAll}>
                  {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </Button>

                {selectionCount > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={downloadSelectedQrs}
                      disabled={bulkLoading}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Descargar seleccionados
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer border-destructive/30 text-destructive hover:border-destructive/60 hover:text-destructive"
                      onClick={() => setBulkDeleteConfirm(true)}
                      disabled={bulkLoading}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Borrar seleccionados
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {tables.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <p className="mb-2 font-serif text-xl text-foreground">No hay mesas configuradas</p>
              <p className="mx-auto mb-6 max-w-xs text-sm text-muted-foreground">
                Crea mesas para generar códigos QR unicos para cada zona del local.
              </p>
              <Button onClick={() => setMultiDialog(true)} className="cursor-pointer">
                <Plus className="mr-1.5 h-4 w-4" />
                Añadir mesas
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tables.map((table) => {
                const isSelected = selectionState.selectedTableIds.includes(table.id)

                return (
                  <Card
                    key={table.id}
                    role={selectionMode ? 'button' : undefined}
                    tabIndex={selectionMode ? 0 : undefined}
                    aria-label={selectionMode ? `Seleccionar mesa ${table.number}` : undefined}
                    aria-pressed={selectionMode ? isSelected : undefined}
                    className={`overflow-hidden transition-all ${
                      selectionMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/25' : ''
                    } ${isSelected ? 'bg-primary/5 ring-2 ring-primary ring-offset-1' : ''}`}
                    onClick={selectionMode ? () => toggleTableSelection(table.id) : undefined}
                    onKeyDown={
                      selectionMode
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleTableSelection(table.id)
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="relative border-b border-border bg-secondary p-4 text-center">
                      {selectionMode && isSelected && (
                        <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                          Seleccionada
                        </Badge>
                      )}
                      <div className="font-serif text-xl text-foreground">Mesa {table.number}</div>
                      {table.label && (
                        <Badge variant="secondary" className="mt-1.5 text-xs">
                          {table.label}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="space-y-3 p-4">
                      {table.qr_code_url ? (
                        <div className="flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={table.qr_code_url}
                            alt={`QR Mesa ${table.number}`}
                            className="h-32 w-32 rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                          Sin QR
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1">
                        <p className="break-all text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
                          {getTableUrl(table.id)}
                        </p>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 shrink-0 cursor-pointer p-0"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void copyUrl(getTableUrl(table.id), table.id)
                                }}
                              >
                                {copiedId === table.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
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
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (table.qr_code_url) {
                                    downloadQr(table.qr_code_url, `qr-mesa-${table.number}-${restaurant.slug}.png`)
                                  }
                                }}
                                disabled={!table.qr_code_url}
                              >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
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
                                className="cursor-pointer text-destructive hover:text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteTable(table.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-2 font-serif text-xl text-foreground">Este local usa acceso general</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              No necesitas crear mesas porque la carta se abre desde un único QR general del local. Si quieres activar mesas,
              puedes cambiar el modo de acceso desde Ajustes.
            </p>
          </CardContent>
        </Card>
      )}

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
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDeleteTable}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectionCount} {selectionCount === 1 ? 'mesa' : 'mesas'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {selectionCount === 1 ? 'la mesa seleccionada' : `las ${selectionCount} mesas seleccionadas`} y sus códigos QR.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDeleteSelectedTables}
            >
              Eliminar {selectionCount === 1 ? 'mesa' : `${selectionCount} mesas`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={multiDialog} onOpenChange={setMultiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Añadir varias mesas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Cuantas mesas quieres añadir?</Label>
            <p className="text-sm text-muted-foreground">Se anadiran a partir de la última mesa existente.</p>
            <Input
              type="number"
              min="1"
              max="50"
              placeholder="Ej: 10"
              value={multiCount}
              onChange={(event) => setMultiCount(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMultiDialog(false)
                setMultiCount('')
              }}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button onClick={doAddMultipleTables} disabled={!multiCount || parseInt(multiCount) < 1} className="cursor-pointer">
              <Plus className="mr-1.5 h-4 w-4" />
              Añadir {multiCount && parseInt(multiCount) > 0 ? `${multiCount} mesas` : 'mesas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
