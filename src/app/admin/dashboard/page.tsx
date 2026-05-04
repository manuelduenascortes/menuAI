import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RestaurantSetupForm from '@/components/admin/RestaurantSetupForm'
import OnboardingChecklist from '@/components/admin/OnboardingChecklist'
import { BookOpen, QrCode, CheckCircle2, ExternalLink, ImageOff, MessageSquare, Type } from 'lucide-react'
import SubscriptionCard from '@/components/admin/SubscriptionCard'
import { getAccessModeLabel, getVenueConfig, supportsTableQr } from '@/lib/venue-config'
import { getChatUsage, getChatLimit } from '@/lib/usage'
import { Progress } from '@/components/ui/progress'

function calcTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

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

  const [noPhotoRes, noDescRes, chatUsage] = restaurant
    ? await Promise.all([
        supabase
          .from('menu_items')
          .select('id', { count: 'exact' })
          .in(
            'category_id',
            (await supabase.from('categories').select('id').eq('restaurant_id', restaurant.id)).data?.map(c => c.id) ?? [],
          )
          .is('image_url', null),
        supabase
          .from('menu_items')
          .select('id', { count: 'exact' })
          .in(
            'category_id',
            (await supabase.from('categories').select('id').eq('restaurant_id', restaurant.id)).data?.map(c => c.id) ?? [],
          )
          .is('description', null),
        getChatUsage(restaurant.id),
      ])
    : [{ count: 0 }, { count: 0 }, 0]

  const chatLimit = getChatLimit(restaurant?.subscription_status ?? null)

  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      {!restaurant ? (
        <>
          <div className="mb-8">
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Gestiona tu local desde aquí</p>
          </div>
          <div className="max-w-xl">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Configura tu local</CardTitle>
                <CardDescription>
                  Para comenzar, configura los datos basicos de tu negocio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RestaurantSetupForm userId={user.id} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <DashboardContent
          restaurant={restaurant}
          itemCount={itemCount ?? 0}
          tableCount={tableCount ?? 0}
          noPhotoCount={noPhotoRes.count ?? 0}
          noDescCount={noDescRes.count ?? 0}
          chatUsage={chatUsage as number}
          chatLimit={chatLimit}
          trialDaysLeft={calcTrialDaysLeft(restaurant.trial_ends_at ?? null)}
        />
      )}
    </div>
  )
}

function DashboardContent({
  restaurant,
  itemCount,
  tableCount,
  noPhotoCount,
  noDescCount,
  chatUsage,
  chatLimit,
  trialDaysLeft,
}: {
  restaurant: {
    id: string
    name: string
    slug: string
    venue_type?: 'restaurant' | 'bar_cafe' | 'cocktail_bar' | null
    menu_access_mode?: 'general_qr' | 'table_qr' | 'both' | null
    description?: string | null
    logo_url?: string | null
    primary_color?: string | null
    font_style?: 'clasico' | 'elegante' | 'moderno' | 'casual' | 'minimalista' | null
    address?: string | null
    phone?: string | null
    establishment_type?: string | null
    subscription_status?: string | null
    trial_ends_at?: string | null
    stripe_customer_id?: string | null
  }
  itemCount: number
  tableCount: number
  noPhotoCount: number
  noDescCount: number
  chatUsage: number
  chatLimit: number
  trialDaysLeft: number
}) {
  const venueConfig = getVenueConfig(restaurant.venue_type)
  const accessDescription = getAccessModeLabel(restaurant.menu_access_mode)
  const hasTableQr = supportsTableQr(restaurant.menu_access_mode)

  return (
    <div className="space-y-4">

      {/* Cabecera compacta */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Dashboard</h1>
          <p className="truncate text-sm text-muted-foreground mt-0.5">
            {restaurant.name} · <span className="font-mono text-xs">/{restaurant.slug}</span>
          </p>
        </div>
        <Link href={`/${restaurant.slug}`} target="_blank" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Ver como cliente</span>
            <span className="sm:hidden">Ver</span>
          </Button>
        </Link>
      </div>

      {/* Estadísticas — fila 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/admin/carta" className="block outline-none cursor-pointer">
          <Card className="transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">{itemCount}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{venueConfig.itemPlural} en carta</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/mesas" className="block outline-none cursor-pointer">
          <Card className="transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">{hasTableQr ? tableCount : 1}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{accessDescription}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="transition-all hover:border-primary/30 hover:shadow-md">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-foreground">Activo</p>
                <p className="text-sm text-muted-foreground mt-0.5">Asistente IA</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas — fila 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="transition-all hover:border-primary/30 hover:shadow-md">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{chatUsage}</p>
                <p className="text-sm text-muted-foreground mt-0.5">consultas IA este mes</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
            </div>
            <Progress value={Math.min(Math.round((chatUsage / chatLimit) * 100), 100)} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">{chatUsage} / {chatLimit}</p>
          </CardContent>
        </Card>

        <Link href="/admin/carta" className="block outline-none cursor-pointer">
          <Card className={`transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 ${noPhotoCount > 0 ? 'border-amber-200' : ''}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-semibold tabular-nums ${noPhotoCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>{noPhotoCount}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{venueConfig.itemPlural} sin foto</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${noPhotoCount > 0 ? 'bg-amber-100' : 'bg-secondary'}`}>
                  <ImageOff className={`w-4 h-4 ${noPhotoCount > 0 ? 'text-amber-600' : 'text-primary'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/carta" className="block outline-none cursor-pointer">
          <Card className={`transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 ${noDescCount > 0 ? 'border-amber-200' : ''}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-semibold tabular-nums ${noDescCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>{noDescCount}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{venueConfig.itemPlural} sin descripción</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${noDescCount > 0 ? 'bg-amber-100' : 'bg-secondary'}`}>
                  <Type className={`w-4 h-4 ${noDescCount > 0 ? 'text-amber-600' : 'text-primary'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Suscripción + Primeros pasos en paralelo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubscriptionCard
          subscriptionStatus={restaurant.subscription_status ?? null}
          trialEndsAt={restaurant.trial_ends_at ?? null}
          stripeCustomerId={restaurant.stripe_customer_id ?? null}
          daysLeft={trialDaysLeft}
        />
        <OnboardingChecklist
          hasRestaurant
          hasItems={itemCount > 0}
          hasTables={tableCount > 0}
          accessMode={restaurant.menu_access_mode}
        />
      </div>

    </div>
  )
}
