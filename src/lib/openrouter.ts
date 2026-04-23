import OpenAI from 'openai'

export const openRouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key_for_build',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://menuai.es',
    'X-Title': 'MenuAI',
  }
})

export const OR_MODEL = 'openai/gpt-4o-mini'
