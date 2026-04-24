# Security & Legal Compliance — MenuAI

**Date:** 2026-04-24  
**Status:** Approved

## Context

MenuAI necesita cubrir 5 áreas de cumplimiento y seguridad antes de escalar:
1. Mostrar al restaurador su consumo mensual de chatbot en el panel admin.
2. Añadir Content-Security-Policy para evitar inyección de scripts externos.
3. Documentar explícitamente la política CORS de las rutas API.
4. Añadir `robots.txt` para controlar el crawling.
5. Crear páginas legales obligatorias en España: aviso-legal, política de cookies y contacto, más un banner de consentimiento de cookies.

---

## 1. Uso mensual del chatbot en Admin Ajustes

**Archivo afectado:** `src/app/admin/ajustes/page.tsx`

- El servidor llama a `getChatUsage(restaurant.id)` (ya existe en `src/lib/usage.ts`) y obtiene el `count` del mes actual.
- Obtiene el límite del plan leyendo `restaurant.subscription_status` de la query existente (añadir campo al `.select()`).
- Mapea el status al límite via `getChatLimit(subscriptionStatus)` (ya exportada en `src/lib/usage.ts`).
- Renderiza un nuevo `Card` con:
  - Título: "Uso del asistente IA"
  - Barra de progreso con el componente shadcn `<Progress>` (`src/components/ui/progress.tsx`).
  - Texto: "X de Y consultas usadas este mes".
  - Si count >= limit: texto en rojo (`text-destructive`).

---

## 2. Content-Security-Policy

**Archivo afectado:** `next.config.ts`

Añadir en el bloque `headers()` existente (source `/(.*)`):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://<supabase-storage-hostname>/storage/v1/object/public/**;
  font-src 'self';
  connect-src 'self' https://<supabase-url> wss://<supabase-url>;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

- El hostname de Supabase se extrae igual que `supabaseHostname` (ya disponible en el fichero).
- `unsafe-inline` y `unsafe-eval` son necesarios para Next.js 16 + shadcn (inline hydration scripts y estilos).
- Las fuentes Google (DM Serif, Outfit) se auto-hospedan via `next/font`, por lo que no se necesitan dominios externos en `font-src`.

---

## 3. CORS — restricción API routes

**Archivo afectado:** `next.config.ts`

Añadir un segundo bloque en `headers()` para `source: '/api/(.*)'`:

```
Access-Control-Allow-Origin: https://menuai.es
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Esto documenta que las rutas API solo aceptan requests del dominio propio. Todas las llamadas actuales son same-origin (el cliente llama a `/api/chat` desde el mismo dominio), por lo que este header no rompe nada.

---

## 4. robots.txt

**Archivo nuevo:** `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
```

- Bloquea crawlers en el panel admin y las rutas API.
- Sin `Sitemap:` por ahora (se añadirá cuando exista sitemap generado).

---

## 5. Páginas legales + banner de cookies

### Páginas nuevas (mismo patrón visual que `/privacidad`)

| Ruta | Archivo | Contenido |
|------|---------|-----------|
| `/aviso-legal` | `src/app/aviso-legal/page.tsx` | Titular: [RAZÓN SOCIAL], [CIF], [DOMICILIO], email: hola@menuai.es |
| `/cookies` | `src/app/cookies/page.tsx` | Solo cookies técnicas (Supabase auth/session), sin tracking ni publicidad |
| `/contacto` | `src/app/contacto/page.tsx` | Email hola@menuai.es, ubicación Málaga, España |

Cada página:
- Reutiliza el layout de nav + `ArrowLeft` de vuelta idéntico al de `/privacidad`.
- Exporta `metadata` con title apropiado.
- Contenido en español, sin placeholders de empresa salvo `aviso-legal`.

### Banner de cookies

**Archivo nuevo:** `src/components/CookieBanner.tsx`

- Client Component (`'use client'`).
- `useEffect` comprueba `localStorage.getItem('cookie_consent')` al montar.
- Si es `null`, muestra el banner fijo en `position: fixed`, `bottom: 0`, fondo oscuro.
- Dos botones: "Aceptar" (guarda `'accepted'` en localStorage, oculta banner) y "Ver política" (link a `/cookies`).
- No bloquea el uso de la app (overlay parcial, no modal).

**Integración:** Importar y añadir `<CookieBanner />` en `src/app/layout.tsx` dentro del `<body>`, tras el `<Toaster>`.

### Links en el footer

**Archivo afectado:** `src/app/page.tsx` (footer en línea ~462, ya tiene links a `/privacidad` y `/terminos`).

Añadir links a `/aviso-legal`, `/cookies`, `/contacto` en el mismo bloque `<ul>` existente.

---

## Verificación

1. `npm run build` — sin errores de tipo ni compilación.
2. Abrir `https://menuai.es` en producción y comprobar en DevTools > Network > Response Headers:
   - `Content-Security-Policy` presente.
   - `Access-Control-Allow-Origin: https://menuai.es` en requests a `/api/*`.
3. Verificar `https://menuai.es/robots.txt` accesible.
4. Navegar a `/aviso-legal`, `/cookies`, `/contacto` — cargan correctamente.
5. Primera visita: aparece el banner de cookies. Al aceptar, no vuelve a aparecer.
6. Admin `/admin/ajustes`: card de uso del asistente muestra count y límite correctos.
