import Link from 'next/link'
import { ArrowLeft, Store, Mail, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Contacto - MenuAI',
}

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          Volver
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Contacto</h1>
        <p className="mb-12 text-muted-foreground">Tienes alguna pregunta? Escribenos.</p>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">Email</p>
              <a
                href="mailto:hola@menuai.es"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                hola@menuai.es
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">Ubicacion</p>
              <p className="text-muted-foreground">Malaga, España</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
