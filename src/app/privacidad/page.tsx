import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export const metadata = {
  title: 'Politica de Privacidad - MenuAI',
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
        <h1 className="mb-2 font-serif text-4xl">Politica de Privacidad</h1>
        <p className="mb-12 text-sm text-muted-foreground">Última actualizacion: 13 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales recogidos a traves de menuai.es
              es MenuAI (&quot;nosotros&quot;), con domicilio en Malaga, Espana. Puedes contactarnos en{' '}
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
                <strong className="text-foreground">Datos de registro:</strong> email y contrasena al crear una cuenta
                de administrador.
              </li>
              <li>
                <strong className="text-foreground">Datos del local:</strong> nombre, slug, categorias, productos,
                ingredientes, alérgenos, configuración de acceso y mesas que el administrador introduce.
              </li>
              <li>
                <strong className="text-foreground">Datos de uso:</strong> interacciones con el asistente IA por parte
                de los clientes finales. Estas conversaciones no se almacenan de forma permanente.
              </li>
              <li>
                <strong className="text-foreground">Datos de pago:</strong> procesados directamente por Stripe. No
                almacenamos numeros de tarjeta.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Finalidad del tratamiento</h2>
            <p>Tratamos los datos para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Prestar el servicio de carta digital y asistente IA.</li>
              <li>Gestionar la cuenta de administrador y la suscripcion.</li>
              <li>Enviar comunicaciones relacionadas con el servicio.</li>
              <li>Mejorar la calidad del producto.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Base legal</h2>
            <p>
              El tratamiento se basa en la ejecucion del contrato de suscripcion (art. 6.1.b RGPD)
              y en el interes legitimo para la mejora del servicio (art. 6.1.f RGPD).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Encargados del tratamiento</h2>
            <p>Compartimos datos con los siguientes proveedores, todos con garantias adecuadas:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Supabase</strong> - alojamiento de base de datos y autenticacion.
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> - procesamiento de pagos.
              </li>
              <li>
                <strong className="text-foreground">OpenRouter</strong> - procesamiento de lenguaje natural para el
                asistente IA.
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> - alojamiento de la aplicacion web.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">6. Conservacion de datos</h2>
            <p>
              Los datos de la cuenta se conservan mientras la suscripcion este activa. Tras la cancelacion,
              los datos se eliminan en un plazo maximo de 90 dias, salvo obligacion legal de conservacion.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">7. Derechos del usuario</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificacion, supresion, portabilidad, limitacion y
              oposicion enviando un email a{' '}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                hola@menuai.es
              </a>
              . También tienes derecho a presentar una reclamacion ante la Agencia Espanola de Proteccion
              de Datos (AEPD).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">8. Cookies</h2>
            <p>
              Utilizamos cookies tecnicas estrictamente necesarias para el funcionamiento del servicio
              (autenticacion y sesión). No utilizamos cookies de seguimiento ni publicidad.{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Politica de Cookies
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
