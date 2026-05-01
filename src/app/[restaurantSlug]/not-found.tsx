import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 font-serif text-2xl font-semibold text-foreground">Menú no encontrado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          El restaurante que buscas no existe o el enlace ha expirado.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
