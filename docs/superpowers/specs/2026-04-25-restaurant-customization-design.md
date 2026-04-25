# Personalizacion Por Restaurante - MenuAI

**Date:** 2026-04-25  
**Status:** Approved for planning

## Context

MenuAI ya permite que cada local tenga datos basicos, tipo de local, modo de acceso a carta y `logo_url`, pero el admin no ofrece una UI para subir logo ni para adaptar la apariencia publica de la carta. La vista cliente (`src/components/cliente/MenuView.tsx`) usa tokens globales de tema y fuentes cargadas desde `src/app/layout.tsx`, por lo que todos los restaurantes comparten la misma identidad visual.

El objetivo es permitir que cada restaurante configure una identidad visual simple, segura y dificil de estropear:

- Un logo activo subido a Supabase Storage.
- Un color de marca.
- Una combinacion tipografica predisenada.
- Una preview local en tiempo real antes de guardar.

El alcance se mantiene intencionadamente estrecho: no habra paletas completas, editor visual avanzado, CSS custom por restaurante ni multiples logos.

---

## Decisions

### 1. Datos En `restaurants`

**Archivos afectados:**
- `supabase/schema.sql`
- Nueva migracion en `supabase/migrations/`
- `src/lib/types.ts`

Se anadiran dos columnas simples:

```sql
primary_color text not null default '#8B5E3C',
font_style text not null default 'clasico'
```

`primary_color` tendra una restriccion `check` para aceptar hex de 6 digitos con `#`, por ejemplo `#8B5E3C`.

`font_style` tendra una restriccion `check` con estas claves:

```ts
'clasico' | 'elegante' | 'moderno' | 'casual' | 'minimalista'
```

No se usara JSONB porque son dos valores con semantica estable y validable. Los restaurantes existentes recibiran defaults por migracion.

---

## 2. Logo Upload

**Archivos afectados:**
- `supabase/schema.sql`
- Nueva migracion en `supabase/migrations/`
- Nueva ruta o refactor de ruta en `src/app/api/upload/route.ts`
- `src/components/admin/RestaurantEditForm.tsx`

Se creara un bucket publico `restaurant-logos` en Supabase Storage. La estructura de objetos sera:

```txt
restaurant-logos/{restaurantId}/{uuid}.{ext}
```

La subida se hara server-side mediante una API route para poder:

- Verificar que el usuario autenticado es propietario del restaurante.
- Validar extension, MIME y tamano maximo.
- Subir con service role sin exponer privilegios al cliente.
- Borrar el logo anterior si la URL actual pertenece al bucket `restaurant-logos`.
- Devolver la nueva URL publica para guardarla en `restaurants.logo_url`.

Solo habra un logo activo por restaurante. El borrado del anterior sera best-effort: si falla, la subida no se revierte, pero se registrara el error en servidor.

El formulario mostrara preview inmediata usando `URL.createObjectURL(file)` antes de terminar la subida. Cuando la API responda, el formulario reemplazara la preview temporal por la URL publica.

---

## 3. Color De Marca

**Archivo principal:** `src/components/admin/RestaurantEditForm.tsx`

El formulario anadira un `input type="color"` nativo, sin dependencias nuevas. Tambien mostrara:

- El valor hex actual.
- Un pequeno badge/swatch con el color.
- Validacion local para mantener formato `#[0-9A-Fa-f]{6}`.

El valor por defecto sera `#8B5E3C`, igual que el tema actual.

En la vista publica se derivaran colores secundarios desde ese hex con helpers puros:

- `primary`: color elegido.
- `primaryLight`: mezcla clara para fondos suaves.
- `primaryForeground`: blanco o negro segun contraste.

---

## 4. Estilos Tipograficos

**Archivos afectados:**
- Nuevo helper compartido, por ejemplo `src/lib/restaurant-theme.ts`
- `src/app/layout.tsx`
- Nueva envoltura para rutas publicas de carta o cambio acotado en paginas publicas
- `src/components/admin/RestaurantEditForm.tsx`
- `src/components/cliente/MenuView.tsx`

Se ofreceran 5 estilos:

| Key | Nombre | Heading | Body |
| --- | --- | --- | --- |
| `clasico` | Clasico | DM Serif Display | Outfit |
| `elegante` | Elegante | Playfair Display | Lato |
| `moderno` | Moderno | Inter | Inter |
| `casual` | Casual | Nunito | Nunito |
| `minimalista` | Minimalista | Space Grotesk | Space Grotesk |

Las tarjetas del admin seran clicables y mostraran texto de ejemplo con la fuente real:

- "Nombre del plato"
- "Descripcion de ejemplo"

