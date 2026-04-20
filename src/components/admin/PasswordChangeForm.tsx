'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

function getPasswordStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: '', color: '' }
  if (pwd.length < 8) return { level: 1, label: 'Débil', color: 'bg-destructive' }
  if (pwd.length >= 12 && /[0-9!@#$%^&*]/.test(pwd)) return { level: 3, label: 'Fuerte', color: 'bg-emerald-500' }
  return { level: 2, label: 'Media', color: 'bg-amber-500' }
}

export default function PasswordChangeForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strength = getPasswordStrength(password)
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) return
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Contraseña actualizada correctamente.')
      setPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      console.error('Password change error:', err)
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="admin-new-password" className="text-sm font-medium">Nueva contraseña</Label>
        <div className="relative">
          <Input
            id="admin-new-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="h-11 pr-12"
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
        <Label htmlFor="admin-confirm-password" className="text-sm font-medium">Confirmar contraseña</Label>
        <div className="relative">
          <Input
            id="admin-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={`h-11 pr-12 ${mismatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            aria-invalid={mismatch ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {mismatch && (
          <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
        )}
      </div>

      <Button
        type="submit"
        className="cursor-pointer"
        disabled={loading || mismatch || password.length < 8}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Actualizar contraseña
      </Button>
    </form>
  )
}
