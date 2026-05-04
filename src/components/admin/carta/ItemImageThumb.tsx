'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ItemImageThumb({
  imageUrl,
  itemName,
  restaurantId,
  onChange,
}: {
  imageUrl?: string
  itemName: string
  restaurantId: string
  onChange: (newUrl: string | null) => void | Promise<void>
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function openPicker() {
    fileInputRef.current?.click()
  }

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurantId)

      const response = await fetch('/api/upload', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      await onChange(data.url)
    } catch {
      toast.error('Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) handleFile(file)
        event.target.value = ''
      }}
    />
  )

  if (!imageUrl) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-background transition-colors hover:border-primary/60 hover:bg-primary/5"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            }
          />
          <TooltipContent>Añadir imagen</TooltipContent>
        </Tooltip>
        {hiddenInput}
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={uploading}
              className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={itemName} className="h-full w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={openPicker} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Cambiar imagen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onChange(null)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar imagen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {hiddenInput}
    </>
  )
}
