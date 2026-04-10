'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { UtensilsCrossed, Loader2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* ─── LEFT: BRANDING ─── */}
      <div className="md:w-1/2 bg-gradient-to-br from-primary/10 via-secondary/30 to-primary/5 flex flex-col justify-between p-8 md:p-16 border-b md:border-b-0 md:border-r border-border relative">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors cursor-pointer self-start animate-fade-up z-10"
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm border border-border hover:bg-background/80 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span>Volver al inicio</span>
        </Link>
        
        <div className="flex flex-col items-center justify-center flex-1 py-12 md:py-0 text-center animate-fade-up delay-1">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-background/60 shadow-sm backdrop-blur-md border border-primary/10 mb-8">
            <UtensilsCrossed className="w-10 h-10 md:w-12 md:h-12 text-primary" />
          </div>
          <h1 className="font-serif text-3xl md:text-5xl text-foreground mb-4">MenuAI</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-sm">
            Digitaliza tu carta en minutos y enamora a tus clientes.
          </p>
        </div>
        
        <div className="hidden md:block text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MenuAI. Todos los derechos reservados.
        </div>
      </div>

      {/* ─── RIGHT: FORM ─── */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-background">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 text-center md:text-left">
            <h2 className="font-serif text-3xl text-foreground mb-2">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h2>
            <p key={mode} className="text-base text-muted-foreground animate-fade-up">
              {mode === 'login' ? 'Accede a tu panel de gestión' : 'Comienza tu prueba y digitaliza tu restaurante'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="restaurante@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 text-base px-4"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="login-password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="h-12 text-base px-4"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full h-12 text-base cursor-pointer transition-all active:scale-[0.98] mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-8">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline underline-offset-4 cursor-pointer transition-all"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

