# Plan de mejoras — MenuAI

Contexto: app Next.js 16.2 + React 19 + Supabase + shadcn/ui + Tailwind v4. UI en español. Stack admin en `src/app/admin/`, vista cliente en `src/app/[restaurantSlug]/`, componentes en `src/components/`.

---

## 🤖 Equipo de agentes — arquitectura de ejecución

Todas las mejoras de este plan se ejecutan mediante un orquestador **Opus 4.7** que coordina un equipo de agentes especializados **Sonnet 4.6**. El script de entrada es `scripts/improve.mjs` (ya existe en el repo).

### Agentes del equipo

#### 🧠 agent_ideas — Generador de ideas
**Rol:** Antes de implementar cada mejora, analiza el estado actual del código y propone el enfoque más limpio. No escribe código, solo devuelve un plan de implementación con archivos y líneas exactas.
**Tools:** `read_file`, `run_command` (solo lectura, ej. `grep`)
**Cuándo se activa:** Al inicio de cada batch, antes de despachar los agentes de implementación. Opus le pregunta: *"¿Cómo implementarías esta mejora de la forma más limpia posible, reutilizando lo que ya existe?"*
**Output:** JSON con `{ approach, files_to_edit, reuse_existing, risks }`

#### 🔨 agent_implementer — Implementador
**Rol:** Recibe el plan de `agent_ideas` y ejecuta los cambios. Un agente por tarea para máximo paralelismo.
**Tools:** `read_file`, `write_file`, `run_command`
**Output:** JSON con `{ task_id, status, files_changed, summary }`

#### 🧪 agent_tester — Probador
**Rol:** Tras cada batch de implementación, ejecuta el suite de tests (`node --test`), verifica tipos (`npx tsc --noEmit`), ejecuta lint (`npm run lint`) y hace una revisión de coherencia leyendo los archivos modificados. Si encuentra problemas, los reporta con el archivo y línea exacta.
**Tools:** `read_file`, `run_command`
**Cuándo se activa:** Después de cada batch (A y B), nunca en paralelo con implementadores.
**Output:** JSON con `{ tests_pass, types_clean, lint_warnings, issues_found: [{ file, line, description }] }`

#### 🔍 agent_reviewer — Revisor de código
**Rol:** Lee los diffs de los archivos modificados y detecta: regresiones potenciales, código duplicado con lo que ya existe, patrones inconsistentes con el resto del codebase, y problemas de seguridad (inyección, auth bypass, datos expuestos).
**Tools:** `read_file`
**Cuándo se activa:** En paralelo con `agent_tester` tras cada batch.
**Output:** JSON con `{ approved: boolean, findings: [{ severity: 'error'|'warning'|'info', file, description }] }`

#### 🗄️ agent_db — Especialista en base de datos
**Rol:** Para mejoras que requieren cambios de schema (zonas de mesas, horarios, etc.), genera la migración SQL, verifica que no rompe RLS policies existentes, y prepara el script de backfill si hay datos existentes.
**Tools:** `read_file`, `write_file`
**Cuándo se activa:** Solo cuando una tarea modifica `supabase/schema.sql`.
**Output:** Archivo `supabase/migrations/YYYYMMDD_descripcion.sql` + JSON con `{ breaking_changes, rls_impact, backfill_needed }`

#### 📝 agent_docs — Actualizador de documentación
**Rol:** Tras cada batch aprobado, actualiza `CLAUDE.md` si cambia la arquitectura, actualiza los comentarios relevantes en el código, y mantiene este mismo archivo `docs/mejoras-pendientes.md` marcando las tareas como completadas.
**Tools:** `read_file`, `write_file`
**Cuándo se activa:** Al final, después de que `agent_tester` y `agent_reviewer` aprueban.

### Flujo de ejecución

```
Opus Orchestrator
│
├─ 1. agent_ideas analiza las tareas del batch → devuelve planes
│
├─ 2. BATCH A: agent_implementer × N (en paralelo, sin conflictos de archivo)
│      └─ al terminar → agent_tester + agent_reviewer (en paralelo)
│             └─ si hay errores → agent_implementer corrige (loop máx. 2 intentos)
│
├─ 3. BATCH B: agent_implementer (secuencial si hay conflictos)
│      └─ al terminar → agent_tester + agent_reviewer (en paralelo)
│             └─ si hay errores → agent_implementer corrige
│
├─ 4. Si alguna tarea requiere schema → agent_db genera migración
│
└─ 5. agent_docs actualiza CLAUDE.md y este archivo
```

### Cómo añadir un agente nuevo al script

En `scripts/improve.mjs`, añadir el nombre del agente al objeto `AGENT_ROLES` y su system prompt. Opus lo puede invocar vía `dispatch_subagent({ task_id: 'agent_nuevo', task_prompt: '...' })`.

---

---

## 🔴 Alta prioridad (bugs / gaps funcionales)

### 1. Paginación / orden de menu_items en la vista del cliente
**Problema:** La query de `menu_items` en el Server Component no tiene `order('display_order')`, así que los productos no respetan el orden del admin aunque éste guarde `display_order`.
**Archivo:** `src/app/[restaurantSlug]/mesa/[tableId]/page.tsx` (o el Server Component equivalente que hace el fetch).
**Fix:** Añadir `.order('display_order')` en la subquery de `menu_items` dentro de la query de categorías.

### 2. Descripción editable en la lista de categorías
**Problema:** La descripción de categoría se puede crear al añadir, pero no hay forma de editarla desde la vista de lista (solo desde el diálogo de añadir).
**Archivos:** `src/components/admin/CartaManager.tsx` — el `CardHeader` de cada categoría.
**Fix:** Añadir un botón de editar inline en el header de la tarjeta que abra un dialog o un input inline para editar nombre, emoji y descripción.

