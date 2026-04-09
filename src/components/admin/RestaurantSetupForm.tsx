'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function RestaurantSetupForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const slug = slugify(form.name)

    const { error } = await supabase.from('restaurants').insert({
      user_id: userId,
      name: form.name,
      slug,
      description: form.description || null,
      address: form.address || null,
      phone: form.phone || null,
    })

    if (error) {
      setError(error.message.includes('slug') ? 'Ya existe un restaurante con ese nombre.' : error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="setup-name">Nombre del restaurante *</Label>
        <Input
          id="setup-name"
          placeholder="Ej: Bar La Malagueña"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        {form.name && (
          <p className="text-xs text-muted-foreground">
            URL: <span className="font-mono">/{slugify(form.name)}</span>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="setup-description">Descripción</Label>
        <Textarea
          id="setup-description"
          placeholder="Cocina mediterránea con productos de temporada..."
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="setup-address">Dirección</Label>
        <Input
          id="setup-address"
          placeholder="Calle Mayor 1, Málaga"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="setup-phone">Teléfono</Label>
        <Input
          id="setup-phone"
          placeholder="952 123 456"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full cursor-pointer">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear restaurante'}
      </Button>
    </form>
  )
}
