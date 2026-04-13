'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { ChatMessage } from '@/lib/types'

const GREETING = '¡Hola! 👋 Soy el asistente de este restaurante. Estoy aquí para ayudarte a elegir el plato perfecto.\n\n¿Tienes alguna **alergia**, intolerancia o restricción alimentaria? (Por ejemplo: gluten, lactosa, frutos secos, eres vegetariano/vegano, etc.)\n\nO si lo prefieres, cuéntame qué te apetece comer y te hago sugerencias 😊'

interface Props {
  restaurantSlug: string
  restaurantName: string
  onClose: () => void
}

export default function ChatInterface({ restaurantSlug, restaurantName, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const abortRef = useRef<AbortController | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [liveMessage, setLiveMessage] = useState('')

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Focus trap
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

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Skip the hardcoded greeting message — system prompt handles greeting behavior
      const apiMessages = newMessages.filter((_, i) => i > 0)

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
      className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in"
    >
      {/* ─── HEADER ─── */}
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

      {/* ─── MESSAGES ─── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
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
            </div>
          </div>
        ))}

        {/* Typing indicator */}
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

      {/* ─── INPUT ─── */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            aria-label="Escribe tu mensaje"
            disabled={loading}
            className="flex-1 bg-secondary text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow disabled:opacity-60"
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
          La IA puede cometer errores. Consulta al personal para alergias graves.
        </p>
      </div>
    </div>
  )
}

