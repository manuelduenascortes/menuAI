import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'recovery'
    | 'signup'
    | 'email'
    | null
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/admin/dashboard'

  if (token_hash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/admin/login?error=${encodeURIComponent('Enlace caducado o inválido. Solicita uno nuevo.')}`,
  )
}
