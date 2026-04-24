import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export const metadata = {
  title: 'Politica de Cookies - MenuAI',
}

export default function CookiesPage() {
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
        <h1 className="mb-2 font-serif text-4xl">Politica de Cookies</h1>
        <p className="mb-12 text-sm text-muted-foreground">Ultima actualizacion: 24 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Que son las cookies</h2>
            <p>
              Las cookies son pequenos ficheros de texto que un sitio web almacena en el navegador del usuario.
              Permiten que el sitio recuerde informacion sobre la visita para facilitar su uso.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Cookies que utilizamos</h2>
            <p>
              MenuAI unicamente usa <strong className="text-foreground">cookies tecnicas estrictamente necesarias</strong>.
              No utilizamos cookies de rastreo, analitica ni publicidad.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Cookies utilizadas por MenuAI</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pr-4 text-left text-foreground">Nombre</th>
                    <th scope="col" className="py-2 pr-4 text-left text-foreground">Proveedor</th>
                    <th scope="col" className="py-2 pr-4 text-left text-foreground">Finalidad</th>
                    <th scope="col" className="py-2 text-left text-foreground">Duracion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">Sesion de administrador (autenticacion)</td>
                    <td className="py-2">Sesion</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                    <td className="py-2 pr-4">MenuAI</td>
                    <td className="py-2 pr-4">Recordar tu preferencia sobre este aviso</td>
                    <td className="py-2">1 año</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Como gestionar las cookies</h2>
            <p>
              Puedes configurar tu navegador para rechazar o eliminar cookies. Ten en cuenta que si rechazas
              las cookies tecnicas no podras iniciar sesion como administrador.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Mas informacion</h2>
            <p>
              Para cualquier duda escribenos a{' '}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                hola@menuai.es
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
