import { createServerSupabase } from '@/lib/supabase'
import { getFullMenuBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ restaurantSlug: string }>
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
    openGraph: {
      title: `${restaurant.name} — Carta digital`,
      description: restaurant.description || `Carta digital de ${restaurant.name} con asistente IA.`,
      type: 'website',
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  const { restaurantSlug } = await params
  const supabase = await createServerSupabase()

  const result = await getFullMenuBySlug(supabase, restaurantSlug)
  if (!result) notFound()

  return <MenuView restaurant={result.restaurant} categories={result.categories} tableId={null} />
}
