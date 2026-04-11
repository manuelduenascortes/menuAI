import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

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
  const hasActiveSubscription = restaurant?.subscription_status === 'active'
  const trialValid = restaurant?.trial_ends_at && new Date(restaurant.trial_ends_at) > new Date()

  if (restaurant && !hasActiveSubscription && !trialValid) {
    redirect('/trial-expired')
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav user={user} />
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
