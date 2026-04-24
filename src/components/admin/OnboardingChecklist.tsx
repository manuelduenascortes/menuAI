'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, Store, BookOpen, QrCode, X } from 'lucide-react'
import type { MenuAccessMode } from '@/lib/types'
import { getAccessChecklistStep, normalizeMenuAccessMode, supportsTableQr } from '@/lib/venue-config'

interface Props {
  hasRestaurant: boolean
  hasItems: boolean
  hasTables: boolean
  accessMode?: MenuAccessMode | null
}

export default function OnboardingChecklist({ hasRestaurant, hasItems, hasTables, accessMode }: Props) {
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  const normalizedAccessMode = normalizeMenuAccessMode(accessMode)
  const accessDone = supportsTableQr(normalizedAccessMode) ? hasTables : hasRestaurant

  const steps = [
    { label: 'Crear local', done: hasRestaurant, icon: Store, href: '/admin/dashboard' },
    { label: 'Añadir carta', done: hasItems, icon: BookOpen, href: '/admin/carta' },
    { label: getAccessChecklistStep(normalizedAccessMode), done: accessDone, icon: QrCode, href: '/admin/mesas' },
  ]

  const completed = steps.filter(s => s.done).length
  const allDone = completed === steps.length
  const pct = Math.round((completed / steps.length) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Primeros pasos</CardTitle>
          {allDone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground"
              onClick={() => setHidden(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{completed}/{steps.length}</span>
        </div>
        <div className="space-y-2">
          {steps.map(step => (
            <Link
              key={step.label}
              href={step.href}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={step.done ? 'text-sm text-muted-foreground line-through' : 'text-sm text-foreground font-medium'}>
                {step.label}
              </span>
              <step.icon className="w-4 h-4 text-muted-foreground/40 ml-auto" />
            </Link>
          ))}
        </div>
        {allDone && (
          <p className="text-xs text-primary text-center font-medium">
            Todo listo. Tu local ya esta configurado.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
