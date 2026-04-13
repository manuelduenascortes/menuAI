'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  subscriptionStatus: string | null
  trialEndsAt: string | null
  stripeCustomerId: string | null
}

export default function SubscriptionCard({ subscriptionStatus, trialEndsAt, stripeCustomerId }: Props) {
  const [loading, setLoading] = useState(false)

  const isActive = subscriptionStatus === 'active'
  const isTrial = !isActive && trialEndsAt && new Date(trialEndsAt) > new Date()
  const daysLeft = isTrial
    ? Math.max(0, Math.ceil((new Date(trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="transition-all hover:border-primary/30 hover:shadow-md">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              {isActive ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Clock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isActive ? 'Suscripción activa' : isTrial ? `Prueba gratuita — ${daysLeft} días restantes` : 'Sin suscripción'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Tu plan está al día' : isTrial ? 'Acceso completo durante la prueba' : 'Elige un plan para continuar'}
              </p>
            </div>
          </div>
          <div>
            {isActive && stripeCustomerId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={openPortal}
                disabled={loading}
                className="cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Gestionar facturación
              </Button>
            ) : (
              <Link href="/trial-expired">
                <Button variant="default" size="sm" className="cursor-pointer">
                  Ver planes
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
