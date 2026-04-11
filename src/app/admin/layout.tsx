import { createServerSupabase } from '@/lib/supabase'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already redirects unauthenticated users for non-login routes.
  // If user exists, show full admin chrome; otherwise render children bare (login page).
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav user={user} />
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
