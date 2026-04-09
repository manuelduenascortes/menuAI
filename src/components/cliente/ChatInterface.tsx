'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          restaurantSlug,
        }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      // Añadir mensaje vacío del asistente para ir llenando con streaming
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
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Lo siento, ha habido un error. Inténtalo de nuevo.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <p className="font-semibold text-sm">Asistente</p>
            <p className="text-xs opacity-80">{restaurantName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white opacity-80 hover:opacity-100 p-1"
          aria-label="Cerrar chat"
        >
          ✕
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
            />
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="bg-orange-500 hover:bg-orange-600">
            ➤
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-1.5">
          IA puede cometer errores. Consulta al personal para alergias graves.
        </p>
      </div>
    </div>
  )
}

// Formateo básico: **bold** → <strong>
function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}
