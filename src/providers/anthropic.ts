import type { Provider, Message, Tool, ChatResponse, ToolCall } from '../types.js'
import { loadConfig } from '../config.js'

export class AnthropicProvider implements Provider {
  id = 'anthropic'
  name = 'Anthropic'
  defaultModel = 'claude-3-5-sonnet-20241022'
  models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ]

  private getApiKey(): string {
    return loadConfig().api_keys['anthropic'] ?? ''
  }

  private buildMessages(messages: Message[]): { system?: string; msgs: Array<{ role: string; content: string }> } {
    const system = messages.find(m => m.role === 'system')?.content
    const msgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
    return { system, msgs }
  }

  async chat(
    messages: Message[],
    model: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('No API key for Anthropic. Run: kami-kun config set-key anthropic <key>')

    const { system, msgs } = this.buildMessages(messages)

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: msgs,
      stream: true,
    }
    if (system) body['system'] = system

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${err}`)
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
          if (data.type === 'content_block_delta') {
            const text = data.delta?.text ?? ''
            if (text) {
              full += text
              onChunk(text)
            }
          }
        } catch {}
      }
    }

    return full
  }

  async chatWithTools(
    messages: Message[],
    model: string,
    tools: Tool[]
  ): Promise<ChatResponse> {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error('No API key for Anthropic.')

    const { system, msgs } = this.buildMessages(messages)

    const anthropicTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: msgs,
      tools: anthropicTools,
    }
    if (system) body['system'] = system

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${err}`)
    }

    const data = await response.json() as {
      content: Array<{
        type: string
        text?: string
        name?: string
        input?: Record<string, unknown>
      }>
    }

    let content = ''
    const toolCalls: ToolCall[] = []

    for (const block of data.content) {
      if (block.type === 'text') content += block.text ?? ''
      if (block.type === 'tool_use') {
        toolCalls.push({ name: block.name!, arguments: block.input ?? {} })
      }
    }

    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
  }
}
