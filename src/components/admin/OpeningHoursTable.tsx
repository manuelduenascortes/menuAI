'use client'

import { Switch } from '@/components/ui/switch'

export interface DayHours {
  day: string
  open: boolean
  from: string
  to: string
}

export const DEFAULT_HOURS: DayHours[] = [
  { day: 'Lun', open: false, from: '09:00', to: '17:00' },
  { day: 'Mar', open: true,  from: '09:00', to: '17:00' },
  { day: 'Mié', open: true,  from: '09:00', to: '17:00' },
  { day: 'Jue', open: true,  from: '09:00', to: '17:00' },
  { day: 'Vie', open: true,  from: '09:00', to: '17:00' },
  { day: 'Sáb', open: false, from: '09:00', to: '17:00' },
  { day: 'Dom', open: false, from: '09:00', to: '17:00' },
]

export function parseOpeningHours(raw: string): DayHours[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0]?.day === 'string') {
      return parsed as DayHours[]
    }
    return null
  } catch {
    return null
  }
}

export default function OpeningHoursTable({
  value,
  onChange,
}: {
  value: DayHours[]
  onChange: (v: DayHours[]) => void
}) {
  function update(index: number, patch: Partial<DayHours>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={row.day} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-8 shrink-0 text-sm font-medium text-foreground">{row.day}</span>

          <Switch
            checked={row.open}
            onCheckedChange={(checked) => update(index, { open: checked })}
            aria-label={`${row.day} abierto`}
          />

          <span className={`text-xs w-14 shrink-0 ${row.open ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
            {row.open ? 'Abierto' : 'Cerrado'}
          </span>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <input
              type="time"
              value={row.from}
              disabled={!row.open}
              onChange={(e) => update(index, { from: e.target.value })}
              className="h-9 w-[7.5rem] rounded-md border border-border bg-background px-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={`${row.day} hora de apertura`}
            />

            <span className={`text-xs shrink-0 ${row.open ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>–</span>

            <input
              type="time"
              value={row.to}
              disabled={!row.open}
              onChange={(e) => update(index, { to: e.target.value })}
              className="h-9 w-[7.5rem] rounded-md border border-border bg-background px-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={`${row.day} hora de cierre`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
