'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { ChatMessage, VenueType } from '@/lib/types'
import { getVenueConfig } from '@/lib/venue-config'

export interface ChatMenuItem {
  id: string
  name: string
  image_url: string
}

type LocalMessage = ChatMessage & {
  images?: { id: string; name: string; url: string }[]
}

interface Props {
  restaurantSlug: string
  restaurantName: string
  venueType?: VenueType | null
  onClose: () => void
  menuItems?: ChatMenuItem[]
}

function matchMenuImages(text: string, items: ChatMenuItem[]) {
  if (!items.length) return []
  const matched: { id: string; name: string; url: string }[] = []
  const seen = new Set<string>()
  const lower = text.toLowerCase()
  const sorted = [...items].sort((a, b) => b.name.length - a.name.length)

  for (const item of sorted) {
    if (seen.has(item.id)) continue
    const name = item.name.toLowerCase()
    if (lower.includes(`**${name}**`) || lower.includes(name)) {
      matched.push({ id: item.id, name: item.name, url: item.image_url })
      seen.add(item.id)
      if (matched.length >= 5) break
    }
  }
  return matched
}

export default function ChatInterface({ restaurantSlug, restaurantName, venueType, onClose, menuItems = [] }: Props) {
  const venueConfig = getVenueConfig(venueType)
  const [messages, setMessages] = useState<LocalMessage[]>([
    { role: 'assistant', content: venueConfig.chatGreeting },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const container = dialogRef.current
    if (!container) return
    const focusable = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onClose])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg: LocalMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = newMessages
        .filter((_, index) => index > 0)
        .map(({ role, content }) => ({ role, content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          restaurantSlug,
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Error en la respuesta')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantContent },
        ])
      }

      const matchedImages = matchMenuImages(assistantContent, menuItems)
      if (matchedImages.length > 0) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantContent, images: matchedImages },
        ])
      }

      setLiveMessage(assistantContent)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Lo siento, ha habido un error. Inténtalo de nuevo.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chat con asistente IA"
      onKeyDown={handleKeyDown}
      className="fixed inset-x-0 top-0 z-50 flex flex-col bg-background animate-fade-in"
      style={{ height: '100dvh' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-[18px] h-[18px] text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">Asistente</p>
            <p className="text-xs text-muted-foreground">{restaurantName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Cerrar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
        onTouchStart={() => inputRef.current?.blur()}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
            style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap [&_strong]:font-bold ${
                msg.role === 'user'
                  ? 'bg-foreground text-background rounded-br-md'
                  : 'bg-secondary text-foreground rounded-bl-md'
              }`}
            >
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {msg.content}
              </ReactMarkdown>
              {msg.role === 'assistant' && msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-1 -mx-1 px-1">
                  {msg.images.map(img => (
                    <div key={img.id} className="shrink-0 flex flex-col items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-20 h-20 rounded-lg object-cover border border-border/50"
                      />
                      <span className="text-[10px] text-muted-foreground text-center max-w-[80px] leading-tight line-clamp-2">
                        {img.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start" role="status">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3.5">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="sr-only">El asistente está escribiendo</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        <div aria-live="polite" className="sr-only">{liveMessage}</div>
      </div>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            aria-label="Escribe tu mensaje"
            disabled={loading}
            className="flex-1 bg-secondary text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30 transition-shadow disabled:opacity-60"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 disabled:opacity-30 cursor-pointer"
            aria-label="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center mt-2 opacity-70">
          La IA puede cometer errores. Consulta al personal si tienes dudas importantes sobre ingredientes o alérgenos.
        </p>
      </div>
    </div>
  )
}
