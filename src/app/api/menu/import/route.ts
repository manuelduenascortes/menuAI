import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq'
import { createServerSupabase } from '@/lib/supabase'

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024 // 5MB

const EXTRACTION_PROMPT = `Eres un experto en digitalización de cartas de restaurante.
Extrae TODOS los platos de la carta proporcionada y devuélvelos en formato JSON.

Reglas:
- Agrupa los platos por categorías (entrantes, principales, postres, bebidas, etc.)
- Asigna un emoji representativo a cada categoría
- Si no se ve el precio, pon 0
- Extrae ingredientes si se mencionan
- Detecta alérgenos de cada plato basándote en los ingredientes, símbolos o iconos visibles en la carta
- Los 14 alérgenos oficiales de la UE son: Gluten, Crustáceos, Huevo, Pescado, Cacahuetes, Soja, Lácteos, Frutos de cáscara, Apio, Mostaza, Sésamo, Dióxido de azufre, Altramuces, Moluscos
- Usa EXACTAMENTE esos nombres en el campo "allergens"
- Si no puedes determinar alérgenos, devuelve un array vacío
- Responde SOLO con JSON válido, sin markdown ni texto adicional

Formato exacto:
{
  "categories": [
    {
      "name": "Nombre categoría",
      "emoji": "🍕",
      "items": [
        {
          "name": "Nombre del plato",
          "description": "Descripción breve o null",
          "price": 12.50,
          "ingredients": ["ingrediente1", "ingrediente2"],
          "allergens": ["Gluten", "Lácteos"]
        }
      ]
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Payload size check
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload demasiado grande (máx 5MB)' }, { status: 413 })
    }

    const { type, content } = await req.json()

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 })
    }

    if (type !== 'image' && type !== 'text') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    let messages: Parameters<typeof groq.chat.completions.create>[0]['messages']

    if (type === 'image') {
      messages = [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrae todos los platos de esta carta:' },
            { type: 'image_url', image_url: { url: content } },
          ],
        },
      ]
    } else {
      messages = [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extrae los platos de esta carta:\n\n${content}` },
      ]
    }

    const model = type === 'image' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 8192,
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    // Parse JSON — handle possible markdown wrapping
    let parsed
    try {
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'AI no devolvió JSON válido', raw }, { status: 422 })
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Menu import error:', error)
    return NextResponse.json({ error: 'Error procesando la carta' }, { status: 500 })
  }
}
