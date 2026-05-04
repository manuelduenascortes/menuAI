import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/admin/dashboard'
  // Solo permitimos rutas internas /admin/* para evitar open-redirect a rutas no admin
  const next = /^\/admin(\/|$)/.test(nextParam) ? nextParam : '/admin/dashboard'

  if (code) {
    const supabase = await createServerSupabase()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Error exchanging auth code:', error.message)
      return NextResponse.redirect(`${origin}/admin/login?error=Enlace%20caducado%20o%20inv%C3%A1lido`)
    }
  }

  return NextResponse.redirect(`${origin}/admin/login`)
}
