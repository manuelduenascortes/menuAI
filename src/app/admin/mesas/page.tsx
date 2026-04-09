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
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Mesas & Códigos QR</h1>
        <p className="text-muted-foreground mt-1">Gestiona las mesas y genera los QR para cada una</p>
      </div>
      <MesasManager restaurant={restaurant} initialTables={tables ?? []} />
    </div>
  )
}
