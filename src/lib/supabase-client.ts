'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser client — stores auth in cookies (syncs with server/proxy)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
