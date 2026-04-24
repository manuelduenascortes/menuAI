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
