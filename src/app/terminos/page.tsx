import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata = {
  title: 'Términos y Condiciones - MenuAI',
}

export default function TerminosPage() {
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
        <h1 className="mb-2 font-serif text-4xl">Términos y Condiciones</h1>
        <p className="mb-12 text-sm text-muted-foreground">Última actualización: 13 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Objeto</h2>
            <p>
              Estos términos regulan el uso de la plataforma MenuAI (menuai.es), un servicio de
              carta digital con asistente IA para establecimientos de hostelería. Al registrarte
              aceptas estos términos en su totalidad.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. Descripción del servicio</h2>
            <p>MenuAI proporciona:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Creación y gestión de carta digital para restaurantes, bares, cafeterías y coctelerías.</li>
              <li>Generación de códigos QR generales, por mesa o ambos.</li>
              <li>
                Asistente IA que recomienda productos a los clientes según sus preferencias, restricciones
                y contexto de consumo.
              </li>
              <li>Panel de administración para gestionar el contenido y el acceso a la carta.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Registro y cuenta</h2>
            <p>
              Para usar el servicio debes crear una cuenta con un email válido. Eres responsable de
              mantener la confidencialidad de tus credenciales y de toda la actividad que ocurra bajo tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Prueba gratuita y suscripción</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>La prueba gratuita dura 14 días y no requiere tarjeta de crédito.</li>
              <li>Al finalizar la prueba, deberás seleccionar un plan de pago para continuar usando el servicio.</li>
              <li>Los pagos se procesan a través de Stripe. Los precios incluyen IVA cuando aplique.</li>
              <li>Puedes cancelar tu suscripción en cualquier momento. El acceso se mantiene hasta el final del periodo facturado.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Uso aceptable</h2>
            <p>Te comprometes a:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Proporcionar información veraz sobre tu local y su carta.</li>
              <li>No usar el servicio para fines ilegales o fraudulentos.</li>
              <li>No intentar acceder a cuentas o datos de otros usuarios.</li>
              <li>No realizar ingeniería inversa ni interferir con el funcionamiento del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">6. Propiedad intelectual</h2>
            <p>
              El código, diseño, marca y contenido de MenuAI son propiedad de sus creadores.
              El contenido que subas (productos, descripciones, imágenes) sigue siendo tuyo.
              Nos otorgas una licencia limitada para mostrarlo dentro del servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">7. Asistente IA</h2>
            <p>
              El asistente IA genera recomendaciones basadas en la información de tu carta.
              Las respuestas son orientativas y no sustituyen el asesoramiento profesional
              sobre alergias alimentarias. El titular del local es responsable de la exactitud
              de la información de alérgenos e ingredientes introducida en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">8. Limitación de responsabilidad</h2>
            <p>
              MenuAI se proporciona &quot;tal cual&quot;. No garantizamos disponibilidad ininterrumpida del
              servicio. No seremos responsables de daños indirectos derivados del uso o imposibilidad
              de uso del servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">9. Modificaciones</h2>
            <p>
              Podemos actualizar estos términos. Te notificaremos por email los cambios significativos
              con al menos 30 días de antelación. El uso continuado del servicio tras la notificación
              implica aceptación.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">10. Legislación aplicable</h2>
            <p>
              Estos términos se rigen por la legislación española. Para cualquier controversia serán
              competentes los juzgados y tribunales de Málaga, España.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos, escríbenos a{' '}
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
