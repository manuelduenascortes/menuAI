import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import AuthErrorRedirect from '@/components/admin/AuthErrorRedirect'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already redirects unauthenticated users for non-login routes.
  // If user exists, show full admin chrome; otherwise render children bare (login page).
  if (!user) {
    return <>{children}</>
  }

  // Check trial expiration (skip for /admin/expired to avoid redirect loop)
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('trial_ends_at, subscription_status')
    .eq('user_id', user.id)
    .single()

  // Allow access if: active subscription, or trial not yet expired, or no restaurant yet (onboarding)
  const hasActiveSubscription = ['active', 'trialing'].includes(restaurant?.subscription_status ?? '')
  const trialValid = restaurant?.trial_ends_at && new Date(restaurant.trial_ends_at) > new Date()

  if (restaurant && !hasActiveSubscription && !trialValid) {
    redirect('/trial-expired')
  }

  // Trial warning banner (< 3 days remaining)
  const trialDaysLeft = restaurant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(restaurant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null
  const showTrialWarning = !hasActiveSubscription && trialValid && trialDaysLeft !== null && trialDaysLeft <= 3

  return (
    <div className="min-h-screen bg-background">
      <AuthErrorRedirect />
      <AdminNav user={user} />
      <main id="main-content" className="pt-14">
        {showTrialWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-center text-sm text-amber-800 dark:text-amber-300">
            Tu prueba gratuita expira en {trialDaysLeft === 0 ? 'menos de 24 horas' : `${trialDaysLeft} día${trialDaysLeft === 1 ? '' : 's'}`}.{' '}
            <a href="/trial-expired" className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
              Elige un plan para continuar
            </a>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
