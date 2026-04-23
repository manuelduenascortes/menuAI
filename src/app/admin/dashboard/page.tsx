import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RestaurantSetupForm from '@/components/admin/RestaurantSetupForm'
import OnboardingChecklist from '@/components/admin/OnboardingChecklist'
import { BookOpen, QrCode, CheckCircle2, ExternalLink, MapPin, Phone, Store, Pencil, CreditCard } from 'lucide-react'
import SubscriptionCard from '@/components/admin/SubscriptionCard'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { count: itemCount } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact' })
    .in(
      'category_id',
      restaurant
        ? (await supabase.from('categories').select('id').eq('restaurant_id', restaurant.id)).data?.map(c => c.id) ?? []
        : []
    )

  const { count: tableCount } = await supabase
    .from('tables')
    .select('id', { count: 'exact' })
    .eq('restaurant_id', restaurant?.id ?? '')

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu restaurante desde aquí</p>
      </div>

      {!restaurant ? (
        <div className="max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Configura tu restaurante</CardTitle>
              <CardDescription>
                Para comenzar, necesitas configurar los datos de tu establecimiento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantSetupForm userId={user.id} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ─── STATS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/admin/carta" className="block outline-none cursor-pointer">
              <Card className="transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-semibold text-foreground tabular-nums">{itemCount ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">Platos en carta</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/mesas" className="block outline-none cursor-pointer">
              <Card className="transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-semibold text-foreground tabular-nums">{tableCount ?? 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">Mesas con QR</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Card className="transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-foreground">Activo</p>
                    <p className="text-sm text-muted-foreground mt-1">Chatbot IA</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── SUSCRIPCIÓN ─── */}
          <SubscriptionCard
            subscriptionStatus={restaurant.subscription_status}
            trialEndsAt={restaurant.trial_ends_at}
            stripeCustomerId={restaurant.stripe_customer_id}
          />

          {/* ─── ONBOARDING ─── */}
          <OnboardingChecklist
            hasRestaurant={true}
            hasItems={(itemCount ?? 0) > 0}
            hasTables={(tableCount ?? 0) > 0}
          />

          {/* ─── RESTAURANT INFO + QUICK ACTIONS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Restaurant info — 3 cols */}
            <Card className="md:col-span-3 transition-all hover:border-primary/30 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-serif text-xl flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    {restaurant.name}
                  </CardTitle>
                  <Link href="/admin/ajustes" className="p-2 -mt-2 -mr-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-200" title="Editar datos del negocio">
                    <Pencil className="w-4 h-4" />
                  </Link>
                </div>
                {(restaurant.establishment_type || restaurant.description) && (
                  <CardDescription className="mt-1">
                    {restaurant.establishment_type && (
                      <span className="font-medium">{restaurant.establishment_type}</span>
                    )}
                    {restaurant.establishment_type && restaurant.description && ' · '}
                    {restaurant.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {restaurant.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {restaurant.address}
                  </p>
                )}
                {restaurant.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    {restaurant.phone}
                  </p>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  URL pública: <span className="font-mono">/{restaurant.slug}</span>
                </p>
              </CardContent>
            </Card>

            {/* Quick actions — 2 cols */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <Link
                href="/admin/carta"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Gestionar carta</p>
                  <p className="text-xs text-muted-foreground">Categorías, platos e ingredientes</p>
                </div>
              </Link>
              <Link
                href="/admin/mesas"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Gestionar mesas</p>
                  <p className="text-xs text-muted-foreground">Códigos QR y etiquetas</p>
                </div>
              </Link>
              <Link
                href={`/${restaurant.slug}`}
                target="_blank"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Ver como cliente</p>
                  <p className="text-xs text-muted-foreground">Abre la carta pública</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
