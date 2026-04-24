'use client'

import { useState } from 'react'
import { UtensilsCrossed, Clock, LogOut, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

const plans = [
  {
    name: 'Mensual',
    price: '19,99 EUR',
    period: '/mes',
    detail: 'Facturacion mes a mes',
    priceEnv: 'monthly',
    featured: false,
    badge: null,
  },
  {
    name: 'Semestral',
    price: '14,99 EUR',
    period: '/mes',
    detail: '89,94 EUR cada 6 meses',
    priceEnv: 'semestral',
    featured: false,
    badge: 'Ahorra 25%',
  },
  {
    name: 'Anual',
    price: '9,99 EUR',
    period: '/mes',
    detail: '119,88 EUR al año',
    priceEnv: 'annual',
    featured: true,
    badge: 'Ahorra 50%',
  },
]

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  semestral: process.env.NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL,
  annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL,
}

export default function TrialExpiredPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleCheckout(priceKey: string) {
    const priceId = PRICE_IDS[priceKey]
    if (!priceId) return

    setLoadingPlan(priceKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="absolute top-6 left-6 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-8">
            <Clock className="w-10 h-10 text-destructive" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <span className="font-serif text-xl">MenuAI</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Tu prueba gratuita ha finalizado
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Elige un plan para seguir usando MenuAI y mantener tu carta digital con IA activa para tu local.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plans.map(plan => (
            <div
              key={plan.priceEnv}
              className={`flex flex-col p-8 rounded-2xl border bg-background relative transition-shadow ${
                plan.featured
                  ? 'border-2 border-primary shadow-lg scale-100 md:scale-105 z-10'
                  : 'border-border shadow-sm hover:shadow-md'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Mas popular
                </div>
              )}
              <h3 className="font-serif text-2xl mb-2">{plan.name}</h3>
              <div className="mb-2">
                <span className="text-4xl font-serif font-bold tracking-tight">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{plan.detail}</p>
              {plan.badge ? (
                <div className="inline-flex items-center px-2.5 py-0.5 bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full mb-6 w-fit">
                  {plan.badge}
                </div>
              ) : (
                <div className="mb-6" />
              )}
              <Button
                onClick={() => handleCheckout(plan.priceEnv)}
                disabled={loadingPlan !== null || !PRICE_IDS[plan.priceEnv]}
                className={`w-full py-3 rounded-full font-medium cursor-pointer ${
                  plan.featured
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {loadingPlan === plan.priceEnv ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Suscribirse'
                )}
              </Button>
              <ul className="flex-1 space-y-2 text-sm text-muted-foreground mt-6">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Carta digital ilimitada</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> QR y asistente IA</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Panel de administracion</li>
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesion
          </Button>
          <p className="text-sm text-muted-foreground">
            Tienes dudas? Escribenos a{' '}
            <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
              hola@menuai.es
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
