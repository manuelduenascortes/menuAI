'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Detects Supabase auth errors in the URL hash fragment
 * (e.g. #error=access_denied&error_description=Email+link+is+invalid+or+has+expired)
 * and redirects to login with a visible error message.
 */
export default function AuthErrorRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('error=')) return

    const params = new URLSearchParams(hash.replace('#', ''))
    const errorDesc = params.get('error_description')
    const errorCode = params.get('error_code')

    if (errorDesc || errorCode) {
      const message = errorCode === 'otp_expired'
        ? 'El enlace ha caducado. Solicita uno nuevo.'
        : errorDesc || 'Error de autenticación'
      router.replace(`/admin/login?error=${encodeURIComponent(message)}`)
    }
  }, [router])

  return null
}
