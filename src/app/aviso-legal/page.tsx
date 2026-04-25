import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata = {
  title: 'Aviso Legal - MenuAI',
}

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Aviso Legal</h1>
        <p className="mb-12 text-sm text-muted-foreground">Última actualización: 24 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Datos identificativos del titular</h2>
            <p>
              En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSICE):
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Razón social:</strong> [RAZÓN SOCIAL]</li>
              <li><strong className="text-foreground">CIF/NIF:</strong> [CIF]</li>
              <li><strong className="text-foreground">Domicilio social:</strong> [DOMICILIO]</li>
              <li>
                <strong className="text-foreground">Correo electrónico:</strong>{' '}
                <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                  hola@menuai.es
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. Objeto</h2>
            <p>
              El presente Aviso Legal regula el acceso y uso del sitio web menuai.es, que ofrece un servicio de carta digital inteligente para establecimientos de hostelería.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Propiedad intelectual e industrial</h2>
            <p>
              Todos los contenidos del sitio web (textos, gráficos, logotipos, imágenes, código fuente) son propiedad del titular o de terceros que han autorizado su uso, y están protegidos por la legislación española e internacional sobre propiedad intelectual e industrial. Queda prohibida su reproducción total o parcial sin autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Exclusión de garantías y responsabilidad</h2>
            <p>
              El titular no se hace responsable de los daños producidos por el uso del servicio, interrupciones técnicas, errores en los contenidos o accesos no autorizados. El usuario utiliza el sitio bajo su propia responsabilidad.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Ley aplicable y jurisdicción</h2>
            <p>
              Este Aviso Legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de Málaga, salvo que la normativa aplicable establezca otro fuero.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
