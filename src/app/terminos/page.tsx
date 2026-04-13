import Link from "next/link";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones — MenuAI",
};

export default function TerminosPage() {
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
        <h1 className="font-serif text-4xl mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Última actualización: 13 de abril de 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">1. Objeto</h2>
            <p>
              Estos términos regulan el uso de la plataforma MenuAI (menuai.es), un servicio
              de carta digital con asistente IA para establecimientos de hostelería.
              Al registrarte aceptas estos términos en su totalidad.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">2. Descripción del servicio</h2>
            <p>MenuAI proporciona:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Creación y gestión de carta digital para restaurantes.</li>
              <li>Generación de códigos QR por mesa.</li>
              <li>Chatbot IA que recomienda platos a los clientes según sus preferencias y alergias.</li>
              <li>Panel de administración para gestionar el contenido.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">3. Registro y cuenta</h2>
            <p>
              Para usar el servicio debes crear una cuenta con un email válido.
              Eres responsable de mantener la confidencialidad de tus credenciales
              y de toda la actividad que ocurra bajo tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">4. Prueba gratuita y suscripción</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>La prueba gratuita dura 14 días y no requiere tarjeta de crédito.</li>
              <li>Al finalizar la prueba, deberás seleccionar un plan de pago para continuar usando el servicio.</li>
              <li>Los pagos se procesan a través de Stripe. Los precios incluyen IVA cuando aplique.</li>
              <li>Puedes cancelar tu suscripción en cualquier momento. El acceso se mantiene hasta el final del período facturado.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">5. Uso aceptable</h2>
            <p>Te comprometes a:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Proporcionar información veraz sobre tu establecimiento y carta.</li>
              <li>No usar el servicio para fines ilegales o fraudulentos.</li>
              <li>No intentar acceder a cuentas o datos de otros usuarios.</li>
              <li>No realizar ingeniería inversa ni interferir con el funcionamiento del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">6. Propiedad intelectual</h2>
            <p>
              El código, diseño, marca y contenido de MenuAI son propiedad de sus creadores.
              El contenido que subas (platos, descripciones, imágenes) sigue siendo tuyo.
              Nos otorgas una licencia limitada para mostrarlo dentro del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">7. Chatbot IA</h2>
            <p>
              El asistente IA genera recomendaciones basadas en la información de tu carta.
              Las respuestas son orientativas y no sustituyen el asesoramiento profesional
              sobre alergias alimentarias. El restaurante es responsable de la exactitud
              de la información de alérgenos e ingredientes introducida en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">8. Limitación de responsabilidad</h2>
            <p>
              MenuAI se proporciona &quot;tal cual&quot;. No garantizamos disponibilidad
              ininterrumpida del servicio. No seremos responsables de daños indirectos
              derivados del uso o imposibilidad de uso del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">9. Modificaciones</h2>
            <p>
              Podemos actualizar estos términos. Te notificaremos por email de cambios
              significativos con al menos 30 días de antelación. El uso continuado del
              servicio tras la notificación implica aceptación.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">10. Legislación aplicable</h2>
            <p>
              Estos términos se rigen por la legislación española. Para cualquier
              controversia serán competentes los juzgados y tribunales de Málaga, España.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos, escríbenos a{" "}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">hola@menuai.es</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
