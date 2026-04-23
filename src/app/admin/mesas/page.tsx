import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MesasManager from '@/components/admin/MesasManager'
import Breadcrumbs from '@/components/admin/Breadcrumbs'
import { getAccessManagementTitle, getAccessModeDescription } from '@/lib/venue-config'

export default async function MesasPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('number')

  const accessTitle = getAccessManagementTitle(restaurant.menu_access_mode)

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: accessTitle },
      ]} />
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">{accessTitle}</h1>
        <p className="text-muted-foreground mt-1">{getAccessModeDescription(restaurant.menu_access_mode)}</p>
      </div>
      <MesasManager restaurant={restaurant} initialTables={tables ?? []} />
    </div>
  )
}
