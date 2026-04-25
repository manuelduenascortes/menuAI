'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { FontStyle, MenuAccessMode, VenueType } from '@/lib/types'
import {
  FONT_STYLE_OPTIONS,
  normalizeFontStyle,
  normalizePrimaryColor,
} from '@/lib/restaurant-theme'
import type { RestaurantFontClasses } from '@/lib/restaurant-fonts'
import {
  getVenueConfig,
  MENU_ACCESS_OPTIONS,
  normalizeMenuAccessMode,
  normalizeVenueType,
  VENUE_OPTIONS,
} from '@/lib/venue-config'
import RestaurantThemePreview from './RestaurantThemePreview'

export type EditableRestaurant = {
  id: string
  name: string
  slug?: string | null
  venue_type?: VenueType | null
  menu_access_mode?: MenuAccessMode | null
  description?: string | null
  logo_url?: string | null
  primary_color?: string | null
  font_style?: FontStyle | null
  address?: string | null
  phone?: string | null
  establishment_type?: string | null
}

export default function RestaurantEditForm({
  restaurant,
  fontClassMap,
  onSuccess,
}: {
  restaurant: EditableRestaurant
  fontClassMap: Record<FontStyle, RestaurantFontClasses>
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<{
    name: string
    venue_type: VenueType
    menu_access_mode: MenuAccessMode
    description: string
    logo_url: string
    primary_color: string
    font_style: FontStyle
    address: string
    phone: string
  }>({
    name: restaurant.name,
    venue_type: normalizeVenueType(restaurant.venue_type),
    menu_access_mode: normalizeMenuAccessMode(restaurant.menu_access_mode),
    description: restaurant.description ?? '',
    logo_url: restaurant.logo_url ?? '',
    primary_color: normalizePrimaryColor(restaurant.primary_color),
    font_style: normalizeFontStyle(restaurant.font_style),
    address: restaurant.address ?? '',
    phone: restaurant.phone ?? '',
  })
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    }
  }, [logoObjectUrl])

  async function handleLogoUpload(file: File) {
    const objectUrl = URL.createObjectURL(file)
    setLogoObjectUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return objectUrl
    })
    setUploadingLogo(true)

    try {
      const body = new FormData()
      body.append('file', file)
      body.append('restaurantId', restaurant.id)
      body.append('uploadType', 'restaurant-logo')
      if (form.logo_url) body.append('previousLogoUrl', form.logo_url)

      const response = await fetch('/api/upload', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setForm((current) => ({ ...current, logo_url: data.url }))
      setLogoObjectUrl(null)
      toast.success('Logo subido')
    } catch (error) {
      setLogoObjectUrl(null)
      toast.error(error instanceof Error ? error.message : 'Error subiendo logo')
    } finally {
      setUploadingLogo(false)
    }
  }

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
        logo_url: form.logo_url || null,
        primary_color: normalizePrimaryColor(form.primary_color),
        font_style: normalizeFontStyle(form.font_style),
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
  const logoPreviewUrl = logoObjectUrl || form.logo_url
  const selectedFontClasses = fontClassMap[form.font_style]

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Nombre del local *</Label>
          <Input
            id="edit-name"
            placeholder="Ej: Bar La Malaguena"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-venue-type">Tipo de local *</Label>
            <Select
              value={form.venue_type}
              onValueChange={(value) => setForm({ ...form, venue_type: value as VenueType })}
            >
              <SelectTrigger id="edit-venue-type" className="w-full bg-transparent">
                <SelectValue placeholder="Seleccionar tipo de local" />
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {VENUE_OPTIONS.find((option) => option.value === form.venue_type)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-access-mode">Acceso a la carta *</Label>
            <Select
              value={form.menu_access_mode}
              onValueChange={(value) => setForm({ ...form, menu_access_mode: value as MenuAccessMode })}
            >
              <SelectTrigger id="edit-access-mode" className="w-full bg-transparent">
                <SelectValue placeholder="Seleccionar acceso a la carta" />
              </SelectTrigger>
              <SelectContent>
                {MENU_ACCESS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {MENU_ACCESS_OPTIONS.find((option) => option.value === form.menu_access_mode)?.description}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Descripcion</Label>
          <Textarea
            id="edit-description"
            placeholder={venueConfig.descriptionPlaceholder}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-address">Direccion</Label>
            <Input
              id="edit-address"
              placeholder="Calle Mayor 1, Malaga"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefono</Label>
            <Input
              id="edit-phone"
              placeholder="952 123 456"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground">Identidad visual</h3>
            <p className="text-xs text-muted-foreground">
              Personaliza como se vera la carta publica.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {logoPreviewUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreviewUrl}
                      alt={form.name}
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                      onClick={() => {
                        setForm({ ...form, logo_url: '' })
                        setLogoObjectUrl(null)
                      }}
                      aria-label="Quitar logo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50">
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleLogoUpload(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                )}
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p>JPG, PNG, WebP o GIF.</p>
                  <p>Maximo 5 MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-primary-color">Color de marca</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="edit-primary-color"
                  type="color"
                  value={form.primary_color}
                  onChange={(event) => setForm({ ...form, primary_color: event.target.value.toUpperCase() })}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <span className="rounded-md border border-border px-2.5 py-1 text-sm font-mono">
                  {form.primary_color}
                </span>
                <span
                  className="h-7 w-7 rounded-full border border-border"
                  style={{ backgroundColor: form.primary_color }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estilo tipografico</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FONT_STYLE_OPTIONS.map((option) => {
                  const fontClasses = fontClassMap[option.value]
                  const selected = form.font_style === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setForm({ ...form, font_style: option.value })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-card hover:border-foreground/40'
                      }`}
                    >
                      <span className="mb-2 block text-xs font-medium">{option.label}</span>
                      <span className={`block text-base leading-tight ${fontClasses.heading}`}>
                        Nombre del plato
                      </span>
                      <span className={`mt-1 block text-xs opacity-75 ${fontClasses.body}`}>
                        Descripcion de ejemplo
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || uploadingLogo} className="flex-1 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
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
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <RestaurantThemePreview
          restaurantName={form.name}
          venueType={form.venue_type}
          logoUrl={logoPreviewUrl}
          primaryColor={form.primary_color}
          fontClasses={selectedFontClasses}
        />
      </div>
    </form>
  )
}
