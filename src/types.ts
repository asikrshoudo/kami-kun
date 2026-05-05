export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface Config {
  default_provider: string
  default_model?: string
  user_name?: string
  api_keys: Record<string, string>
}

export interface Tool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface ChatResponse {
  content: string
  toolCalls?: ToolCall[]
}

export interface Provider {
  id: string
  name: string
  defaultModel: string
  models: string[]
  chat(
    messages: Message[],
    model: string,
    onChunk: (text: string) => void
  ): Promise<string>
  chatWithTools?(
    messages: Message[],
    model: string,
    tools: Tool[]
  ): Promise<ChatResponse>
}
