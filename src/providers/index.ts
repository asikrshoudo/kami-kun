import type { Provider } from '../types.js'
import { AnthropicProvider } from './anthropic.js'
import { GoogleProvider } from './google.js'
import { OllamaProvider } from './ollama.js'
import {
  OpenAIProvider, GroqProvider, GrokProvider,
  DeepSeekProvider, MistralProvider, PerplexityProvider,
  TogetherProvider, CohereProvider, OpenRouterProvider,
} from './openai-compat.js'

export const ALL_PROVIDERS: Provider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleProvider(),
  new GroqProvider(),
  new GrokProvider(),
  new DeepSeekProvider(),
  new MistralProvider(),
  new PerplexityProvider(),
  new TogetherProvider(),
  new CohereProvider(),
  new OpenRouterProvider(),
  new OllamaProvider(),
]

export { OllamaProvider }

export function getProvider(id: string): Provider {
  const p = ALL_PROVIDERS.find(p => p.id === id)
  if (!p) throw new Error(`Unknown provider: "${id}". Run "kami-kun models" to see all.`)
  return p
}
