function scheduleHydrationCallback(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback)
    return () => {}
  }

  const timeoutId = setTimeout(callback, 0)
  return () => clearTimeout(timeoutId)
}

function subscribeHydration(callback, schedule = scheduleHydrationCallback) {
  return schedule(callback)
}

function getHydrationSnapshot() {
  return true
}

function getHydrationServerSnapshot() {
  return false
}

module.exports = {
  getHydrationServerSnapshot,
  getHydrationSnapshot,
  scheduleHydrationCallback,
  subscribeHydration,
}
