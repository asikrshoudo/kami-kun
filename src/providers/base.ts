import type { Message, Provider, Tool, ChatResponse, ToolCall } from '../types.js'

export abstract class OpenAICompatibleProvider implements Provider {
  abstract id: string
  abstract name: string
  abstract defaultModel: string
  abstract models: string[]
  abstract baseUrl: string

  protected getApiKey(): string {
    return ''
  }

  async chat(
    messages: Message[],
    model: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const apiKey = this.getApiKey()
    if (!apiKey) throw new Error(`No API key for ${this.name}. Run: kami-kun config set-key ${this.id} <key>`)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`${this.name} API error ${response.status}: ${err}`)
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
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue
        try {
          const data = JSON.parse(trimmed.slice(6))
          const text = data.choices?.[0]?.delta?.content ?? ''
          if (text) {
            full += text
            onChunk(text)
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
    if (!apiKey) throw new Error(`No API key for ${this.name}. Run: kami-kun config set-key ${this.id} <key>`)

    const openaiTools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`${this.name} API error ${response.status}: ${err}`)
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string | null
          tool_calls?: Array<{
            function: { name: string; arguments: string }
          }>
        }
      }>
    }

    const msg = data.choices[0].message
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map(tc => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }))

    return {
      content: msg.content ?? '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}
