# Security & Legal Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir robots.txt, CSP/CORS headers, páginas legales (aviso-legal, cookies, contacto), banner de cookies y card de uso del chatbot en admin ajustes.

**Architecture:** Cambios independientes en config, nuevas páginas estáticas Server Components con el mismo layout visual que `/privacidad`, un Client Component de banner que usa localStorage, y un nuevo Card server-side en admin que lee datos de Supabase ya existentes.

**Tech Stack:** Next.js 16, React 19, Supabase, shadcn/ui (Progress, Button, Card), Tailwind CSS v4, Lucide icons.

> **Nota:** No hay test framework configurado. Verificación vía `npm run build` y comprobación manual en dev.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `public/robots.txt` |
| Modificar | `next.config.ts` |
| Crear | `src/app/aviso-legal/page.tsx` |
| Crear | `src/app/cookies/page.tsx` |
| Crear | `src/app/contacto/page.tsx` |
| Modificar | `src/app/page.tsx` (líneas ~460-471, footer legal links) |
| Crear | `src/components/CookieBanner.tsx` |
| Modificar | `src/app/layout.tsx` (añadir `<CookieBanner />`) |
| Modificar | `src/app/admin/ajustes/page.tsx` (card uso chatbot) |

---

## Task 1: robots.txt + security headers (CSP + CORS)

**Files:**
- Create: `public/robots.txt`
- Modify: `next.config.ts`

- [ ] **Step 1: Crear `public/robots.txt`**

Contenido completo del archivo:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
```

- [ ] **Step 2: Añadir CSP y CORS a `next.config.ts`**

El archivo actual define `supabaseUrl` y `supabaseHostname` en las primeras líneas. Añadir la variable `csp` entre `supabaseHostname` y `nextConfig`, y actualizar la función `headers()`.

Archivo completo resultante:

```typescript
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : ''

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHostname ? ` https://${supabaseHostname}` : ''}`,
  "font-src 'self'",
  `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl} wss://${supabaseHostname}` : ''}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: 'https', hostname: supabaseHostname, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://menuai.es' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: sin errores de compilación. Si hay type errors, revisar la interpolación de template strings en `csp`.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt next.config.ts
git commit -m "security: add CSP, CORS restriction headers and robots.txt"
```

---

## Task 2: Páginas legales (aviso-legal, cookies, contacto)

**Files:**
- Create: `src/app/aviso-legal/page.tsx`
- Create: `src/app/cookies/page.tsx`
- Create: `src/app/contacto/page.tsx`

- [ ] **Step 1: Crear `src/app/aviso-legal/page.tsx`**

```tsx
import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export const metadata = {
  title: 'Aviso Legal - MenuAI',
}

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Aviso Legal</h1>
        <p className="mb-12 text-sm text-muted-foreground">Ultima actualizacion: 24 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Datos identificativos del titular</h2>
            <p>
              En cumplimiento del articulo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Informacion y Comercio Electronico (LSSICE):
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Razon social:</strong> [RAZON SOCIAL]</li>
              <li><strong className="text-foreground">CIF/NIF:</strong> [CIF]</li>
              <li><strong className="text-foreground">Domicilio social:</strong> [DOMICILIO]</li>
              <li>
                <strong className="text-foreground">Correo electronico:</strong>{' '}
                <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                  hola@menuai.es
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. Objeto</h2>
            <p>
              El presente Aviso Legal regula el acceso y uso del sitio web menuai.es, que ofrece un servicio de carta digital inteligente para establecimientos de hosteleria.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Propiedad intelectual e industrial</h2>
            <p>
              Todos los contenidos del sitio web (textos, graficos, logotipos, imagenes, codigo fuente) son propiedad del titular o de terceros que han autorizado su uso, y estan protegidos por la legislacion espanola e internacional sobre propiedad intelectual e industrial. Queda prohibida su reproduccion total o parcial sin autorizacion expresa.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Exclusion de garantias y responsabilidad</h2>
            <p>
              El titular no se hace responsable de los danos producidos por el uso del servicio, interrupciones tecnicas, errores en los contenidos o accesos no autorizados. El usuario utiliza el sitio bajo su propia responsabilidad.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Ley aplicable y jurisdiccion</h2>
            <p>
              Este Aviso Legal se rige por la legislacion espanola. Para cualquier controversia, las partes se someten a los juzgados y tribunales de Malaga, salvo que la normativa aplicable establezca otro fuero.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/app/cookies/page.tsx`**

```tsx
import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'

