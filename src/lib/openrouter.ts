const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const OR_MODEL = 'openai/gpt-4o-mini'

export type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenRouterContentPart[]
}

export interface OpenRouterChatRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export interface OpenRouterStreamChunk {
  choices: Array<{
    delta?: {
      content?: string
    }
  }>
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || 'dummy_key_for_build'}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://menuai.es',
    'X-Title': 'MenuAI',
  }
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } }
    return data.error?.message || `OpenRouter request failed (${response.status})`
  } catch {
    return `OpenRouter request failed (${response.status})`
  }
}

export async function createOpenRouterChatCompletion(
  request: OpenRouterChatRequest,
  signal?: AbortSignal,
): Promise<OpenRouterChatResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, stream: false }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }

  return (await response.json()) as OpenRouterChatResponse
}

export async function createOpenRouterChatStream(
  request: OpenRouterChatRequest,
  signal?: AbortSignal,
): Promise<AsyncGenerator<OpenRouterStreamChunk>> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }

  return streamOpenRouterResponse(response)
}

async function* streamOpenRouterResponse(
  response: Response,
): AsyncGenerator<OpenRouterStreamChunk> {
  if (!response.body) {
    throw new Error('OpenRouter did not return a readable stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue

      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue

      yield JSON.parse(payload) as OpenRouterStreamChunk
    }
  }

  const trailing = buffer.trim()
  if (trailing.startsWith('data:')) {
    const payload = trailing.slice(5).trim()
    if (payload && payload !== '[DONE]') {
      yield JSON.parse(payload) as OpenRouterStreamChunk
    }
  }
}
