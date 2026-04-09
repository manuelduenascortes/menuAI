'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

interface AdminNavProps {
  user: User
}

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/admin/carta', label: 'Carta', icon: '📋' },
  { href: '/admin/mesas', label: 'Mesas & QR', icon: '🪑' },
]

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <span>🍽️</span>
            <span className="text-gray-900">MenuAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-sm text-gray-500">{user.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </nav>
  )
}
