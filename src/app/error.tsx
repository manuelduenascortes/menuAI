'use client'

import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-5">
      <AlertTriangle className="w-20 h-20 text-primary mb-6" strokeWidth={1} />
      <h1 className="font-serif text-4xl md:text-5xl mb-4">Algo salió mal</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg">
        Ha ocurrido un error inesperado. Inténtalo de nuevo.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-colors cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  )
}
