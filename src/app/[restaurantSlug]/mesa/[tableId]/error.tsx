'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[mesa] error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-5">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-foreground">No hemos podido cargar la carta</h1>
          <p className="text-sm text-muted-foreground">
            Algo no ha ido bien. Vuelve a intentarlo en unos segundos. Si el problema continúa, avisa al personal del local.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()} className="cursor-pointer">
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  )
}
