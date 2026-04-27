import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'
import { createAdminSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

let cachedTemplate: string | null = null

async function loadTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate
  const filePath = path.join(process.cwd(), 'src', 'emails', 'password-reset-template.html')
  cachedTemplate = await readFile(filePath, 'utf8')
  return cachedTemplate
}

export async function POST(request: Request) {
  let email: string | undefined
  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.error('Recovery: missing RESEND_API_KEY or EMAIL_FROM env var')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const { origin } = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  const redirectTo = `${siteUrl}/api/auth/callback/recovery`

  const admin = createAdminSupabase()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) {
    const msg = error.message?.toLowerCase() ?? ''
    // No leak: si el usuario no existe, respondemos OK sin enviar email.
    if (msg.includes('not found') || msg.includes('user not found') || msg.includes('no user')) {
      return NextResponse.json({ ok: true })
    }
    console.error('Recovery generateLink error:', error)
    return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500 })
  }

  const actionLink = data?.properties?.action_link
  if (!actionLink) {
    console.error('Recovery: action_link missing in generateLink response')
    return NextResponse.json({ error: 'Respuesta inválida del proveedor de auth' }, { status: 500 })
  }

  let template: string
  try {
    template = await loadTemplate()
  } catch (err) {
    console.error('Recovery: failed to load email template', err)
    return NextResponse.json({ error: 'Template not available' }, { status: 500 })
  }

  const html = template.replaceAll('{{ .ConfirmationURL }}', actionLink)

  const resend = new Resend(apiKey)
  const { error: sendError } = await resend.emails.send({
    from,
    to: email,
    subject: 'Restablecer contraseña — MenuAI',
    html,
  })

  if (sendError) {
    console.error('Recovery: Resend send error', sendError)
    return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
