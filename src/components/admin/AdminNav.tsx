'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { LayoutDashboard, BookOpen, QrCode, LogOut, Menu, X } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import ThemeToggle from '@/components/ThemeToggle'
import type { User } from '@supabase/supabase-js'
import type { Restaurant } from '@/lib/types'
import { getAccessManagementTitle } from '@/lib/venue-config'

interface AdminNavProps {
  user: User
  restaurant: Pick<Restaurant, 'menu_access_mode'> | null
}

export default function AdminNav({ user, restaurant }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const accessLabel = getAccessManagementTitle(restaurant?.menu_access_mode)
  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/carta', label: 'Carta', icon: BookOpen },
    { href: '/admin/mesas', label: accessLabel, icon: QrCode },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin/dashboard" className="cursor-pointer">
            <BrandLogo textClassName="text-lg text-foreground" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(link => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'text-foreground font-medium bg-secondary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="hidden md:block text-sm text-muted-foreground truncate max-w-[200px]">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-5 py-3 space-y-1 animate-fade-in">
          {links.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'text-foreground font-medium bg-secondary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-border mt-2">
            <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
