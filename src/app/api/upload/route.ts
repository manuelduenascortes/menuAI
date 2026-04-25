import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { RESTAURANT_LOGOS_BUCKET, extractRestaurantLogoPath } from '@/lib/restaurant-theme'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

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
    const uploadType = formData.get('uploadType') as string | null
    const previousLogoUrl = formData.get('previousLogoUrl') as string | null

    if (!file || !restaurantId) {
      return NextResponse.json({ error: 'Faltan file o restaurantId' }, { status: 400 })
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, logo_url')
      .eq('id', restaurantId)
      .eq('user_id', user.id)
      .single()

    if (!restaurant) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o GIF.' }, { status: 400 })
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo MIME no permitido.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo excede el límite de 5 MB.' }, { status: 400 })
    }

    const isLogoUpload = uploadType === 'restaurant-logo'
    const bucket = isLogoUpload ? RESTAURANT_LOGOS_BUCKET : 'menu-images'
    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const admin = createAdminSupabase()
    const { error: uploadErr } = await admin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type })

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage
      .from(bucket)
      .getPublicUrl(path)

    if (isLogoUpload) {
      const previousPath = extractRestaurantLogoPath(previousLogoUrl || restaurant.logo_url)

      if (previousPath && previousPath !== path) {
        const { error: deleteErr } = await admin.storage
          .from(RESTAURANT_LOGOS_BUCKET)
          .remove([previousPath])

        if (deleteErr) {
          console.error('Previous logo delete error:', deleteErr)
        }
      }
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
