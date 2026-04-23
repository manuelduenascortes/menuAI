import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  iconClassName?: string
  textClassName?: string
  showText?: boolean
}

export default function BrandLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: BrandLogoProps) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <UtensilsCrossed aria-hidden={!showText} className={cn('w-5 h-5 text-primary', iconClassName)} />
      {showText && (
        <span className={cn('font-serif text-xl', textClassName)}>MenuAI</span>
      )}
    </span>
  )
}
