export function scheduleHydrationCallback(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback)
    return () => {}
  }

  const timeoutId = setTimeout(callback, 0)
  return () => clearTimeout(timeoutId)
}

export function subscribeHydration(callback, schedule = scheduleHydrationCallback) {
  return schedule(callback)
}

export function getHydrationSnapshot() {
  return true
}

export function getHydrationServerSnapshot() {
  return false
}
