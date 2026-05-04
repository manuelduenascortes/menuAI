import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { invalidateMenuCache } from '@/lib/menu-cache'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { slug } = await req.json() as { slug?: unknown }
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 })
  }

  // Solo el dueño del restaurante puede invalidar su cache
  const { data: owned } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owned) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  invalidateMenuCache(slug)
  return NextResponse.json({ ok: true })
}