Para mantener `next/font` idiomatico y CSP limpia, las fuentes se importaran estaticamente con `next/font/google` y se escoparan a la experiencia publica de carta. No se cargaran como CSS externo desde Google. El layout global dejara de ser responsable de todas las fuentes de restaurante si esa separacion es viable sin romper el resto del sitio; si no, se mantendra el default global y se anadira una capa escopada para la carta.

---

## 5. Aplicacion Del Tema En La Vista Cliente

**Archivos afectados:**
- `src/app/[restaurantSlug]/page.tsx`
- `src/app/[restaurantSlug]/mesa/[tableId]/page.tsx`
- `src/components/cliente/MenuView.tsx`
- `src/lib/queries.ts` si se decide explicitar campos en la query

`getFullMenuBySlug` ya selecciona `restaurants.*`, asi que `primary_color`, `font_style` y `logo_url` llegaran al Server Component una vez existan en BD.

`MenuView` aplicara variables CSS inline en su contenedor raiz:

```tsx
style={{
  '--restaurant-primary': primary,
  '--restaurant-primary-light': primaryLight,
  '--restaurant-primary-foreground': primaryForeground,
}}
```

Los elementos de la carta que hoy usan `text-primary`, `bg-primary`, `border-primary` o `font-serif` se ajustaran para usar las variables y clases de fuente del restaurante en la zona publica. El admin y paginas de marketing no deben heredar estos cambios.

La ruta general `/{restaurantSlug}` y la ruta de mesa `/{restaurantSlug}/mesa/{tableId}` deben renderizar igual, salvo por el numero de mesa.

---

## 6. Preview En Tiempo Real En Admin

**Archivos afectados:**
- `src/app/admin/ajustes/page.tsx`
- `src/components/admin/RestaurantEditForm.tsx`
- Posible nuevo componente `src/components/admin/RestaurantThemePreview.tsx`

La card "Datos del negocio" se reorganizara:

- Desktop: grid de dos columnas, formulario a la izquierda y preview sticky a la derecha.
- Movil: una columna, con preview compacta debajo de los controles visuales.

La preview sera local y no hara peticiones al servidor. Leera el estado del formulario y renderizara:

- Logo o inicial del local.
- Nombre del local.
- Etiqueta de tipo de local.
- Una categoria de ejemplo.
- Dos platos de ejemplo con precio.
- Boton flotante simulado del asistente.

La preview no pretende ser pixel-perfect respecto a la carta real, pero debe reflejar color, logo y tipografia con suficiente fidelidad para decidir antes de guardar.

---

## 7. Seguridad Y Validaciones

- La API de logo debe rechazar usuarios no autenticados.
- La API de logo debe comprobar propiedad del restaurante antes de subir.
- Tipos permitidos: JPG, JPEG, PNG, WebP y GIF, igual que el upload actual.
- Tamano maximo recomendado: 5 MB.
- Las politicas Storage permitiran lectura publica del bucket.
- Las escrituras pueden hacerse via service role desde API; no es necesario abrir insert/update directo del bucket al cliente.
- Si se anaden politicas RLS para Storage, deben ser restrictivas y no depender de rutas que el usuario pueda falsificar sin verificar propiedad.
- `primary_color` tambien se valida en BD para que una llamada directa a Supabase no guarde valores invalidos.

---

## 8. Testing

Tests unitarios sugeridos:

- Helper de validacion de hex.
- Derivacion de colores claros/foreground segun contraste.
- Normalizacion de `font_style` desconocido a `clasico`.
- Extraccion segura del path anterior de logo solo cuando la URL pertenece a `restaurant-logos`.

Verificacion manual:

- `npm run lint`
- `npx tsc --noEmit`
- Probar `/admin/ajustes`:
  - Cambiar logo y ver preview inmediata.
  - Cambiar color y ver swatch + preview.
  - Cambiar fuente y ver tarjeta seleccionada + preview.
  - Guardar y refrescar.
- Probar `/{restaurantSlug}` y `/{restaurantSlug}/mesa/{tableId}`:
  - Logo visible.
  - Color aplicado a precios, filtros, foco y botones.
  - Fuente aplicada solo en la carta publica.

---

## 9. Out Of Scope

- Editor de paletas completas.
- Upload de imagen de portada.
- CSS custom por restaurante.
- Historial de logos.
- Cropper integrado.
- Variantes por mesa o por categoria.

---

## Self-Review

- **Spec coverage:** cubre datos, upload de logo, color, tipografia, aplicacion en cliente, preview, seguridad y pruebas.
- **Placeholder scan:** no quedan secciones incompletas ni decisiones abiertas.
- **Scope check:** el alcance es una sola feature cohesionada centrada en identidad visual por restaurante.
- **Ambiguity check:** las decisiones delegadas por el usuario quedan fijadas: un logo activo, limpieza best-effort del anterior, preview lateral responsive y fuentes self-hosted escopadas a carta publica.
