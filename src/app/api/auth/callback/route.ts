import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin/dashboard'

  if (code) {
    const supabase = await createServerSupabase()
    
    // Intercambiamos el código por una sesión (necesario en flujo PKCE)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirigimos a la URL destino
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Error exchanging code:', error)
      return NextResponse.redirect(`${origin}/admin/login?error=Enlace%20caducado%20o%20inválido`)
    }
  }

  // Si no hay código, volvemos al inicio
  return NextResponse.redirect(`${origin}/admin/login`)
}
