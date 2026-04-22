/**
 * LoadingScreen — pantalla de carga con animación tenedor + cuchillo en bucle.
 *
 * Uso como loading.tsx de Next.js (sin props):
 *   export { default } from '@/components/LoadingScreen'
 *
 * Uso inline con texto personalizado:
 *   <LoadingScreen text="Cargando tu carta…" />
 */
export default function LoadingScreen({ text }: { text?: string } = {}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-background"
      aria-label="Cargando…"
      role="status"
    >
      {/* ── Escena de animación ── */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>

        {/*
          Ambas mitades comparten el mismo SVG canvas (viewBox 0 0 24 24).
          Al estar en reposo (translate 0,0) se superponen perfectamente
          formando el icono UtensilsCrossed completo.

          TENEDOR — diagonal ↘ (tines ↖, mango ↘) → entra/sale desde ↖
            path 2 del icono Lucide UtensilsCrossed

          CUCHILLO — diagonal ↙ (hoja ↗, mango ↙) → entra/sale desde ↗
            paths 1, 4, 3 del icono Lucide UtensilsCrossed
        */}
        <svg
          className="absolute"
          viewBox="0 0 24 24"
          width={140}
          height={140}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--primary)' }}
          aria-hidden
        >
          {/* TENEDOR */}
          <g style={{ animation: 'loader-fork 4s ease-in-out infinite' }}>
            <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
          </g>

          {/* CUCHILLO */}
          <g style={{ animation: 'loader-knife 4s ease-in-out infinite' }}>
            <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
            <path d="m19 5-7 7" />
            <path d="m2.1 21.8 6.4-6.3" />
          </g>
        </svg>

        {/* Flash de colisión */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 100,
            height: 100,
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 65%, transparent) 0%, transparent 70%)',
            animation: 'loader-flash 4s linear infinite',
          }}
          aria-hidden
        />

        {/* Logo completo tras el choque */}
        <svg
          className="absolute"
          viewBox="0 0 24 24"
          width={140}
          height={140}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--primary)',
            animation: 'loader-combined 4s ease-in-out infinite',
          }}
          aria-hidden
        >
          <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
          <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
          <path d="m2.1 21.8 6.4-6.3" />
          <path d="m19 5-7 7" />
        </svg>
      </div>

      {/* Marca + texto opcional */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-serif text-3xl tracking-tight text-foreground">
          MenuAI
        </span>
        {text && (
          <span className="text-sm text-muted-foreground animate-subtle-pulse">
            {text}
          </span>
        )}
      </div>
    </div>
  )
}
