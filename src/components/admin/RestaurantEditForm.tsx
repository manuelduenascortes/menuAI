'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const ESTABLISHMENT_TYPES = [
  'Bar',
  'Restaurante',
  'Cafetería',
  'Cervecería',
  'Taberna',
  'Chiringuito',
  'Otro',
]

interface Restaurant {
  id: string
  name: string
  slug: string
  description: string | null
  address: string | null
  phone: string | null
  establishment_type?: string | null
}

export default function RestaurantEditForm({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description ?? '',
    address: restaurant.address ?? '',
    phone: restaurant.phone ?? '',
    establishment_type: restaurant.establishment_type ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
        establishment_type: form.establishment_type || null,
      })
      .eq('id', restaurant.id)

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Datos actualizados ✓')
    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nombre del restaurante *</Label>
        <Input
          id="edit-name"
          placeholder="Ej: Bar La Malagueña"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Descripción</Label>
        <Textarea
          id="edit-description"
          placeholder="Cocina mediterránea con productos de temporada..."
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-address">Dirección</Label>
        <Input
          id="edit-address"
          placeholder="Calle Mayor 1, Málaga"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">Teléfono</Label>
        <Input
          id="edit-phone"
          placeholder="952 123 456"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo de establecimiento</Label>
        <Select
          value={form.establishment_type || null}
          onValueChange={(value) => setForm({ ...form, establishment_type: value ?? '' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {ESTABLISHMENT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
        </Button>
        <Link href="/admin/dashboard">
          <Button type="button" variant="outline" className="cursor-pointer">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  )
}
