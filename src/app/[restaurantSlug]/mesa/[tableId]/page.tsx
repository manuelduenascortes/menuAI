import { createServerSupabase } from '@/lib/supabase'
import { getFullMenuBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ restaurantSlug: string; tableId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { restaurantSlug } = await params
  const supabase = await createServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, description')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) return { title: 'Restaurante no encontrado' }

  return {
    title: `${restaurant.name} — Carta digital`,
    description: restaurant.description || `Consulta la carta de ${restaurant.name} y recibe recomendaciones personalizadas con IA.`,
  }
}

export default async function TablePage({ params }: Props) {
  const { restaurantSlug, tableId } = await params
  const supabase = await createServerSupabase()

  const result = await getFullMenuBySlug(supabase, restaurantSlug)
  if (!result) notFound()

  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .eq('restaurant_id', result.restaurant.id)
    .single()

  if (!table) notFound()

  return <MenuView restaurant={result.restaurant} categories={result.categories} tableId={tableId} tableNumber={table.number} />
}
