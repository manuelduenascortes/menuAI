import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RestaurantEditForm from '@/components/admin/RestaurantEditForm'
import PasswordChangeForm from '@/components/admin/PasswordChangeForm'
import { Settings, Shield, MessageSquare } from 'lucide-react'
import { getChatUsage, getChatLimit } from '@/lib/usage'
import { Progress } from '@/components/ui/progress'

export default async function AjustesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, venue_type, menu_access_mode, description, address, phone, establishment_type, subscription_status')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

  const chatCount = await getChatUsage(restaurant.id)
  const chatLimit = getChatLimit((restaurant.subscription_status as string | null) ?? null)
  const chatPercent = Math.min(Math.round((chatCount / chatLimit) * 100), 100)

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Ajustes</h1>
        <p className="text-muted-foreground mt-1">Edita los datos de tu local</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Datos del negocio
            </CardTitle>
            <CardDescription>
              URL publica: <span className="font-mono">/{restaurant.slug}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantEditForm restaurant={restaurant} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Actualiza la contrasena de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
              Uso del asistente IA
            </CardTitle>
            <CardDescription>
              Consultas del chatbot este mes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={chatPercent} className="h-2" />
            <p className={`text-sm ${chatCount >= chatLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {chatCount} de {chatLimit} consultas usadas este mes
              {chatCount >= chatLimit && ' — limite alcanzado'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
