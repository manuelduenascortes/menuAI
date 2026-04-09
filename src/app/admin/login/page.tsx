'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { UtensilsCrossed, Loader2, ChevronLeft } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-background p-5 relative">
      <Link 
        href="/"
        className="absolute top-6 left-6 md:top-8 md:left-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border hover:bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </div>
        <span className="hidden md:inline">Volver al inicio</span>
      </Link>
      <div className="w-full max-w-sm animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">MenuAI</h1>
          <p key={mode} className="text-sm text-muted-foreground mt-1 animate-fade-up">
            {mode === 'login' ? 'Accede a tu panel de gestión' : 'Crea tu cuenta de restaurante'}
          </p>
        </div>

        {/* Form card */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div key={mode} className="animate-fade-up">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="restaurante@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full cursor-pointer transition-all active:scale-95" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                  <button
                    type="button"
                    className="text-primary font-medium underline underline-offset-4 cursor-pointer"
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  >
                    {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                  </button>
                </p>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
