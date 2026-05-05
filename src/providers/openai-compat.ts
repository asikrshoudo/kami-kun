import { OpenAICompatibleProvider } from './base.js'
import { loadConfig } from '../config.js'

// ── OpenAI ────────────────────────────────────────────────────────────────────
export class OpenAIProvider extends OpenAICompatibleProvider {
  id = 'openai'
  name = 'OpenAI'
  baseUrl = 'https://api.openai.com/v1'
  defaultModel = 'gpt-4o'
  models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini']
  protected getApiKey() { return loadConfig().api_keys['openai'] ?? '' }
}

// ── Groq ──────────────────────────────────────────────────────────────────────
export class GroqProvider extends OpenAICompatibleProvider {
  id = 'groq'
  name = 'Groq'
  baseUrl = 'https://api.groq.com/openai/v1'
  defaultModel = 'llama-3.3-70b-versatile'
  models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'qwen-2.5-72b',
  ]
  protected getApiKey() { return loadConfig().api_keys['groq'] ?? '' }
}

// ── xAI Grok ──────────────────────────────────────────────────────────────────
export class GrokProvider extends OpenAICompatibleProvider {
  id = 'grok'
  name = 'xAI Grok'
  baseUrl = 'https://api.x.ai/v1'
  defaultModel = 'grok-2-latest'
  models = ['grok-2-latest', 'grok-2-vision-latest', 'grok-beta']
  protected getApiKey() { return loadConfig().api_keys['grok'] ?? '' }
}

// ── DeepSeek ──────────────────────────────────────────────────────────────────
export class DeepSeekProvider extends OpenAICompatibleProvider {
  id = 'deepseek'
  name = 'DeepSeek'
  baseUrl = 'https://api.deepseek.com/v1'
  defaultModel = 'deepseek-chat'
  models = ['deepseek-chat', 'deepseek-reasoner']
  protected getApiKey() { return loadConfig().api_keys['deepseek'] ?? '' }
}

// ── Mistral ───────────────────────────────────────────────────────────────────
export class MistralProvider extends OpenAICompatibleProvider {
  id = 'mistral'
  name = 'Mistral'
  baseUrl = 'https://api.mistral.ai/v1'
  defaultModel = 'mistral-large-latest'
  models = ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'open-mistral-nemo']
  protected getApiKey() { return loadConfig().api_keys['mistral'] ?? '' }
}

// ── Perplexity ────────────────────────────────────────────────────────────────
export class PerplexityProvider extends OpenAICompatibleProvider {
  id = 'perplexity'
  name = 'Perplexity'
  baseUrl = 'https://api.perplexity.ai'
  defaultModel = 'sonar-pro'
  models = ['sonar-pro', 'sonar', 'sonar-reasoning-pro']
  protected getApiKey() { return loadConfig().api_keys['perplexity'] ?? '' }
}

// ── Together AI ───────────────────────────────────────────────────────────────
export class TogetherProvider extends OpenAICompatibleProvider {
  id = 'together'
  name = 'Together AI'
  baseUrl = 'https://api.together.xyz/v1'
  defaultModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  models = [
    'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    'deepseek-ai/DeepSeek-V3',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
    'mistralai/Mixtral-8x22B-Instruct-v0.1',
  ]
  protected getApiKey() { return loadConfig().api_keys['together'] ?? '' }
}

// ── Cohere ────────────────────────────────────────────────────────────────────
export class CohereProvider extends OpenAICompatibleProvider {
  id = 'cohere'
  name = 'Cohere'
  baseUrl = 'https://api.cohere.com/compatibility/v1'
  defaultModel = 'command-r-plus-08-2024'
  models = ['command-r-plus-08-2024', 'command-r-08-2024', 'command-light']
  protected getApiKey() { return loadConfig().api_keys['cohere'] ?? '' }
}
