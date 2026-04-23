'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { UtensilsCrossed, Loader2, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const isTrial = searchParams.get('trial') === '1'
    const urlError = searchParams.get('error')

    if (urlError) setError(urlError)
    if (isTrial) setMode('signup')
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback/recovery`,
        })
        if (resetError) throw resetError
        setSuccess('Te hemos enviado un email para restablecer tu contrasena.')
      } else if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  const heading = mode === 'reset'
    ? 'Recuperar contrasena'
    : mode === 'login'
      ? 'Bienvenido de nuevo'
      : searchParams.get('trial') === '1'
        ? 'Prueba gratuita de 14 dias'
        : 'Crea tu cuenta'

  const subheading = mode === 'reset'
    ? 'Introduce tu email y te enviaremos un enlace.'
    : mode === 'login'
      ? 'Accede a tu panel de gestion.'
      : searchParams.get('trial') === '1'
        ? 'Crea tu cuenta para empezar. Sin tarjeta de credito.'
        : 'Comienza tu prueba y digitaliza la carta de tu local.'

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
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
            Carta digital con IA para restaurantes, bares, cafeterias y coctelerias.
          </p>
        </div>

        <div className="hidden md:block text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MenuAI. Todos los derechos reservados.
        </div>
      </div>

      <div id="main-content" className="md:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-background">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 text-center md:text-left">
            <h2 className="font-serif text-3xl text-foreground mb-2">{heading}</h2>
            <p key={mode} className="text-base text-muted-foreground animate-fade-up">
              {subheading}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="local@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 text-base px-4"
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-sm font-medium">Contrasena</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                    >
                      Olvidaste tu contrasena?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="h-12 text-base px-4 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {success}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full h-12 text-base cursor-pointer transition-all active:scale-[0.98] mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                mode === 'reset' ? 'Enviar enlace' : mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-8">
              {mode === 'reset' ? (
                <button
                  type="button"
                  className="text-primary font-medium hover:underline underline-offset-4 cursor-pointer transition-all"
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                >
                  Volver a iniciar sesion
                </button>
              ) : (
                <>
                  {mode === 'login' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline underline-offset-4 cursor-pointer transition-all"
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
                  >
                    {mode === 'login' ? 'Registrate aqui' : 'Inicia sesion'}
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
