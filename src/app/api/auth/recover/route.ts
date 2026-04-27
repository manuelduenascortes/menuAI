import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'
import { createAdminSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let email: string
  try {
    const body = await request.json()
    email = body?.email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email inválido' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
  }

  const { origin } = new URL(request.url)
  const redirectTo = `${origin}/api/auth/callback/recovery`

  try {
    const admin = createAdminSupabase()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error || !data?.properties?.action_link) {
      console.log('Recovery: generateLink sin action_link', { email, error: error?.message })
      return NextResponse.json({ ok: true })
    }

    const actionLink = data.properties.action_link
    const templatePath = path.join(process.cwd(), 'src', 'emails', 'password-reset-template.html')
    const template = await fs.readFile(templatePath, 'utf8')
    const html = template.replaceAll('{{ .ConfirmationURL }}', actionLink)

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      console.error('Recovery: faltan RESEND_API_KEY o EMAIL_FROM en el entorno')
      return NextResponse.json({ ok: true })
    }

    const resend = new Resend(apiKey)
    const { data: sendData, error: sendError } = await resend.emails.send({
      from,
      to: email,
      subject: 'Restablecer contraseña — MenuAI',
      html,
    })

    if (sendError) {
      console.error('Recovery: Resend send error', sendError)
    } else {
      console.log('Recovery: email enviado', { email, id: sendData?.id })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Recovery: excepción', err)
    return NextResponse.json({ ok: true })
  }
}
