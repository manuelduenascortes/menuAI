'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ThemeToggle({ variant = 'ghost', size = 'sm' }: { variant?: 'ghost' | 'outline'; size?: 'sm' | 'icon' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className="w-9 h-9 p-0 cursor-pointer" aria-label="Cambiar tema">
        <Sun className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className="w-9 h-9 p-0 cursor-pointer"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}
