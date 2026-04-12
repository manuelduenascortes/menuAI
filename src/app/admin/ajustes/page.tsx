import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RestaurantEditForm from '@/components/admin/RestaurantEditForm'
import { Settings } from 'lucide-react'

export default async function AjustesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, address, phone')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Ajustes</h1>
        <p className="text-muted-foreground mt-1">Edita los datos de tu restaurante</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Datos del negocio
          </CardTitle>
          <CardDescription>
            URL pública: <span className="font-mono">/{restaurant.slug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantEditForm restaurant={restaurant} />
        </CardContent>
      </Card>
    </div>
  )
}