export const metadata = {
  title: 'Politica de Cookies - MenuAI',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Politica de Cookies</h1>
        <p className="mb-12 text-sm text-muted-foreground">Ultima actualizacion: 24 de abril de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 leading-relaxed text-muted-foreground dark:prose-invert">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Que son las cookies</h2>
            <p>
              Las cookies son pequeños ficheros de texto que un sitio web almacena en el navegador del usuario.
              Permiten que el sitio recuerde informacion sobre la visita para facilitar su uso.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Cookies que utilizamos</h2>
            <p>
              MenuAI unicamente usa <strong className="text-foreground">cookies tecnicas estrictamente necesarias</strong>.
              No utilizamos cookies de rastreo, analitica ni publicidad.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left text-foreground">Nombre</th>
                    <th className="py-2 pr-4 text-left text-foreground">Proveedor</th>
                    <th className="py-2 pr-4 text-left text-foreground">Finalidad</th>
                    <th className="py-2 text-left text-foreground">Duracion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">Sesion de administrador (autenticacion)</td>
                    <td className="py-2">Sesion</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                    <td className="py-2 pr-4">MenuAI</td>
                    <td className="py-2 pr-4">Recordar tu preferencia sobre este aviso</td>
                    <td className="py-2">1 año</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Como gestionar las cookies</h2>
            <p>
              Puedes configurar tu navegador para rechazar o eliminar cookies. Ten en cuenta que si rechazas
              las cookies tecnicas no podras iniciar sesion como administrador.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">Mas informacion</h2>
            <p>
              Para cualquier duda escríbenos a{' '}
              <a href="mailto:hola@menuai.es" className="text-primary hover:underline">
                hola@menuai.es
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/app/contacto/page.tsx`**

```tsx
import Link from 'next/link'
import { ArrowLeft, Store, Mail, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Contacto - MenuAI',
}

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-[6vw]">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl">MenuAI</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-[6vw] py-16">
        <h1 className="mb-2 font-serif text-4xl">Contacto</h1>
        <p className="mb-12 text-muted-foreground">Tienes alguna pregunta? Escribenos.</p>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Email</p>
              <a
                href="mailto:hola@menuai.es"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                hola@menuai.es
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Ubicacion</p>
              <p className="text-muted-foreground">Malaga, Espana</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: sin errores. Las 3 rutas nuevas aparecen como páginas estáticas en el output.

- [ ] **Step 5: Commit**

```bash
git add src/app/aviso-legal/page.tsx src/app/cookies/page.tsx src/app/contacto/page.tsx
git commit -m "feat: add aviso-legal, cookies, and contacto pages"
```

---

## Task 3: Links del footer + banner de cookies

**Files:**
- Modify: `src/app/page.tsx` (líneas ~460-471)
- Create: `src/components/CookieBanner.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Añadir links al footer en `src/app/page.tsx`**

Localizar el bloque `<ul>` de la sección "Legal" (alrededor de la línea 460). Reemplazar:

```tsx
<ul className="space-y-4 text-sm font-medium text-muted-foreground">
  <li>
    <Link href="/privacidad" className="transition-colors hover:text-foreground">
      Politica de Privacidad
    </Link>
  </li>
  <li>
    <Link href="/terminos" className="transition-colors hover:text-foreground">
      Terminos y Condiciones
    </Link>
  </li>
</ul>
```

Con:

```tsx
<ul className="space-y-4 text-sm font-medium text-muted-foreground">
  <li>
    <Link href="/aviso-legal" className="transition-colors hover:text-foreground">
      Aviso Legal
    </Link>
  </li>
  <li>
    <Link href="/privacidad" className="transition-colors hover:text-foreground">
      Politica de Privacidad
    </Link>
  </li>
  <li>
    <Link href="/cookies" className="transition-colors hover:text-foreground">
      Politica de Cookies
    </Link>
  </li>
  <li>
    <Link href="/terminos" className="transition-colors hover:text-foreground">
      Terminos y Condiciones
    </Link>
  </li>
  <li>
    <Link href="/contacto" className="transition-colors hover:text-foreground">
      Contacto
    </Link>
  </li>
</ul>
```

- [ ] **Step 2: Crear `src/components/CookieBanner.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-[6vw] py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          Usamos cookies tecnicas necesarias para el inicio de sesion y el funcionamiento del servicio.{' '}
          <Link href="/cookies" className="text-foreground underline underline-offset-2 hover:text-primary">
            Ver politica de cookies
          </Link>
          .
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">
          Entendido
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Añadir `<CookieBanner />` a `src/app/layout.tsx`**

Añadir el import en la parte superior junto a los demás imports:

```tsx
import CookieBanner from '@/components/CookieBanner'
```

Dentro del `<body>`, justo después de `<Toaster richColors position="bottom-right" />`:

```tsx
<Toaster richColors position="bottom-right" />
<CookieBanner />
```

El bloque `<body>` resultante queda:

```tsx
<body className="min-h-full flex flex-col" suppressHydrationWarning>
  <ThemeProvider>
    <TooltipProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-foreground focus:text-background focus:text-sm focus:font-semibold focus:rounded-lg focus:outline-2 focus:outline-ring focus:outline-offset-2 focus:no-underline"
      >
        Ir al contenido
      </a>
      {children}
    </TooltipProvider>
    <Toaster richColors position="bottom-right" />
    <CookieBanner />
  </ThemeProvider>
</body>
```

- [ ] **Step 4: Verificar en dev**

```bash
npm run dev
```

Navegar a `http://localhost:3000`. El banner debe aparecer en la parte inferior. Hacer clic en "Entendido" — desaparece y no vuelve al refrescar. Borrar `localStorage.cookie_consent` en DevTools para volver a verlo. Verificar que el link "Ver politica de cookies" lleva a `/cookies`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/CookieBanner.tsx src/app/layout.tsx
git commit -m "feat: add cookie banner and footer legal links"
```

---

## Task 4: Card de uso del chatbot en Admin Ajustes

**Files:**
- Modify: `src/app/admin/ajustes/page.tsx`

- [ ] **Step 1: Actualizar `src/app/admin/ajustes/page.tsx`**

El archivo actual tiene estas importaciones y query. Aplicar el diff completo:

**Importaciones nuevas** (añadir a las existentes):

```tsx
import { getChatUsage, getChatLimit } from '@/lib/usage'
import { Progress } from '@/components/ui/progress'
import { MessageSquare } from 'lucide-react'
```

**Query** — añadir `subscription_status` al `.select()`:

```tsx
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('id, name, slug, venue_type, menu_access_mode, description, address, phone, establishment_type, subscription_status')
  .eq('user_id', user.id)
  .single()
```

**Llamada a datos de uso** — añadir tras el guard `if (!restaurant)`:

```tsx
const chatCount = await getChatUsage(restaurant.id)
const chatLimit = getChatLimit(restaurant.subscription_status ?? null)
const chatPercent = Math.min(Math.round((chatCount / chatLimit) * 100), 100)
```

**Nuevo Card** — añadir como tercer elemento dentro del `<div className="space-y-6">`, tras el Card de Seguridad:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="font-serif text-xl flex items-center gap-2">
      <MessageSquare className="w-5 h-5 text-primary" />
      Uso del asistente IA
    </CardTitle>
    <CardDescription>
      Consultas del chatbot este mes
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    <Progress value={chatPercent} className="h-2" />
    <p className={`text-sm ${chatCount >= chatLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
      {chatCount} de {chatLimit} consultas usadas este mes
      {chatCount >= chatLimit && ' — limite alcanzado'}
    </p>
  </CardContent>
</Card>
```

El archivo completo resultante:

```tsx
import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RestaurantEditForm from '@/components/admin/RestaurantEditForm'
import PasswordChangeForm from '@/components/admin/PasswordChangeForm'
import { getChatUsage, getChatLimit } from '@/lib/usage'
import { Progress } from '@/components/ui/progress'
import { Settings, Shield, MessageSquare } from 'lucide-react'

export default async function AjustesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, venue_type, menu_access_mode, description, address, phone, establishment_type, subscription_status')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

  const chatCount = await getChatUsage(restaurant.id)
  const chatLimit = getChatLimit(restaurant.subscription_status ?? null)
  const chatPercent = Math.min(Math.round((chatCount / chatLimit) * 100), 100)

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Ajustes</h1>
        <p className="text-muted-foreground mt-1">Edita los datos de tu local</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Datos del negocio
            </CardTitle>
            <CardDescription>
              URL publica: <span className="font-mono">/{restaurant.slug}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantEditForm restaurant={restaurant} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Actualiza la contrasena de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Uso del asistente IA
            </CardTitle>
            <CardDescription>
              Consultas del chatbot este mes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={chatPercent} className="h-2" />
            <p className={`text-sm ${chatCount >= chatLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {chatCount} de {chatLimit} consultas usadas este mes
              {chatCount >= chatLimit && ' — limite alcanzado'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar en dev**

```bash
npm run dev
```

Navegar a `http://localhost:3000/admin/ajustes` (logueado). Debe aparecer el tercer Card con la barra de progreso y el texto "X de Y consultas usadas este mes". Si el restaurante está en trial con 0 usos, debe mostrar "0 de 200 consultas".

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: sin errores de tipo. Si TypeScript se queja de `subscription_status` no existir en el tipo inferido, añadir `subscription_status: string | null` al tipo del `restaurant` — pero normalmente Supabase lo infiere del schema.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/ajustes/page.tsx
git commit -m "feat: show monthly chatbot usage in admin settings"
```
