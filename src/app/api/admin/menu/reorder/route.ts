import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { invalidateMenuCache } from '@/lib/menu-cache'
import { z } from 'zod'

export const runtime = 'nodejs'

const ReorderReq = z.object({
  kind: z.enum(['category', 'item']),
  ids: z.array(z.string().uuid()).min(1).max(500),
  // Para items: scope al category_id; para categorías: solo el restaurant
  categoryId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const parsed = ReorderReq.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { kind, ids, categoryId } = parsed.data

  const admin = createAdminSupabase()

  // 1) Resolver restaurante del usuario
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  // 2) Verificar ownership de TODOS los IDs antes de mutar
  if (kind === 'category') {
    const { data: owned, error: ownErr } = await admin
      .from('categories')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .in('id', ids)

    if (ownErr || !owned || owned.length !== ids.length) {
      return NextResponse.json({ error: 'Categorías inválidas' }, { status: 403 })
    }
  } else {
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId requerido para items' }, { status: 400 })
    }

    // El category debe pertenecer al usuario, y los items al category
    const { data: cat } = await admin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle()
    if (!cat) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const { data: ownedItems, error: itemErr } = await admin
      .from('menu_items')
      .select('id')
      .eq('category_id', categoryId)
      .in('id', ids)

    if (itemErr || !ownedItems || ownedItems.length !== ids.length) {
      return NextResponse.json({ error: 'Ítems inválidos' }, { status: 403 })
    }
  }

  // 3) Update en paralelo (una sola conexión a Supabase desde el server)
  const table = kind === 'category' ? 'categories' : 'menu_items'
  const results = await Promise.all(
    ids.map((id, index) =>
      admin.from(table).update({ display_order: index }).eq('id', id),
    ),
  )

  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: 'Error guardando orden' }, { status: 500 })
  }

  // Invalidar caché del menú público
  await invalidateMenuCache(restaurant.slug)

  return NextResponse.json({ ok: true })
}