### 3. Invalidación de caché al usar el enriquecedor de IA masivo
**Problema:** `AIEnrichPanel` llama directamente a Supabase para actualizar items, pero no llama al endpoint `/api/admin/menu/invalidate-cache`.
**Archivo:** `src/components/admin/AIEnrichPanel.tsx` — función `handleProcess` (línea ~110).
**Fix:** Tras el bucle de enriquecimiento, hacer `fetch('/api/admin/menu/invalidate-cache', { method: 'POST', body: JSON.stringify({ slug: restaurant.slug }) })`.

### 4. `updateItemImage` no invalida caché
**Problema:** La función `updateItemImage` en CartaManager actualiza la foto de un item (usada por `ItemImageThumb`) pero no llama a `invalidateCache()`.
**Archivo:** `src/components/admin/CartaManager.tsx` — función `updateItemImage` (línea ~330).
**Fix:** Añadir `invalidateCache()` tras el `toast.success('Imagen actualizada')`.

---

## 🟡 Media prioridad (UX / features útiles)

### 5. Actualización masiva de precio
**Descripción:** Cuando hay items seleccionados, mostrar un botón "Cambiar precio" en la barra de acciones de selección. Abre un dialog con un input numérico. Al confirmar, hace batch-update en Supabase e invalida caché.
**Archivo:** `src/components/admin/CartaManager.tsx` — barra de bulk actions (línea ~470).

### 6. Toggle de disponibilidad masivo
**Descripción:** Junto al botón de "Cambiar precio", añadir "Marcar disponible / No disponible" para los items seleccionados.
**Archivo:** `src/components/admin/CartaManager.tsx` — misma barra bulk actions.

### 7. Mejora del dashboard con stats reales
**Descripción:** El dashboard muestra conteos estáticos. Añadir:
- Uso de chat del mes actual (ya existe en `getChatUsage`)
- Número de items sin foto / sin descripción (útil para saber qué enriquecer)
- Última fecha de modificación de la carta
**Archivo:** `src/app/admin/dashboard/page.tsx` (Server Component — puede hacer las queries).

### 8. Exportar menú como JSON / PDF
**Descripción:** Botón en ajustes o en carta que genera un archivo descargable con toda la carta. Útil como backup.
**Archivo nuevo:** `src/app/api/admin/menu/export/route.ts` + botón en `src/app/admin/ajustes/page.tsx`.

### 9. Validación antes de publicar
**Descripción:** Mostrar un resumen de warnings al admin cuando la carta tenga items sin foto, sin descripción o sin precio. Podría ser un banner en la página de carta.
**Archivo:** `src/app/admin/carta/CartaPageClient.tsx`.

### 10. Búsqueda en el panel admin de carta
**Descripción:** Igual que el buscador añadido en la vista cliente, un input de búsqueda en el admin para localizar rápidamente un ítem cuando la carta tiene muchas categorías.
**Archivo:** `src/components/admin/CartaManager.tsx` — añadir estado de búsqueda y filtrar la lista.

---

## 🟢 Baja prioridad (polish / features avanzadas)

### 11. Zonas / agrupaciones de mesas
**Descripción:** Permitir agrupar mesas en zonas (Terraza, Salón, Barra). Requiere migración de schema (columna `zone` en `tables`).
**Archivos:** `supabase/schema.sql`, `src/components/admin/MesasManager.tsx`.

### 12. Horarios del local
**Descripción:** Campo de horarios en ajustes del restaurante. Se mostraría en la vista cliente debajo del nombre.
**Archivos:** `supabase/schema.sql` (columna `opening_hours jsonb`), `src/app/admin/ajustes/page.tsx`, `src/components/cliente/MenuView.tsx`.

### 13. Página de error personalizada para el cliente
**Descripción:** Si el slug no existe o el restaurante no tiene carta, mostrar una página amigable en lugar del 404 genérico.
**Archivo:** `src/app/[restaurantSlug]/not-found.tsx`.

### 14. Fix conocido: límites de chat por plan
**Descripción (documentado en CLAUDE.md):** El Stripe webhook ahora guarda `active_monthly/semestral/annual` correctamente, pero hay que verificar que los suscriptores existentes se migren (sus `subscription_status` siguen siendo `"active"`). Añadir un script de migración o un handler en el webhook `customer.subscription.updated` que corrija los registros al siguiente evento.
**Archivo:** `src/app/api/stripe/webhook/route.ts`.

### 15. Internacionalización (i18n) básica
**Descripción:** La carta del cliente está en español hardcoded. Añadir soporte para inglés como segundo idioma, controlado por un campo del restaurante.
**Archivos:** `src/lib/venue-config.ts`, `src/components/cliente/MenuView.tsx`, `src/components/cliente/ChatInterface.tsx`.

---

## 🏗️ Deuda técnica

### 16. Unificar las 3 variables de URL del entorno
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL` y `NEXT_PUBLIC_APP_URL` hacen lo mismo con distintos fallbacks. Unificar a una sola con todos los fallbacks en un helper `src/lib/site-url.ts`.

### 17. Dividir CartaManager.tsx
El componente tiene ~1650 líneas. Extraer `ItemFormDialog` a su propio archivo `src/components/admin/ItemFormDialog.tsx` y `ItemImageThumb` a `src/components/admin/ItemImageThumb.tsx`.

### 18. Tests de integración para API routes
Las rutas `/api/chat`, `/api/products/enrich` y el webhook de Stripe no tienen tests. Añadir tests con `node:test` usando mocks de Supabase y fetch.
