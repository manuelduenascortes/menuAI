'use client'

import { useSyncExternalStore } from 'react'
import {
  getHydrationServerSnapshot,
  getHydrationSnapshot,
  subscribeHydration,
} from '@/lib/hydration-store.mjs'

export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getHydrationServerSnapshot
  )
}
