import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidad - MenuAI',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Política de Privacidad</h1>
        <p className="mb-12 text-sm text-muted-foreground">Última actualización: 13 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales recogidos a través de menuai.es
              es MenuAI (&quot;nosotros&quot;), con domicilio en Málaga, España. Puedes contactarnos en{' '}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                hola@menuai.es
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. Datos que recogemos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Datos de registro:</strong> email y contraseña al crear una cuenta
                de administrador.
              </li>
              <li>
                <strong className="text-foreground">Datos del local:</strong> nombre, slug, categorías, productos,
                ingredientes, alérgenos, configuración de acceso y mesas que el administrador introduce.
              </li>
              <li>
                <strong className="text-foreground">Datos de uso:</strong> interacciones con el asistente IA por parte
                de los clientes finales.
              </li>
              <li>
                <strong className="text-foreground">Datos de pago:</strong> procesados directamente por Stripe. No
                almacenamos números de tarjeta.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Finalidad del tratamiento</h2>
            <p>Utilizamos la información para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Proveer el servicio de carta digital y asistente de IA.</li>
              <li>Gestionar tu suscripción y pagos.</li>
              <li>Mejorar la precisión de las respuestas del asistente.</li>
              <li>Enviar comunicaciones técnicas o de soporte.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Base legal</h2>
            <p>
              Tratamos tus datos sobre la base del <strong className="text-foreground">consentimiento</strong> al
              registrarte y la <strong className="text-foreground">ejecución de un contrato</strong> al contratar
              nuestros servicios de pago.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Destinatarios</h2>
            <p>Compartimos datos con los siguientes proveedores, todos con garantías adecuadas:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Supabase</strong> - alojamiento de base de datos y autenticación.
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> - procesamiento de pagos.
              </li>
              <li>
                <strong className="text-foreground">OpenRouter / OpenAI</strong> - procesamiento de consultas del
                asistente IA (los datos se anonimizan siempre que sea posible).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">6. Conservación de datos</h2>
            <p>
              Los datos de la cuenta se conservan mientras la suscripción esté activa. Tras la cancelación,
              los datos se eliminan en un plazo máximo de 90 días, salvo obligación legal de conservación.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">7. Tus derechos</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión y portabilidad enviando un email a{' '}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                hola@menuai.es
              </a>
              . También tienes derecho a presentar una reclamación ante la Agencia Española de Protección
              de Datos (AEPD).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">8. Cookies</h2>
            <p>
              Utilizamos cookies técnicas estrictamente necesarias para el funcionamiento del servicio
              (autenticación y sesión). No utilizamos cookies de seguimiento ni publicidad.{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Política de Cookies
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
