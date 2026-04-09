'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
        <Label htmlFor="name">Nombre del restaurante *</Label>
        <Input
          id="name"
          placeholder="Ej: Bar La Malagueña"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        {form.name && (
          <p className="text-xs text-gray-400">
            URL: <span className="font-mono">/{slugify(form.name)}</span>
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Cocina mediterránea con productos de temporada..."
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          placeholder="Calle Mayor 1, Málaga"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          placeholder="952 123 456"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creando...' : 'Crear restaurante'}
      </Button>
    </form>
  )
}
