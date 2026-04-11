import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const restaurantId = formData.get('restaurantId') as string | null

    if (!file || !restaurantId) {
      return NextResponse.json({ error: 'Faltan file o restaurantId' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const admin = createAdminSupabase()
    const { error: uploadErr } = await admin.storage
      .from('menu-images')
      .upload(path, buffer, { contentType: file.type })

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage
      .from('menu-images')
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
