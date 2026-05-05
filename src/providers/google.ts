import type { Provider, Message } from '../types.js'
import { loadConfig } from '../config.js'

export class GoogleProvider implements Provider {
  id = 'google'
  name = 'Google Gemini'
  defaultModel = 'gemini-2.0-flash'
  models = [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-thinking-exp',
  ]

  private getApiKey(): string {
    return loadConfig().api_keys['google'] ?? ''
  }

  async chat(
    messages: Message[],
    model: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('No API key for Google. Run: nion config set-key google <key>')

    const system = messages.find(m => m.role === 'system')?.content
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = { contents }
    if (system) {
      body['systemInstruction'] = { parts: [{ text: system }] }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Google API error ${response.status}: ${err}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        try {
          const data = JSON.parse(trimmed.slice(6))
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          if (text) {
            full += text
            onChunk(text)
          }
        } catch {}
      }
    }

    return full
  }
}
