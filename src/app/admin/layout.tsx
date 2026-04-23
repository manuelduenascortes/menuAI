import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AuthErrorRedirect from '@/components/admin/AuthErrorRedirect'
import AdminNav from '@/components/admin/AdminNav'
import { createServerSupabase } from '@/lib/supabase'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <>{children}</>
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('trial_ends_at, subscription_status, menu_access_mode')
    .eq('user_id', user.id)
    .single()

  const hasActiveSubscription = ['active', 'trialing'].includes(restaurant?.subscription_status ?? '')
  const trialValid = restaurant?.trial_ends_at ? new Date(restaurant.trial_ends_at) > new Date() : false

  if (restaurant && !hasActiveSubscription && !trialValid) {
    redirect('/trial-expired')
  }

  const trialDaysLeft = restaurant?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(restaurant.trial_ends_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null

  const showTrialWarning =
    !hasActiveSubscription && trialValid && trialDaysLeft !== null && trialDaysLeft <= 3

  return (
    <div className="min-h-screen bg-background">
      <AuthErrorRedirect />
      <AdminNav user={user} restaurant={restaurant ?? null} />
      <main id="main-content" className="pt-14">
        {showTrialWarning && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Tu prueba gratuita expira en{' '}
            {trialDaysLeft === 0 ? 'menos de 24 horas' : `${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'}`}
            .{' '}
            <Link
              href="/trial-expired"
              className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              Elige un plan para continuar
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
