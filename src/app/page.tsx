'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  GlassWater,
  Menu,
  MessageCircle,
  QrCode,
  Settings,
  Sparkles,
  Store,
  X,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import ThemeToggle from '@/components/ThemeToggle'

const faqs = [
  {
    q: 'Cuanto dura la prueba gratuita?',
    a: 'La prueba gratuita dura 14 dias y activa todas las funciones. Puedes probar panel, QR y asistente sin tarjeta.',
  },
  {
    q: 'Sirve solo para restaurantes?',
    a: 'No. MenuAI esta pensado para restaurantes, bares, cafeterias, coctelerias y locales mixtos. El asistente adapta sus recomendaciones al tipo de local.',
  },
  {
    q: 'Mis clientes necesitan instalar algo?',
    a: 'No. Solo escanean el QR y acceden desde el navegador del movil.',
  },
  {
    q: 'Puedo usar un QR general en vez de QR por mesa?',
    a: 'Si. Puedes trabajar con un QR general, con QR por mesa o con ambos a la vez.',
  },
  {
    q: 'Como funciona el asistente IA?',
    a: 'Lee tu carta y recomienda segun el contexto: platos y restricciones en restaurantes, cafes o tapas en bares, o copas y cocteles segun sabores e intensidad.',
  },
  {
    q: 'Puedo cambiar la carta cuando quiera?',
    a: 'Si. Puedes editar categorias, productos, precios, disponibilidad, imagenes y alergenos en cualquier momento.',
  },
]

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-[6vw] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Como funciona
          </a>
          <a href="#planes" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Planes
          </a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Preguntas frecuentes
          </a>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <Link
            href="/admin/login"
            className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesion
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="p-1 text-foreground"
            aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-16 md:hidden">
          <div className="flex flex-col gap-6 p-6">
            <a
              href="#como-funciona"
              className="border-b border-border/50 py-2 text-lg font-medium text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Como funciona
            </a>
            <a
              href="#planes"
              className="border-b border-border/50 py-2 text-lg font-medium text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Planes
            </a>
            <a
              href="#faq"
              className="border-b border-border/50 py-2 text-lg font-medium text-foreground"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Preguntas frecuentes
            </a>
            <Link
              href="/admin/login"
              className="flex items-center gap-2 py-2 text-lg font-medium text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Iniciar sesion
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      <main id="main-content">
        <section className="border-b border-border px-[6vw] pb-20 pt-32">
          <div className="mb-10 inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Store className="h-3.5 w-3.5 text-primary" />
            Carta digital para hosteleria con IA
          </div>

          <div className="mb-12 flex w-full items-center justify-between gap-8">
            <h1 className="animate-fade-up delay-1 font-serif text-[clamp(2.5rem,8vw,7.5rem)] leading-[0.92] tracking-tight">
              Tu local,
              <br className="md:hidden" /> mas facil de vender
              <br />
              con <span className="text-primary">QR + IA</span>
            </h1>
            <div className="hidden flex-1 animate-fade-up delay-1 justify-center md:flex">
              <div className="flex items-center gap-5 text-primary">
                <Store className="h-20 w-20 md:h-28 md:w-28" strokeWidth={1.2} />
                <GlassWater className="h-16 w-16 md:h-24 md:w-24" strokeWidth={1.2} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 border-t border-border pt-16 md:grid-cols-3 md:items-start">
            <div className="animate-fade-up delay-2 md:col-span-1">
              <p className="text-base leading-relaxed text-muted-foreground">
                Digitaliza la carta de tu restaurante, bar, cafeteria o cocteleria.
                Tus clientes escanean, descubren la oferta y reciben recomendaciones
                utiles sin instalar ninguna app.
              </p>
            </div>

            <div className="animate-fade-up delay-3 grid grid-cols-3 gap-4 md:col-span-1">
              <div>
                <p className="font-serif text-3xl text-foreground">&lt; 5 min</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">Tu carta lista</p>
              </div>
              <div>
                <p className="font-serif text-3xl text-foreground">3 modos</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">QR general, mesa o ambos</p>
              </div>
              <div>
                <p className="font-serif text-3xl text-foreground">0 apps</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">Todo desde navegador</p>
              </div>
            </div>

            <div className="animate-fade-up delay-4 flex w-full items-center md:col-span-1 md:justify-end">
              <Link
                href="/admin/login?trial=1"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-medium text-background transition-all hover:opacity-80 active:scale-[0.98] sm:w-auto"
              >
                Prueba gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-16 px-[6vw] py-24">
          <div className="mb-14 grid grid-cols-1 items-center gap-x-[6vw] gap-y-4 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
                Como funciona
              </p>
              <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
                Una carta que se adapta a tu tipo de local
              </h2>
            </div>
            <div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                MenuAI mantiene tu estructura de categorias y productos, pero adapta
                el acceso y las recomendaciones al contexto real del cliente:
                comida, cafe, tapas, bebidas o copas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="h-full rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/25">
                <QrCode className="mb-6 h-7 w-7 text-primary" />
                <h3 className="mb-3 font-serif text-2xl">QR general o QR por mesa</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Usa un unico QR para todo el local, codigos por mesa o ambos a la vez.
                  Encaja igual de bien en un restaurante, una cafeteria de paso o un bar de copas.
                </p>
              </div>
            </div>
            <div className="md:col-span-5">
              <div className="h-full rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/25">
                <MessageCircle className="mb-6 h-7 w-7 text-primary" />
                <h3 className="mb-3 font-serif text-2xl">Recomendador IA contextual</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Sugiere platos, tapas, cafes o cocteles segun gustos, restricciones,
                  intensidad, momento del dia y tipo de consumo.
                </p>
              </div>
            </div>
            <div className="md:col-span-5">
              <div className="h-full rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/25">
                <Settings className="mb-6 h-7 w-7 text-primary" />
                <h3 className="mb-3 font-serif text-2xl">Panel simple</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Gestiona categorias, productos, ingredientes, disponibilidad,
                  imagenes, alergenos y acceso desde un unico panel.
                </p>
              </div>
            </div>
            <div className="md:col-span-7">
              <div className="h-full rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/25">
                <Sparkles className="mb-6 h-7 w-7 text-primary" />
                <h3 className="mb-3 font-serif text-2xl">Importacion inteligente</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Sube una foto, un PDF o pega texto. La IA detecta categorias,
                  productos, precios e ingredientes para que no tengas que cargar
                  la carta a mano.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="planes" className="scroll-mt-16 border-y border-border bg-card/50 px-[6vw] py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-primary">
              Planes
            </p>
            <h2 className="mb-16 text-center font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
              Precios simples para cualquier local
            </h2>

            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 lg:gap-8">
              <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-8 shadow-sm transition-shadow hover:shadow-md">
                <h3 className="mb-2 font-serif text-2xl">Mensual</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl font-bold tracking-tight">19,99 EUR</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">Facturacion mes a mes</p>
                <div className="mb-4 inline-flex invisible items-center rounded-full px-2.5 py-0.5 text-xs font-medium" aria-hidden="true">
                  Espaciador
                </div>
                <Link
                  href="/admin/login?trial=1"
                  className="mb-8 flex w-full shrink-0 justify-center rounded-full bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  Empezar prueba gratis
                </Link>
                <ul className="mb-6 flex-1 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Carta digital ilimitada
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    QR general y opcion por mesa
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Asistente IA para clientes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Importacion inteligente
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Panel de administracion
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Soporte por email
                  </li>
                </ul>
                <p className="mt-auto text-center text-xs text-muted-foreground">
                  Prueba gratuita de 14 dias. Sin tarjeta.
                </p>
              </div>

              <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-8 shadow-sm transition-shadow hover:shadow-md">
                <h3 className="mb-2 font-serif text-2xl">Semestral</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl font-bold tracking-tight">14,99 EUR</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">89,94 EUR cada 6 meses</p>
                <div className="mb-4 inline-flex items-center rounded-full bg-green-100/50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Ahorra 25%
                </div>
                <Link
                  href="/admin/login?trial=1"
                  className="mb-8 flex w-full shrink-0 justify-center rounded-full bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  Empezar prueba gratis
                </Link>
                <ul className="mb-6 flex-1 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Todo lo del plan mensual
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Soporte prioritario
                  </li>
                </ul>
                <p className="mt-auto text-center text-xs text-muted-foreground">
                  Prueba gratuita de 14 dias. Sin tarjeta.
                </p>
              </div>

              <div className="relative z-10 flex h-full flex-col rounded-2xl border-2 border-primary bg-background p-8 shadow-lg md:scale-105">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  Mas popular
                </div>
                <h3 className="mb-2 font-serif text-2xl">Anual</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl font-bold tracking-tight">9,99 EUR</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">119,88 EUR al ano</p>
                <div className="mb-4 inline-flex items-center rounded-full bg-green-100/50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Ahorra 50%
                </div>
                <Link
                  href="/admin/login?trial=1"
                  className="mb-8 flex w-full shrink-0 justify-center rounded-full bg-foreground px-4 py-3 font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Empezar prueba gratis
                </Link>
                <ul className="mb-6 flex-1 space-y-3 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium">Todo lo del plan mensual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium">Soporte prioritario</span>
                  </li>
                </ul>
                <p className="mt-auto text-center text-xs text-muted-foreground">
                  Prueba gratuita de 14 dias. Sin tarjeta.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16 px-[6vw] py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-primary">
              FAQ
            </p>
            <h2 className="mb-12 text-center font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
              Preguntas frecuentes
            </h2>
            <Accordion multiple={false} className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-lg font-medium transition-colors hover:text-primary">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base leading-relaxed text-muted-foreground">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t border-border bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/10 px-[6vw] py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight">
              Listo para digitalizar tu local?
            </h2>
            <p className="mb-10 text-lg text-muted-foreground">
              En pocos minutos puedes tener carta digital, QR y recomendaciones IA
              para tu restaurante, bar, cafeteria o cocteleria.
            </p>
            <Link
              href="/admin/login?trial=1"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-10 py-4 text-base font-medium text-background shadow-lg transition-all hover:opacity-80 active:scale-[0.98]"
            >
              Prueba gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 px-[6vw] py-16">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-serif text-2xl text-foreground">MenuAI</span>
            </div>
            <p className="mb-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              Carta digital inteligente para hosteleria. Mejora la experiencia de tus clientes
              con QR, gestion simple y recomendaciones IA adaptadas a cada local.
            </p>
            <a href="mailto:hola@menuai.es" className="inline-flex items-center text-sm font-medium text-foreground transition-colors hover:text-primary">
              hola@menuai.es
            </a>
          </div>

          <div>
            <p className="mb-6 font-serif text-lg text-foreground">Producto</p>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li>
                <a href="#como-funciona" className="transition-colors hover:text-foreground">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#planes" className="transition-colors hover:text-foreground">
                  Planes
                </a>
              </li>
              <li>
                <a href="#faq" className="transition-colors hover:text-foreground">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <Link href="/admin/login" className="transition-colors hover:text-foreground">
                  Iniciar sesion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-6 font-serif text-lg text-foreground">Legal</p>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li>
                <Link href="/privacidad" className="transition-colors hover:text-foreground">
                  Politica de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="transition-colors hover:text-foreground">
                  Terminos y Condiciones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} MenuAI. Todos los derechos reservados.</p>
          <p>Hecho en Malaga.</p>
        </div>
      </footer>
    </div>
  )
}
