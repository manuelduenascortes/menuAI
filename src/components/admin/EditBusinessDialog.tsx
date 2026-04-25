'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import RestaurantEditForm, { type EditableRestaurant } from '@/components/admin/RestaurantEditForm'
import type { FontStyle } from '@/lib/types'
import type { RestaurantFontClasses } from '@/lib/restaurant-fonts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function EditBusinessDialog({
  restaurant,
  fontClassMap,
}: {
  restaurant: EditableRestaurant
  fontClassMap: Record<FontStyle, RestaurantFontClasses>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
        title="Editar datos del negocio"
        aria-label="Editar datos del negocio"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Editar datos del local</DialogTitle>
            <DialogDescription>
              Actualiza la información visible de tu negocio sin salir del dashboard.
            </DialogDescription>
          </DialogHeader>
          <RestaurantEditForm restaurant={restaurant} fontClassMap={fontClassMap} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
