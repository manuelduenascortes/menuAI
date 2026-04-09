import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MesasManager from '@/components/admin/MesasManager'

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mesas & Códigos QR</h1>
        <p className="text-gray-500 mt-1">Gestiona las mesas y genera los QR para cada una</p>
      </div>
      <MesasManager restaurant={restaurant} initialTables={tables ?? []} />
    </div>
  )
}
