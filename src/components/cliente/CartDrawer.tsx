'use client'

import Image from 'next/image'
import type { CartItem } from '@/lib/types'
import type { CSSProperties } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartItems: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onClear: () => void
  themeVars: CSSProperties
}

export default function CartDrawer({
  open, onOpenChange, cartItems, onUpdateQuantity, onClear, themeVars,
}: Props) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="max-h-[80dvh] flex flex-col rounded-t-2xl [--restaurant-primary-readable:var(--restaurant-primary-readable-light)] dark:[--restaurant-primary-readable:var(--restaurant-primary-readable-dark)]"
        style={themeVars}
      >
        <SheetHeader className="border-b border-border pb-2">
          <SheetTitle>
            Tu pedido · {totalUnits} {totalUnits === 1 ? 'artículo' : 'artículos'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 px-4">
          {cartItems.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              {item.image_url ? (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/50 shrink-0">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border/50">
                  <span className="text-lg font-medium text-muted-foreground">{item.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.price.toFixed(2)} EUR</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base font-bold cursor-pointer hover:bg-muted transition-colors"
                  aria-label={`Quitar un ${item.name}`}
                >−</button>
                <span className="text-sm font-semibold w-5 text-center tabular-nums">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, +1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--restaurant-primary)',
                    color: 'var(--restaurant-primary-foreground)',
                  }}
                  aria-label={`Añadir otro ${item.name}`}
                >+</button>
              </div>
              <span className="text-sm font-semibold tabular-nums w-14 text-right shrink-0">
                {(item.price * item.quantity).toFixed(2)} EUR
              </span>
            </div>
          ))}
        </div>

        <SheetFooter className="border-t border-border flex-col gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">Total estimado</span>
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: 'var(--restaurant-primary-readable)' }}
            >
              {total.toFixed(2)} EUR
            </span>
          </div>
          <div className="w-full rounded-xl bg-secondary px-4 py-3 text-center">
            <p className="text-sm text-secondary-foreground leading-snug">
              Muéstraselo al camarero para realizar tu pedido
            </p>
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors mx-auto cursor-pointer pb-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar pedido
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
