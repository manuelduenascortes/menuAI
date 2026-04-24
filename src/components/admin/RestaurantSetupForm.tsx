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
import { ESTABLISHMENT_TYPES } from '@/lib/constants'
import {
  DEFAULT_MENU_ACCESS_MODE,
  DEFAULT_VENUE_TYPE,
  getVenueConfig,
  MENU_ACCESS_OPTIONS,
  VENUE_OPTIONS,
} from '@/lib/venue-config'
import type { MenuAccessMode, VenueType } from '@/lib/types'

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
  const [form, setForm] = useState<{
    name: string
    venue_type: VenueType
    menu_access_mode: MenuAccessMode
    description: string
    address: string
    phone: string
    establishment_type: string
  }>({
    name: '',
    venue_type: DEFAULT_VENUE_TYPE,
    menu_access_mode: DEFAULT_MENU_ACCESS_MODE,
    description: '',
    address: '',
    phone: '',
    establishment_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const slug = slugify(form.name)

    const { error: insertError } = await supabase.from('restaurants').insert({
      user_id: userId,
      name: form.name,
      slug,
      venue_type: form.venue_type,
      menu_access_mode: form.menu_access_mode,
      description: form.description || null,
      address: form.address || null,
      phone: form.phone || null,
      establishment_type: form.establishment_type || null,
    })

    if (insertError) {
      const msg = insertError.message.includes('slug') ? 'Ya existe un local con ese nombre.' : insertError.message
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    toast.success('Local creado')
    router.refresh()
  }

  const venueConfig = getVenueConfig(form.venue_type)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="setup-name">Nombre del local *</Label>
        <Input
          id="setup-name"
          placeholder="Ej: Bar La Malaguena"
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="setup-venue-type">Tipo de local *</Label>
          <select
            id="setup-venue-type"
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
          <Label htmlFor="setup-access-mode">Acceso a la carta *</Label>
          <select
            id="setup-access-mode"
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
        <Label htmlFor="setup-description">Descripcion</Label>
        <Textarea
          id="setup-description"
          placeholder={venueConfig.descriptionPlaceholder}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-address">Direccion</Label>
        <Input
          id="setup-address"
          placeholder="Calle Mayor 1, Malaga"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-phone">Telefono</Label>
        <Input
          id="setup-phone"
          placeholder="952 123 456"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo de establecimiento</Label>
        <Select
          value={form.establishment_type || undefined}
          onValueChange={value =>
            setForm(current => ({ ...current, establishment_type: value ?? '' }))
          }
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

      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full cursor-pointer">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear local'}
      </Button>
    </form>
  )
}
