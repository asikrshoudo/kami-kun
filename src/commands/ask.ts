import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { printError } from '../ui.js'
import type { Message } from '../types.js'

export async function runAsk(
  prompt: string,
  opts: { provider?: string; model?: string }
): Promise<void> {
  const config = loadConfig()
  const providerId = opts.provider ?? config.default_provider ?? 'groq'

  let provider
  try {
    provider = getProvider(providerId)
  } catch (e: unknown) {
    printError((e as Error).message)
    process.exit(1)
  }

  const model = opts.model ?? config.default_model ?? provider.defaultModel
  const messages: Message[] = [{ role: 'user', content: prompt }]

  try {
    await provider.chat(messages, model, (chunk) => {
      process.stdout.write(chunk)
    })
    process.stdout.write('\n')
  } catch (e: unknown) {
    printError((e as Error).message)
    process.exit(1)
  }
}
