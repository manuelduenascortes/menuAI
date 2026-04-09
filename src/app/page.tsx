import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  MessageCircle,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";

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
          <h1 className="animate-fade-up delay-1 font-serif text-[clamp(3.5rem,6.5vw,7.5rem)] leading-[0.92] tracking-tight whitespace-nowrap">
            Tu carta, <span className="text-primary">más</span> inteligente
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
              <p className="font-serif text-3xl text-foreground">14</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Alérgenos EU</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-foreground">QR</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Por mesa, sin apps</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-foreground">IA</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Llama 3.3 70B</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up delay-4 flex flex-col sm:flex-row md:flex-col lg:flex-row items-start gap-4">
            <Link
              href="/admin/login"
              className="group inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-base font-medium transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
            >
              Empieza gratis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground px-8 py-4 rounded-full border border-border transition-colors cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[6vw] gap-y-4 items-end mb-14">
          <div>
            <p className="text-xs font-medium text-primary tracking-widest uppercase mb-3">
              Cómo funciona
            </p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
              Todo lo que necesitas,
              <br />nada más
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

      {/* ─── FOOTER ─── */}
      <footer className="px-[6vw] py-8 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <span className="font-serif text-base text-foreground">MenuAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MenuAI. Hecho en Málaga.
          </p>
        </div>
      </footer>
    </div>
  );
}
