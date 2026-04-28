import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { createOpenRouterChatCompletion, OR_MODEL } from '@/lib/openrouter'

const OFF_ALLERGEN_MAP: Record<string, string> = {
  'en:gluten': 'Gluten',
  'en:crustaceans': 'Crustáceos',
  'en:eggs': 'Huevos',
  'en:fish': 'Pescado',
  'en:peanuts': 'Cacahuetes',
  'en:soybeans': 'Soja',
  'en:milk': 'Lácteos',
  'en:nuts': 'Frutos secos',
  'en:celery': 'Apio',
  'en:mustard': 'Mostaza',
  'en:sesame': 'Sésamo',
  'en:sulphur-dioxide-and-sulphites': 'Sulfitos',
  'en:lupin': 'Altramuces',
  'en:molluscs': 'Moluscos',
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface OFFProduct {
  product_name?: string
  allergens_tags?: string[]
  image_url?: string
}

async function searchPixabayImage(query: string): Promise<string | null> {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    console.error('[enrich] PIXABAY_API_KEY no está definida')
    return null
  }
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&category=food&per_page=3&safesearch=true`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      console.error(`[enrich] Pixabay error ${response.status}: ${await response.text()}`)
      return null
    }
    const data = await response.json() as { hits?: Array<{ webformatURL: string }> }
    const imageUrl = data.hits?.[0]?.webformatURL ?? null
    console.log(`[enrich] Pixabay "${query}" → ${imageUrl ? 'foto encontrada' : 'sin resultados'}`)
    return imageUrl
  } catch (err) {
    console.error('[enrich] Pixabay fetch error:', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function generatePixabayQuery(name: string): Promise<string> {
  try {
    const completion = await createOpenRouterChatCompletion({
      model: OR_MODEL,
      messages: [
        { role: 'user', content: `Give me a short English search query (2-4 words) to find a beautiful food or drink photo on Pixabay for: "${name}". Use generic descriptive words (type, color, style) — never use brand names. Examples: "Bombay Sapphire" → "blue gin bottle", "Coca-Cola" → "cola drink glass", "Heineken" → "green beer bottle". Reply with only the search query, nothing else.` },
      ],
      temperature: 0.1,
      max_tokens: 15,
    })
    return completion.choices?.[0]?.message?.content?.trim() ?? name
  } catch {
    return name
  }
}

async function fetchOpenFoodFacts(name: string): Promise<OFFProduct[] | null> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&json=1&page_size=3&fields=product_name,allergens_tags,image_url`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    const data = await response.json() as { products?: OFFProduct[] }
    return data.products ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function downloadAndUploadImage(imageUrl: string, restaurantId: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`[enrich] Download error ${response.status} para ${imageUrl}`)
      return null
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      console.error(`[enrich] Content-type inesperado: ${contentType}`)
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_IMAGE_SIZE) {
      console.error(`[enrich] Imagen demasiado grande: ${buffer.length} bytes`)
      return null
    }
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`
    const admin = createAdminSupabase()
    const { error } = await admin.storage.from('menu-images').upload(path, buffer, { contentType: `image/${ext}` })
    if (error) {
      console.error('[enrich] Supabase upload error:', error)
      return null
    }
    const { data: { publicUrl } } = admin.storage.from('menu-images').getPublicUrl(path)
    console.log(`[enrich] Imagen subida correctamente: ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error('[enrich] downloadAndUploadImage error:', err)
    return null
  }
}

async function generateDescription(name: string, productContext?: string): Promise<string | null> {
  try {
    const context = productContext ? ` Contexto del producto: ${productContext}.` : ''
    const completion = await createOpenRouterChatCompletion({
      model: OR_MODEL,
      messages: [
        { role: 'system', content: 'Eres un experto en redacción de menús de restaurantes. Genera descripciones breves, atractivas y en español.' },
        { role: 'user', content: `Genera una descripción corta (máximo 2 frases) para el menú de un restaurante del producto: "${name}".${context} Solo responde con la descripción, sin comillas ni texto extra.` },
      ],
      temperature: 0.2,
      max_tokens: 150,
    })
    return completion.choices?.[0]?.message?.content?.trim() ?? null
  } catch (err) {
    console.error('[enrich] generateDescription error:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { name?: unknown; restaurantId?: unknown }
    const { name, restaurantId } = body

    if (!name || typeof name !== 'string' || !restaurantId || typeof restaurantId !== 'string') {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('user_id', user.id)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    console.log(`[enrich] Procesando: "${name}"`)

    let imageUrl: string | null = null
    let allergenNames: string[] = []
    let productContext: string | undefined
    let offImageUrl: string | undefined

    // Open Food Facts (alérgenos + foto de producto) + descripción IA — en paralelo
    const [products, description] = await Promise.all([
      fetchOpenFoodFacts(name),
      generateDescription(name, undefined),
    ])

    if (products && products.length > 0) {
      const product = products[0]

      if (Array.isArray(product.allergens_tags)) {
        allergenNames = product.allergens_tags
          .map((tag) => OFF_ALLERGEN_MAP[tag])
          .filter((n): n is string => Boolean(n))
      }

      if (product.product_name) productContext = product.product_name
      if (product.image_url) offImageUrl = product.image_url
    }

    // Intentar foto de OFF primero (foto real del producto de marca)
    if (offImageUrl) {
      console.log(`[enrich] OFF tiene foto para "${name}": ${offImageUrl}`)
      imageUrl = await downloadAndUploadImage(offImageUrl, restaurantId)
    }

    // Si OFF no tenía foto, buscar en Pixabay
    if (!imageUrl) {
      const pixabayQuery = await generatePixabayQuery(name)
      console.log(`[enrich] Query Pixabay generada: "${pixabayQuery}"`)
      const pixabayUrl = await searchPixabayImage(pixabayQuery)
      if (pixabayUrl) {
        imageUrl = await downloadAndUploadImage(pixabayUrl, restaurantId)
      }
    }

    const source = imageUrl ? (offImageUrl ? 'openfoodfacts' : 'pixabay') : 'none'
    console.log(`[enrich] Resultado "${name}" → imageUrl:${!!imageUrl} allergens:${allergenNames.length} source:${source}`)

    return NextResponse.json({ description, imageUrl, allergenNames, source })
  } catch (err) {
    console.error('[enrich] Error general:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
