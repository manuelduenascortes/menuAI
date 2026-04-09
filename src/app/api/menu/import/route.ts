import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq'

const EXTRACTION_PROMPT = `Eres un experto en digitalización de cartas de restaurante.
Extrae TODOS los platos de la carta proporcionada y devuélvelos en formato JSON.

Reglas:
- Agrupa los platos por categorías (entrantes, principales, postres, bebidas, etc.)
- Asigna un emoji representativo a cada categoría
- Si no se ve el precio, pon 0
- Extrae ingredientes si se mencionan
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
          "ingredients": ["ingrediente1", "ingrediente2"]
        }
      ]
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { type, content } = await req.json()

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 })
    }

    let messages: Parameters<typeof groq.chat.completions.create>[0]['messages']

    if (type === 'image') {
      // Image → vision model
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
      // Text → text model
      messages = [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extrae los platos de esta carta:\n\n${content}` },
      ]
    }

    const model = type === 'image' ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile'

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
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
