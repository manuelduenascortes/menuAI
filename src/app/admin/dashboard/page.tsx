import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RestaurantSetupForm from '@/components/admin/RestaurantSetupForm'

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Gestiona tu restaurante desde aquí</p>
      </div>

      {!restaurant ? (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Configura tu restaurante</CardTitle>
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
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-orange-600">{itemCount ?? 0}</div>
                <div className="text-sm text-gray-500 mt-1">Platos en carta</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-orange-600">{tableCount ?? 0}</div>
                <div className="text-sm text-gray-500 mt-1">Mesas con QR</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600">✓</div>
                <div className="text-sm text-gray-500 mt-1">Chatbot activo</div>
              </CardContent>
            </Card>
          </div>

          {/* Restaurant info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🏪</span> {restaurant.name}
                </CardTitle>
                {restaurant.description && (
                  <CardDescription>{restaurant.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                {restaurant.address && <p>📍 {restaurant.address}</p>}
                {restaurant.phone && <p>📞 {restaurant.phone}</p>}
                <p className="text-xs text-gray-400">
                  URL pública: <span className="font-mono">/{restaurant.slug}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acceso rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/carta" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    📋 Gestionar carta
                  </Button>
                </Link>
                <Link href="/admin/mesas" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    🪑 Gestionar mesas y QRs
                  </Button>
                </Link>
                <Link href={`/${restaurant.slug}`} target="_blank" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    👁️ Ver carta como cliente
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
