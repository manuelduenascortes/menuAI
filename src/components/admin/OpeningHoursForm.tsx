'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function OpeningHoursForm({
  restaurantId,
  initialValue,
}: {
  restaurantId: string
  initialValue: string
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ opening_hours: value.trim() || null })
      .eq('id', restaurantId)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar horarios')
    } else {
      toast.success('Horarios actualizados')
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={'Lun–Vie: 12:00–16:00 y 20:00–23:30\nSáb–Dom: 12:00–24:00\nLunes cerrado'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
      />
      <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
        {saving ? 'Guardando...' : 'Guardar horarios'}
      </Button>
    </div>
  )
}
