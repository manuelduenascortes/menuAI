'use client'

import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import { getGlobalThemeTogglePosition } from '@/lib/theme-toggle-position'

export default function GlobalThemeToggle() {
  const pathname = usePathname()

  return (
    <div className={getGlobalThemeTogglePosition(pathname)}>
      <div className="rounded-full border border-border/70 bg-background/88 p-1 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-background/72">
        <ThemeToggle variant="outline" size="icon" />
      </div>
    </div>
  )
}
