# Spec: Chatbot fix + Password Recovery + Admin Security

**Date**: 2026-04-20  
**Status**: Approved

---

## 1. Chatbot — Eliminar alucinaciones

### Problema
El asistente sugiere platos que no existen en la carta. Causa: `temperature: 0.7` da demasiada creatividad al modelo, y las reglas del prompt no son lo suficientemente explícitas.

### Cambios

**`src/app/api/chat/route.ts`**  
- Cambiar `temperature: 0.7` → `temperature: 0.1`

**`src/lib/menu-context.ts`** — Fortalecer el prompt en dos puntos:

1. `[SAFETY]` — Añadir regla explícita al inicio:  
   "NUNCA menciones, sugieras ni referencees ningún plato, bebida, precio o producto que no esté **literalmente listado** en `[MENU]`. Si no aparece en `[MENU]`, no existe para ti."

2. `[CONSTRAINT]` — Cambiar respuesta de fallback:  
   De: `"No lo tengo en la carta disponible ahora mismo."`  
   A: `"Ese plato no está en nuestra carta."`  
   (Eliminar "ahora mismo" que implica disponibilidad futura/temporal)

3. `[BEHAVIOR]` — Eliminar la instrucción `"Si piden 'lo mejor', recomienda lo más especial"` — abre la puerta a inventar algo premium no listado. Reemplazar por: `"Si piden 'lo mejor', recomienda el plato de mayor precio de la carta."`

---

## 2. Password Recovery — Flujo unificado

### Problema
El email de recuperación muestra "página no encontrada". La ruta `/auth/confirm` existe pero redirige al login con `?mode=update_password`, y en ese path el cliente no tiene sesión activa (el `verifyOtp` del servidor setea la cookie pero el cliente la lee correctamente solo si navega a una página fresca).

### Flujo corregido
```
Email Supabase → /auth/confirm?token_hash=XXX&type=recovery
  → verifyOtp (server, setea cookie de sesión)
  → redirect /auth/update-password
  → updateUser({ password }) con sesión de cookie activa
  → redirect /admin/dashboard
```

### Cambios

**`src/app/auth/confirm/route.ts`**  
- Cambiar: `return NextResponse.redirect(`${origin}/admin/login?mode=update_password`)`  
- Por: `return NextResponse.redirect(`${origin}/auth/update-password`)`

**`src/app/auth/update-password/page.tsx`** — Mejorar UX:
- Añadir campo "Confirmar contraseña" con validación cliente (ambas deben coincidir antes de enviar)
- Añadir indicador de fuerza de contraseña: barra de colores con 3 niveles (débil <8 chars / media 8+ / fuerte 12+ con número o símbolo)
- Añadir detección de sesión inválida: si `supabase.auth.getSession()` retorna null al montar, mostrar mensaje de error con link a login en vez del formulario
- Mantener redirección a `/admin/dashboard` al completar con éxito

---

## 3. Admin → Ajustes — Sección Seguridad

### Cambios

**Nuevo componente**: `src/components/admin/PasswordChangeForm.tsx`  
- Componente cliente con: campo nueva contraseña + confirmar contraseña + indicador de fuerza
- Llama a `supabase.auth.updateUser({ password })` (cliente browser)
- Muestra toast de éxito/error con Sonner
- Reutiliza la misma lógica de validación y fuerza que `/auth/update-password`

**`src/app/admin/ajustes/page.tsx`**  
- Añadir nueva Card "Seguridad" debajo de la Card "Datos del negocio"
- Importar y renderizar `<PasswordChangeForm />`

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `src/app/api/chat/route.ts` | Bajar temperature a 0.1 |
| `src/lib/menu-context.ts` | Fortalecer reglas del sistema prompt |
| `src/app/auth/confirm/route.ts` | Corregir redirect de recovery |
| `src/app/auth/update-password/page.tsx` | Añadir confirm password + fuerza + sesión guard |
| `src/app/admin/ajustes/page.tsx` | Añadir Card Seguridad |
| `src/components/admin/PasswordChangeForm.tsx` | Nuevo componente |

---

## Out of scope
- Cambios en Supabase Dashboard (URL Configuration / Redirect URLs) — el usuario debe verificar que `SITE_URL` apunta al dominio de producción correcto
- Tests automáticos (no hay framework configurado)
- Cambios en email templates de Supabase
