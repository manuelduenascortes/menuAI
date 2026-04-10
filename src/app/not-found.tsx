import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-5">
      <MapPin className="w-20 h-20 text-primary mb-6 animate-subtle-pulse" strokeWidth={1} />
      <h1 className="font-serif text-4xl md:text-5xl mb-4">Página no encontrada</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg">
        La página que buscas no existe o ha sido movida.
      </p>
      <Link 
        href="/"
        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-colors cursor-pointer"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
