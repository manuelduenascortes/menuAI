'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { UtensilsCrossed, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: '' }
  if (pwd.length < 8) return { level: 1, label: 'Débil', color: 'bg-destructive' }
  if (pwd.length >= 12 && /[0-9!@#$%^&*]/.test(pwd)) return { level: 3, label: 'Fuerte', color: 'bg-emerald-500' }
  return { level: 2, label: 'Media', color: 'bg-amber-500' }
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session)
    })
  }, [])

  const strength = getPasswordStrength(password)
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess('Contraseña actualizada correctamente. Redirigiendo...')
      setTimeout(() => { window.location.href = '/admin/dashboard' }, 1500)
    } catch (err: unknown) {
      console.error('Update password error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (sessionReady === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <UtensilsCrossed className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-2">Enlace caducado</h1>
          <p className="text-muted-foreground mb-6">
            Este enlace ya no es válido o ha expirado. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
          <Link href="/admin/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full justify-center')}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-2">Nueva contraseña</h1>
          <p className="text-base text-muted-foreground">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="new-password" className="text-sm font-medium">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-12 text-base px-4 pr-12"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {strength.level > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-secondary'}`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${strength.level === 1 ? 'text-destructive' : strength.level === 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`h-12 text-base px-4 pr-12 ${mismatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                aria-invalid={mismatch ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mismatch && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              {success}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base cursor-pointer"
            disabled={loading || !!success || mismatch}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
