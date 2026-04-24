'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ESTABLISHMENT_TYPES } from '@/lib/constants'
import type { MenuAccessMode, VenueType } from '@/lib/types'
import {
  getVenueConfig,
  MENU_ACCESS_OPTIONS,
  normalizeMenuAccessMode,
  normalizeVenueType,
  VENUE_OPTIONS,
} from '@/lib/venue-config'

export type EditableRestaurant = {
  id: string
  name: string
  venue_type?: VenueType | null
  menu_access_mode?: MenuAccessMode | null
  description?: string | null
  address?: string | null
  phone?: string | null
  establishment_type?: string | null
}

export default function RestaurantEditForm({
  restaurant,
  onSuccess,
}: {
  restaurant: EditableRestaurant
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<{
    name: string
    venue_type: VenueType
    menu_access_mode: MenuAccessMode
    description: string
    address: string
    phone: string
  }>({
    name: restaurant.name,
    venue_type: normalizeVenueType(restaurant.venue_type),
    menu_access_mode: normalizeMenuAccessMode(restaurant.menu_access_mode),
    description: restaurant.description ?? '',
    address: restaurant.address ?? '',
    phone: restaurant.phone ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: form.name,
        venue_type: form.venue_type,
        menu_access_mode: form.menu_access_mode,
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
      })
      .eq('id', restaurant.id)

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Datos actualizados')
    onSuccess?.()
    router.refresh()
    if (!onSuccess) {
      router.push('/admin/dashboard')
    }
  }

  const venueConfig = getVenueConfig(form.venue_type)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Nombre del local *</Label>
        <Input
          id="edit-name"
          placeholder="Ej: Bar La Malaguena"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-venue-type">Tipo de local *</Label>
          <select
            id="edit-venue-type"
            value={form.venue_type}
            onChange={e => setForm({ ...form, venue_type: e.target.value as VenueType })}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {VENUE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {VENUE_OPTIONS.find(option => option.value === form.venue_type)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-access-mode">Acceso a la carta *</Label>
          <select
            id="edit-access-mode"
            value={form.menu_access_mode}
            onChange={e => setForm({ ...form, menu_access_mode: e.target.value as MenuAccessMode })}
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {MENU_ACCESS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {MENU_ACCESS_OPTIONS.find(option => option.value === form.menu_access_mode)?.description}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Descripcion</Label>
        <Textarea
          id="edit-description"
          placeholder={venueConfig.descriptionPlaceholder}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-address">Direccion</Label>
        <Input
          id="edit-address"
          placeholder="Calle Mayor 1, Malaga"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">Telefono</Label>
        <Input
          id="edit-phone"
          placeholder="952 123 456"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>


      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="flex-1 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
        </Button>
        {onSuccess ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onSuccess}>
            Cancelar
          </Button>
        ) : (
          <Link href="/admin/dashboard">
            <Button type="button" variant="outline" className="cursor-pointer">
              Cancelar
            </Button>
          </Link>
        )}
      </div>
    </form>
  )
}
