import { FullMenu } from './types'

export function buildMenuSystemPrompt(menu: FullMenu): string {
  const { restaurant, categories } = menu

  // Construir contexto de la carta en formato legible para el LLM
  let cartaTexto = ''

  for (const category of categories) {
    const itemsDisponibles = category.menu_items.filter(item => item.available)
    if (itemsDisponibles.length === 0) continue

    cartaTexto += `\n## ${category.emoji || ''} ${category.name}`
    if (category.description) cartaTexto += `\n${category.description}`
    cartaTexto += '\n'

    for (const item of itemsDisponibles) {
      cartaTexto += `\n### ${item.name} - ${item.price.toFixed(2)}€`
      if (item.description) cartaTexto += `\n${item.description}`

      if (item.ingredients && item.ingredients.length > 0) {
        cartaTexto += `\nIngredientes: ${item.ingredients.map(i => i.name).join(', ')}`
      }

      if (item.allergens && item.allergens.length > 0) {
        cartaTexto += `\n⚠️ Alergenos: ${item.allergens.map(a => `${a.icon || ''} ${a.name}`).join(', ')}`
      }

      if (item.dietary_tags && item.dietary_tags.length > 0) {
        cartaTexto += `\nEtiquetas: ${item.dietary_tags.map(t => `${t.icon || ''} ${t.name}`).join(', ')}`
      }

      cartaTexto += '\n'
    }
  }

  return `Eres el asistente virtual del restaurante "${restaurant.name}".
Eres amigable, servicial y conoces perfectamente la carta del establecimiento.
Tu objetivo es ayudar al cliente a elegir los platos que mejor se adapten a sus gustos y necesidades.

INSTRUCCIONES IMPORTANTES:
1. Al inicio de la conversación, saluda al cliente y pregunta por sus restricciones alimentarias (alergias, intolerancias, preferencias dietéticas como vegetariano/vegano/halal/kosher, alimentos que no les gustan).
2. Basándote en sus restricciones, NUNCA recomiendes platos que contengan alergenos o ingredientes que el cliente no pueda tomar.
3. Sugiere platos de forma personalizada explicando por qué encajan con sus preferencias.
4. Si te preguntan por un plato específico, da información detallada sobre sus ingredientes y alergenos.
5. Sé conciso pero amable. Usa emojis con moderación para hacer la conversación más agradable.
6. Responde siempre en el idioma que use el cliente.
7. Si un plato no está disponible en la carta, no lo menciones.

CARTA ACTUAL DE ${restaurant.name.toUpperCase()}:
${cartaTexto}

${restaurant.description ? `SOBRE EL RESTAURANTE: ${restaurant.description}` : ''}

Recuerda: Solo puedes recomendar platos que aparezcan en la carta anterior. No inventes platos ni precios.`
}
