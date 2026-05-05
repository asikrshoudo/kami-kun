import { OpenAICompatibleProvider } from './base.js'

export class OllamaProvider extends OpenAICompatibleProvider {
  id = 'ollama'
  name = 'Ollama (Local)'
  baseUrl = 'http://localhost:11434/v1'
  defaultModel = 'gemma3'
  models = [
    'gemma3', 'gemma2', 'llama3.2', 'llama3.1',
    'codellama', 'deepseek-coder-v2', 'qwen2.5-coder',
    'phi3', 'mistral', 'starcoder2',
  ]
  protected getApiKey() { return 'ollama' }

  async isRunning(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000),
      })
      return res.ok
    } catch {
      return false
    }
  }
}
