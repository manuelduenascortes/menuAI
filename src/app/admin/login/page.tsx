'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('Revisa tu email para confirmar la cuenta.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <CardTitle className="text-2xl font-bold">MenuAI</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Accede a tu panel de gestión' : 'Crea tu cuenta de restaurante'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="restaurante@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                className="underline text-primary font-medium"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
