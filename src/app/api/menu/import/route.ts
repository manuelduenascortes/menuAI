import { NextRequest, NextResponse } from 'next/server'
import {
  createOpenRouterChatCompletion,
  type OpenRouterMessage,
  OR_MODEL,
} from '@/lib/openrouter'
import { createServerSupabase } from '@/lib/supabase'

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024

const EXTRACTION_PROMPT = `Eres un experto en digitalizacion de cartas y ofertas de hosteleria.
Extrae TODOS los productos visibles o descritos en la carta proporcionada y devuelvelos en JSON.

Reglas:
- Agrupa los productos por categorías reales de la carta (entrantes, cafes, cocteles, vinos, postres, tapas, refrescos, etc.)
- Asigna un emoji representativo a cada categoría
- Si no se ve el precio, usa 0
- Extrae ingredientes si se mencionan
- Detecta alérgenos cuando puedan deducirse de ingredientes, simbolos o iconos visibles
- Los 14 alérgenos oficiales de la UE son: Gluten, Crustaceos, Huevo, Pescado, Cacahuetes, Soja, Lacteos, Frutos de cascara, Apio, Mostaza, Sesamo, Dioxido de azufre, Altramuces, Moluscos
- Usa EXACTAMENTE esos nombres en el campo "allergens"
- Si no puedes determinar alérgenos, devuelve un array vacio
- No inventes productos ni categorías
- Responde SOLO con JSON valido, sin markdown ni texto adicional

Formato exacto:
{
  "categories": [
    {
      "name": "Nombre categoría",
      "emoji": "🍸",
      "items": [
        {
          "name": "Nombre del producto",
          "description": "Descripción breve o null",
          "price": 12.5,
          "ingredients": ["ingrediente1", "ingrediente2"],
          "allergens": ["Gluten", "Lacteos"]
        }
      ]
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload demasiado grande (max 5MB)' }, { status: 413 })
    }

    const { type, content } = await req.json()

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 })
    }

    if (type !== 'image' && type !== 'text') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    let messages: OpenRouterMessage[]

    if (type === 'image') {
      messages = [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrae todos los productos de esta carta u oferta:' },
            { type: 'image_url', image_url: { url: content } },
          ],
        },
      ]
    } else {
      messages = [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extrae los productos de esta carta u oferta:\n\n${content}` },
      ]
    }

    const completion = await createOpenRouterChatCompletion({
      model: OR_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
    })

    const raw = completion.choices?.[0]?.message?.content ?? ''

    let parsed
    try {
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'La IA no devolvió JSON válido', raw }, { status: 422 })
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Menu import error:', error)
    return NextResponse.json({ error: 'Error procesando la carta' }, { status: 500 })
  }
}
