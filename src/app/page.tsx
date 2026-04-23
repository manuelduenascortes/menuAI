'use client';

import { useState } from 'react';
import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  MessageCircle,
  Settings,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Menu,
  X
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-[6vw] h-16 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md">
        <BrandLogo />
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</a>
          <a href="#planes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Planes</a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Preguntas frecuentes</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/admin/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group flex items-center gap-1"
          >
            Iniciar sesión <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-foreground p-1"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-16 md:hidden">
          <div className="flex flex-col p-6 gap-6">
            <a 
              href="#como-funciona" 
              className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Cómo funciona
            </a>
            <a 
              href="#planes" 
              className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Planes
            </a>
            <a 
              href="#faq" 
              className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Preguntas frecuentes
            </a>
            <Link 
              href="/admin/login" 
              className="text-lg font-medium text-primary py-2 flex items-center gap-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Iniciar sesión <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )}

      {/* ─── HERO ─── */}
      <main id="main-content">
      <section className="px-[6vw] pt-32 pb-20 border-b border-border">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card mb-10 text-sm text-muted-foreground">
          <BrandLogo showText={false} iconClassName="w-3.5 h-3.5" />
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
              <p className="font-serif text-3xl text-foreground">14</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Alérgenos EU cubiertos</p>
            </div>
            <div>
              <p className="font-serif text-3xl text-foreground">0 apps</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">Tus clientes no instalan nada</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up delay-4 flex items-center md:justify-end w-full md:col-span-1">
            <Link
              href="/admin/login?trial=1"
              className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-base font-medium transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer"
            >
              Prueba gratis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section
        id="como-funciona"
        className="px-[6vw] py-24 scroll-mt-16"
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

      {/* ─── PLANES ─── */}
      <section id="planes" className="px-[6vw] py-24 bg-card/50 border-y border-border scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-primary tracking-widest uppercase mb-3 text-center">
            Planes
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight text-center mb-16">
            Precios simples y transparentes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {/* Mensual */}
            <div className="flex flex-col h-full p-8 rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-serif text-2xl mb-2">Mensual</h3>
              <div className="mb-4">
                <span className="text-4xl font-serif font-bold tracking-tight">19,99 €</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Facturación mes a mes</p>
              <div className="inline-flex items-center px-2.5 py-0.5 invisible text-xs font-medium rounded-full mb-4" aria-hidden="true">Ahorra spacer</div>
              <Link href="/admin/login?trial=1" className="flex justify-center w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-full mb-8 font-medium transition-colors shrink-0">
                Empezar prueba gratis
              </Link>
              <ul className="flex-1 space-y-3 text-sm text-muted-foreground mb-6">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Carta digital ilimitada</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> QR por mesa</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Chatbot IA para clientes</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Importación inteligente</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Panel de administración</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Soporte por email</li>
              </ul>
              <p className="text-xs text-center text-muted-foreground mt-auto">Prueba gratuita de 14 días. Sin tarjeta de crédito.</p>
            </div>

            {/* Semestral */}
            <div className="flex flex-col h-full p-8 rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-serif text-2xl mb-2">Semestral</h3>
              <div className="mb-4">
                <span className="text-4xl font-serif font-bold tracking-tight">14,99 €</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">89,94 € cada 6 meses</p>
              <div className="inline-flex items-center px-2.5 py-0.5 bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full mb-4">Ahorra 25%</div>
              <Link href="/admin/login?trial=1" className="flex justify-center w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-full mb-8 font-medium transition-colors shrink-0">
                Empezar prueba gratis
              </Link>
              <ul className="flex-1 space-y-3 text-sm text-muted-foreground mb-6">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Todo lo del plan Mensual</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Soporte prioritario</li>
              </ul>
              <p className="text-xs text-center text-muted-foreground mt-auto">Prueba gratuita de 14 días. Sin tarjeta de crédito.</p>
            </div>

            {/* Anual */}
            <div className="flex flex-col h-full p-8 rounded-2xl border-2 border-primary bg-background relative shadow-lg scale-100 md:scale-105 z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Más popular
              </div>
              <h3 className="font-serif text-2xl mb-2">Anual</h3>
              <div className="mb-4">
                <span className="text-4xl font-serif font-bold tracking-tight">9,99 €</span>
                <span className="text-muted-foreground">/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">119,88 € al año</p>
              <div className="inline-flex items-center px-2.5 py-0.5 bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full mb-4">Ahorra 50%</div>
              <Link href="/admin/login?trial=1" className="flex justify-center w-full bg-foreground text-background hover:bg-foreground/90 px-4 py-3 rounded-full mb-8 font-medium transition-colors shrink-0">
                Empezar prueba gratis
              </Link>
              <ul className="flex-1 space-y-3 text-sm text-foreground mb-6">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="font-medium">Todo lo del plan Mensual</span></li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="font-medium">Soporte prioritario</span></li>
              </ul>
              <p className="text-xs text-center text-muted-foreground mt-auto">Prueba gratuita de 14 días. Sin tarjeta de crédito.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="px-[6vw] py-24 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-medium text-primary tracking-widest uppercase mb-3 text-center">
            FAQ
          </p>
          <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight tracking-tight text-center mb-12">
            Preguntas frecuentes
          </h2>
          <Accordion multiple={false} className="w-full">
            {[
              {
                q: "¿Cuánto dura la prueba gratuita?",
                a: "La prueba gratuita dura 14 días. Durante ese tiempo tienes acceso completo a todas las funcionalidades. No se requiere tarjeta de crédito para empezar.",
              },
              {
                q: "¿Mis clientes necesitan instalar alguna app?",
                a: "No. Tus clientes simplemente escanean el código QR con la cámara de su móvil y acceden a tu carta digital al instante desde el navegador.",
              },
              {
                q: "¿Cómo funcionan las recomendaciones del chatbot?",
                a: "Nuestro asistente IA conoce cada plato de tu carta, sus ingredientes y alérgenos. Pregunta al cliente sus preferencias o restricciones y le recomienda platos personalizados en tiempo real.",
              },
              {
                q: "¿Puedo cambiar mi carta en cualquier momento?",
                a: "Sí. Puedes añadir, editar o eliminar categorías y platos desde el panel de administración sin límite. Los cambios se reflejan al instante en la carta pública.",
              },
              {
                q: "¿Puedo cancelar mi suscripción?",
                a: "Sí, puedes cancelar en cualquier momento. Si cancelas, mantendrás el acceso hasta el final de tu período de facturación.",
              },
              {
                q: "¿Funciona en cualquier dispositivo?",
                a: "Sí. La carta digital es una web responsive que se adapta a cualquier smartphone, tablet u ordenador. Compatible con iOS y Android.",
              },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-lg font-medium text-left hover:text-primary transition-colors">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed text-base">{faq.a}</p>
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
            href="/admin/login?trial=1"
            className="group inline-flex items-center gap-2 bg-foreground text-background px-10 py-4 rounded-full text-base font-medium transition-all hover:opacity-80 active:scale-[0.98] cursor-pointer shadow-lg"
          >
            Prueba gratis
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="px-[6vw] py-16 border-t border-border bg-card/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            <BrandLogo iconClassName="w-6 h-6" textClassName="text-2xl text-foreground" className="mb-4" />
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mb-6">
              Carta digital inteligente para hostelería. Revoluciona la experiencia de tus clientes con nuestro recomendador IA integrado.
            </p>
            <a href="mailto:hola@menuai.es" className="inline-flex items-center text-sm font-medium text-foreground hover:text-primary transition-colors">
              hola@menuai.es
            </a>
          </div>

          {/* Links */}
          <div>
            <p className="font-serif text-lg text-foreground mb-6">Producto</p>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><a href="#como-funciona" className="hover:text-foreground transition-colors">Cómo funciona</a></li>
              <li><a href="#planes" className="hover:text-foreground transition-colors">Planes</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">Preguntas frecuentes</a></li>
              <li><Link href="/admin/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-serif text-lg text-foreground mb-6">Legal</p>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><Link href="/privacidad" className="hover:text-foreground transition-colors">Política de Privacidad</Link></li>
              <li><Link href="/terminos" className="hover:text-foreground transition-colors">Términos y Condiciones</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MenuAI. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ en Málaga.</p>
        </div>
      </footer>
    </div>
  );
}

