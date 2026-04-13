import Link from "next/link";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad — MenuAI",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav simple */}
      <nav className="px-[6vw] h-16 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Volver
        </Link>
      </nav>

      <main className="px-[6vw] py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl mb-2">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Última actualización: 13 de abril de 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales recogidos a través de menuai.es
              es MenuAI (&quot;nosotros&quot;), con domicilio en Málaga, España. Puedes contactarnos
              en <a href="mailto:hola@menuai.es" className="text-primary hover:underline">hola@menuai.es</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">2. Datos que recogemos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Datos de registro:</strong> email y contraseña al crear una cuenta de administrador.</li>
              <li><strong className="text-foreground">Datos del restaurante:</strong> nombre, slug, categorías, platos, ingredientes, alérgenos y mesas que el administrador introduce.</li>
              <li><strong className="text-foreground">Datos de uso:</strong> interacciones con el chatbot IA por parte de los clientes finales. Estas conversaciones no se almacenan de forma permanente.</li>
              <li><strong className="text-foreground">Datos de pago:</strong> procesados directamente por Stripe. No almacenamos números de tarjeta.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">3. Finalidad del tratamiento</h2>
            <p>Tratamos los datos para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Prestar el servicio de carta digital y chatbot IA.</li>
              <li>Gestionar la cuenta de administrador y la suscripción.</li>
              <li>Enviar comunicaciones relacionadas con el servicio.</li>
              <li>Mejorar la calidad del producto.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">4. Base legal</h2>
            <p>
              El tratamiento se basa en la ejecución del contrato de suscripción (art. 6.1.b RGPD)
              y en el interés legítimo para la mejora del servicio (art. 6.1.f RGPD).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">5. Encargados del tratamiento</h2>
            <p>Compartimos datos con los siguientes proveedores, todos con garantías adecuadas:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Supabase</strong> — alojamiento de base de datos y autenticación.</li>
              <li><strong className="text-foreground">Stripe</strong> — procesamiento de pagos.</li>
              <li><strong className="text-foreground">Groq</strong> — procesamiento de lenguaje natural para el chatbot.</li>
              <li><strong className="text-foreground">Vercel</strong> — alojamiento de la aplicación web.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">6. Conservación de datos</h2>
            <p>
              Los datos de la cuenta se conservan mientras la suscripción esté activa.
              Tras la cancelación, los datos se eliminan en un plazo máximo de 90 días,
              salvo obligación legal de conservación.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">7. Derechos del usuario</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad,
              limitación y oposición enviando un email a{" "}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">hola@menuai.es</a>.
              También tienes derecho a presentar una reclamación ante la Agencia Española de
              Protección de Datos (AEPD).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies técnicas estrictamente necesarias para el funcionamiento del
              servicio (autenticación y sesión). No utilizamos cookies de seguimiento ni
              publicidad.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
