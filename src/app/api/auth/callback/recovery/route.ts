import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createServerSupabase()

  // PKCE flow: Supabase sends ?code=XXX
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  // OTP flow: Supabase sends ?token_hash=XXX&type=recovery
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as 'recovery' })
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  return NextResponse.redirect(
    `${origin}/admin/login?error=${encodeURIComponent('Enlace caducado o inválido. Solicita uno nuevo.')}`,
  )
}
