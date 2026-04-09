import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // /admin/login no necesita layout con nav
  return (
    <div className="min-h-screen bg-gray-50">
      {user && <AdminNav user={user} />}
      <main className={user ? 'pt-16' : ''}>
        {children}
      </main>
    </div>
  )
}
