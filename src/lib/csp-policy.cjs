function buildCsp({ isDev, supabaseUrl, supabaseHostname }) {
  const connectSources = ["'self'"]

  if (isDev) {
    connectSources.push('http://127.0.0.1:*', 'http://localhost:*', 'ws://127.0.0.1:*', 'ws://localhost:*')
  }

  if (supabaseUrl) {
    connectSources.push(supabaseUrl)
  }

  if (supabaseHostname) {
    connectSources.push(`wss://${supabaseHostname}`)
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabaseHostname ? ` https://${supabaseHostname}` : ''}`,
    "font-src 'self'",
    `connect-src ${connectSources.join(' ')}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  if (!isDev) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

module.exports = {
  buildCsp,
}
