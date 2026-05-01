/**
 * MenuAI Improvement Orchestrator
 *
 * Opus 4.7 orchestrates; Sonnet 4.6 subagents implement each task.
 * Usage:  ANTHROPIC_API_KEY=sk-... node scripts/improve.mjs
 *
 * Tasks:
 *   - task_stripe    : Fix Stripe webhook to store plan-aware subscription status
 *   - task_ratelimit : Show friendly message on 429 in customer chat
 *   - task_search    : Add search bar to customer menu view
 *   - task_cache     : Extract menu cache to shared module + invalidate on admin writes
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Tool definitions ────────────────────────────────────────────────────────

const FILE_TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from the repository. Path relative to repo root.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path relative to repo root, e.g. src/app/api/chat/route.ts' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write (or overwrite) a file. Path relative to repo root. Creates parent dirs automatically.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string', description: 'Full file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command from the repo root. Use for node --test or npx tsc --noEmit.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
]

const ORCHESTRATOR_TOOLS = [
  ...FILE_TOOLS,
  {
    name: 'dispatch_subagent',
    description: 'Delegate a coding task to a Sonnet 4.6 subagent. Returns its result string.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Unique task ID (e.g. task_stripe)' },
        task_prompt: { type: 'string', description: 'Full, self-contained instructions for the subagent' },
      },
      required: ['task_id', 'task_prompt'],
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────────

function executeTool(name, input) {
  if (name === 'read_file') {
    const fullPath = path.join(ROOT, input.path)
    if (!existsSync(fullPath)) return `Error: file not found at ${input.path}`
    return readFileSync(fullPath, 'utf-8')
  }

  if (name === 'write_file') {
    const fullPath = path.join(ROOT, input.path)
    mkdirSync(path.dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, input.content, 'utf-8')
    return `OK: written ${input.path}`
  }

  if (name === 'run_command') {
    try {
      const out = execSync(input.command, { cwd: ROOT, encoding: 'utf-8', timeout: 90_000 })
      return out || '(no output — success)'
    } catch (e) {
      return `Exit ${e.status ?? '?'}:\nSTDOUT: ${e.stdout ?? ''}\nSTDERR: ${e.stderr ?? ''}`
    }
  }

  return `Unknown tool: ${name}`
}

// ─── Subagent runner (Sonnet 4.6) ───────────────────────────────────────────

async function runSubagent(taskId, taskPrompt) {
  console.log(`\n  ◆ [${taskId}] Subagent starting…`)

  const messages = [{ role: 'user', content: taskPrompt }]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools: FILE_TOOLS,
      system: [
        {
          type: 'text',
          text: `Eres un agente de código preciso. Implementa solo los cambios descritos — no refactorices código no relacionado.
El repositorio está en: ${ROOT}
Cuando termines, responde con un JSON en texto plano (sin bloques de código):
{"task_id":"...","status":"success","files_changed":[...],"summary":"..."}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text ?? ''
      console.log(`  ✓ [${taskId}] Done: ${text.slice(0, 120).replace(/\n/g, ' ')}`)
      return text
    }

    if (response.stop_reason === 'tool_use') {
      const results = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        console.log(`    · [${taskId}] ${block.name}(${JSON.stringify(block.input).slice(0, 60)})`)
        const result = executeTool(block.name, block.input)
        results.push({ type: 'tool_result', tool_use_id: block.id, content: String(result).slice(0, 24_000) })
      }
      messages.push({ role: 'user', content: results })
    }
  }
}

// ─── Orchestrator runner (Opus 4.7) ─────────────────────────────────────────

async function runOrchestrator(prompt) {
  console.log('\n═══════════════════════════════════════════')
  console.log(' MenuAI Improvement Orchestrator — Opus 4.7')
  console.log('═══════════════════════════════════════════\n')

  const messages = [{ role: 'user', content: prompt }]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      tools: ORCHESTRATOR_TOOLS,
      system: [
        {
          type: 'text',
          text: `Eres el orquestador de mejoras del proyecto MenuAI.
Coordina subagentes para implementar las mejoras. Cuando uses dispatch_subagent, puedes agrupar varias llamadas en un solo turno para que se lancen en paralelo.
Usa run_command para validar al final. Reporta el resultado final en español.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      betas: ['prompt-caching-2024-07-31'],
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text ?? ''
      console.log('\n══ Informe final del orquestador ══\n')
      console.log(text)
      return text
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

      // Dispatch all subagent calls in parallel; run file/command tools sequentially
      const pending = toolUseBlocks.map(block => {
        if (block.name === 'dispatch_subagent') {
          console.log(`\n◉ Dispatching subagent: ${block.input.task_id}`)
          return { block, promise: runSubagent(block.input.task_id, block.input.task_prompt) }
        }
        console.log(`\n◉ Orchestrator tool: ${block.name}(${JSON.stringify(block.input).slice(0, 60)})`)
        return { block, result: executeTool(block.name, block.input) }
      })

      const toolResults = await Promise.all(
        pending.map(async ({ block, promise, result }) => ({
          type: 'tool_result',
          tool_use_id: block.id,
          content: String(promise ? await promise : result).slice(0, 24_000),
        }))
      )

      messages.push({ role: 'user', content: toolResults })
    }
  }
}

// ─── Main orchestrator prompt ────────────────────────────────────────────────

const ORCHESTRATOR_PROMPT = `Implementa las siguientes mejoras en el proyecto MenuAI.
Raíz del repositorio: ${ROOT}

## BATCH A — Lanza los 3 subagentes EN PARALELO (archivos distintos, sin conflictos):

### task_stripe — Fix Stripe subscription plan type
Archivo: src/app/api/stripe/webhook/route.ts

Actualmente todos los eventos guardan subscription.status directamente (siempre "active").
Cambia los 3 eventos para derivar un status con el plan incluido:

En checkout.session.completed y customer.subscription.updated:
  - Lee el objeto Stripe.Subscription (ya tienes la variable 'subscription' en ambos)
  - Obtén: const item = subscription.items.data[0]
  - Obtén: const interval = item.price.recurring?.interval
  - Obtén: const count = item.price.recurring?.interval_count ?? 1
  - Deriva subscriptionStatus:
      if (interval === 'year') → 'active_annual'
      else if (count >= 6)     → 'active_semestral'
      else                     → 'active_monthly'
  - Usa subscriptionStatus en el campo subscription_status del update de Supabase

En customer.subscription.deleted: deja 'canceled' sin cambios.

NO toques src/lib/usage.ts — ya tiene las claves active_monthly/semestral/annual correctas.

---

### task_ratelimit — Rate limit UX en el chat del cliente
Archivo: src/components/cliente/ChatInterface.tsx

Busca el bloque try/catch dentro de la función sendMessage (async function sendMessage).
Actualmente cuando !res.ok lanza: throw new Error('Error en la respuesta')

Reemplaza la lógica post-fetch por:
  if (!res.ok) {
    if (res.status === 429) {
      const msg = await res.text()
      const userFriendly = msg === 'Too Many Requests'
        ? 'Has enviado demasiados mensajes seguidos. Espera un momento e inténtalo de nuevo.'
        : msg
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: userFriendly },
      ])
      return
    }
    throw new Error('Error en la respuesta')
  }

Esto mantiene el early-return del AbortError (línea: if (err instanceof DOMException...) return) intacto.
IMPORTANTE: la línea setMessages(prev => [...prev, { role: 'assistant', content: '' }]) ocurre DESPUÉS del if (!res.ok),
así que cuando sea 429 necesitas añadir el mensaje placeholder antes del return.
El flujo correcto es:
  1. if (!res.ok) { ...handle 429... return }
  2. if (!res.body) throw new Error(...)
  3. setMessages(prev => [...prev, { role: 'assistant', content: '' }])   ← ya existía, no mover

---

### task_search — Buscador en la carta del cliente
Archivo: src/components/cliente/MenuView.tsx

1. Añade estado: const [searchQuery, setSearchQuery] = useState('')
   (junto al resto de useState, alrededor de línea 67-72)

2. Actualiza el memo filteredCategories (líneas ~106-115):
   - Si searchQuery no está vacío, ignora la restricción de selectedCategory
   - Añade un filtro adicional sobre el nombre del ítem:
     item.name.toLowerCase().includes(searchQuery.toLowerCase())
   - El memo debe tener searchQuery en su lista de dependencias

3. Añade un input de búsqueda DENTRO del <header>, justo ANTES del <nav aria-label="Categorías...">
   Usa este JSX (ajusta clases si no encajan con el estilo circundante):

   <div className="relative mt-2.5">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
     <input
       type="search"
       value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
       placeholder="Buscar en la carta..."
       className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1"
       style={{ focusRingColor: 'var(--restaurant-primary)' }}
     />
     {searchQuery && (
       <button
         onClick={() => setSearchQuery('')}
         className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
         aria-label="Limpiar búsqueda"
       >
         <X className="h-4 w-4" />
       </button>
     )}
   </div>

4. Actualiza el mensaje de "sin resultados" (líneas ~273-284):
   Si filteredCategories está vacío Y searchQuery no está vacío, el mensaje debe decir:
   'No se encontraron platos para tu búsqueda'
   (en vez de "No hay productos con los filtros seleccionados")
   Puedes hacer un ternario: searchQuery ? 'No se encontraron...' : 'No hay productos...'

---

## BATCH B — Lanza este subagente DESPUÉS de que el BATCH A haya terminado:

### task_cache — Invalidación de caché del menú
Lee primero los archivos indicados antes de escribir cualquier cambio.

**Paso 1 — Crear src/lib/menu-cache.ts**
Lee src/app/api/chat/route.ts y extrae a un nuevo módulo:
  - la constante menuCache (Map)
  - la constante CACHE_TTL
  - la función getFullMenu (importa los mismos deps que usa: createAdminSupabase, FullMenu)
  - añade: export function invalidateMenuCache(slug: string) { menuCache.delete(slug) }
  - exporta: menuCache (no es necesario pero puede ser útil), CACHE_TTL, getFullMenu, invalidateMenuCache

**Paso 2 — Editar src/app/api/chat/route.ts**
  - Añade import { getFullMenu } from '@/lib/menu-cache'
  - Elimina las declaraciones de menuCache, CACHE_TTL y la función getFullMenu
  - El resto del archivo no cambia

**Paso 3 — Crear src/app/api/admin/menu/invalidate-cache/route.ts**
  Lee primero src/app/api/products/enrich/route.ts para ver cómo se importa y usa createServerSupabase (o createAdminSupabase).
  Crea el handler:
  - POST handler que lee { slug } del body JSON
  - Autentica con el cliente Supabase de servidor (verifica que el user esté logado)
  - Llama invalidateMenuCache(slug) de '@/lib/menu-cache'
  - Devuelve NextResponse.json({ ok: true })
  - Si no autenticado: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

**Paso 4 — Editar src/components/admin/CartaManager.tsx**
  a) Añade este helper DENTRO del componente CartaManager (antes del return JSX):
     async function invalidateCache() {
       fetch('/api/admin/menu/invalidate-cache', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ slug: restaurant.slug }),
       }).catch(() => {})
     }

  b) Añade la llamada invalidateCache() (sin await) tras el bloque de éxito en estas funciones:
     - addCategory: tras el setCategories(...)
     - deleteCategory: tras el setCategories(...)
     - toggleItemAvailable: tras el setCategories(...)
     - handleBulkDelete: tras el setCategories(...)
     - handleDragEnd: tras el setCategories(...)
     - handleQuickImageUpload: tras el setCategories(...)
     - handleQuickImageDelete: tras el setCategories(...)
     - ItemFormDialog > handleAdd: tras la llamada a onSave() (o al final del bloque de éxito)
     - ItemFormDialog > handleEdit: ídem

---

## VALIDACIÓN FINAL (ejecuta tú mismo con run_command tras el Batch B):
1. node --test        → todos los tests deben pasar
2. npx tsc --noEmit   → cero errores de tipos

Reporta el estado de cada tarea y los resultados de validación.`

runOrchestrator(ORCHESTRATOR_PROMPT).catch(err => {
  console.error('Orchestrator error:', err)
  process.exit(1)
})
