import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  MessageCircle,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── NAV ─── */}
      <nav className="px-[6vw] h-16 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </div>
        <Link
          href="/admin/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <section className="px-[6vw] pt-16 pb-20 border-b border-border">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card mb-10 text-sm text-muted-foreground">
          <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
          Carta digital con IA
        </div>

        {/* Full-width headline */}
        <div className="flex justify-between items-center mb-12 gap-8 w-full">
          <h1 className="animate-fade-up delay-1 font-serif text-[clamp(2.5rem,8vw,7.5rem)] leading-[0.92] tracking-tight">
            Tu carta, <br className="md:hidden" /><span className="text-primary">más</span> inteligente
          </h1>
          <div className="hidden md:flex flex-1 justify-center animate-fade-up delay-1">
            <UtensilsCrossed strokeWidth={1} className="w-32 h-32 md:w-48 md:h-48 text-primary" />
          </div>
        </div>

        {/* Bottom row: description | stats | CTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center md:items-start border-t border-border pt-16">
          {/* Description */}
          <div className="animate-fade-up delay-2 md:col-span-1">
            <p className="text-base text-muted-foreground leading-relaxed">
              Tus clientes escanean el QR, descubren tu carta y un asistente IA
              les recomienda según sus gustos, alergias y preferencias.
              Sin instalar apps.
            </p>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-3 grid grid-cols-3 gap-4 md:col-span-1">
            <div>
              <p className="font-serif text-3xl text-foreground">&lt; 5 min</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Tu carta digital lista</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-foreground">0 €</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Sin cuotas ni comisiones</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-foreground">0 apps</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Sin instalar nada</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up delay-4 flex flex-col sm:flex-row md:flex-col lg:flex-row items-center sm:items-start gap-4 w-full">
            <Link
              href="/admin/login"
              className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-base font-medium transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
            >
              Empieza gratis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 text-base text-muted-foreground hover:text-foreground px-8 py-4 rounded-full border border-border transition-colors cursor-pointer"
            >
              Cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section
        id="como-funciona"
        className="px-[6vw] py-20"
      >
        {/* Section header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[6vw] gap-y-4 items-center mb-14">
          <div>
            <p className="text-xs font-medium text-primary tracking-widest uppercase mb-3">
              Cómo funciona
            </p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
              Todo lo que necesitas, nada más
            </h2>
          </div>
          <div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              MenuAI digitaliza tu carta, genera QR por mesa y añade un
              asistente inteligente que conoce cada plato y cada alérgeno.
            </p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/25 transition-colors">
              <QrCode className="w-7 h-7 text-primary mb-6" />
              <h3 className="font-serif text-2xl mb-3">QR por mesa</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cada mesa tiene su código QR único. El cliente escanea con
                su móvil y ve tu carta al instante. Genera e imprime los QR
                directamente desde el panel de gestión.
              </p>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/25 transition-colors">
              <MessageCircle className="w-7 h-7 text-primary mb-6" />
              <h3 className="font-serif text-2xl mb-3">Chatbot IA</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pregunta por alergias y preferencias, y recomienda platos
                personalizados en tiempo real.
              </p>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/25 transition-colors">
              <Settings className="w-7 h-7 text-primary mb-6" />
              <h3 className="font-serif text-2xl mb-3">Panel admin</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gestiona categorías, platos, ingredientes, alérgenos y mesas
                desde un único lugar.
              </p>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/25 transition-colors">
              <Sparkles className="w-7 h-7 text-primary mb-6" />
              <h3 className="font-serif text-2xl mb-3">Importación inteligente</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sube una foto de tu carta en papel o pega el texto. La IA
                extrae platos, precios e ingredientes automáticamente.
                De carta en papel a digital en minutos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-[6vw] py-20 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium text-primary tracking-widest uppercase mb-3 text-center">
            FAQ
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight text-center mb-12">
            Preguntas frecuentes
          </h2>
          <Accordion>
            {[
              {
                q: "¿Es gratis?",
                a: "Sí, MenuAI es completamente gratuito. No hay cuotas mensuales, ni comisiones, ni costes ocultos. Creemos que digitalizar la hostelería debe ser accesible para todos.",
              },
              {
                q: "¿Mis clientes necesitan instalar alguna app?",
                a: "No, solo escanean el QR con la cámara de su móvil y acceden directamente a tu carta desde el navegador. Funciona al instante, sin descargas ni registros.",
              },
              {
                q: "¿Cómo funcionan las recomendaciones de alérgenos?",
                a: "Nuestro chatbot IA conoce cada ingrediente y alérgeno de todos tus platos. Cuando un cliente pregunta, el asistente filtra y recomienda opciones seguras en tiempo real.",
              },
              {
                q: "¿Puedo cambiar mi carta después?",
                a: "Sí, puedes editarla en cualquier momento desde el panel de administración. Añade, modifica o elimina categorías, platos, precios e ingredientes cuando quieras.",
              },
              {
                q: "¿Funciona en cualquier dispositivo?",
                a: "Sí, es una web responsive que se adapta a móviles, tablets y ordenadores. No importa qué dispositivo use tu cliente, la experiencia será perfecta.",
              },
              {
                q: "¿Qué pasa si mi restaurante cierra?",
                a: "Tus datos son tuyos. Puedes eliminar tu cuenta y toda la información asociada en cualquier momento desde el panel de administración.",
              },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-base font-medium text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="px-[6vw] py-24 bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/10 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight mb-4">
            ¿Listo para digitalizar tu carta?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            En menos de 5 minutos tu restaurante tendrá carta digital con IA
          </p>
          <Link
            href="/admin/login"
            className="group inline-flex items-center gap-2 bg-foreground text-background px-10 py-4 rounded-full text-base font-medium transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
          >
            Empieza gratis
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="px-[6vw] py-12 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg text-foreground">MenuAI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Carta digital inteligente para hostelería.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-medium text-sm text-foreground mb-3">Enlaces</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a></li>
              <li><Link href="/admin/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link></li>
              <li><a href="mailto:hola@menuai.es" className="hover:text-foreground transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-medium text-sm text-foreground mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Términos</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MenuAI. Hecho con ❤️ en Málaga.
        </div>
      </footer>
    </div>
  );
}
