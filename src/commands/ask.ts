import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { printError, renderMarkdown } from '../ui.js'
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

  console.log()
  process.stdout.write(chalk.bold.cyan('kami-kun') + chalk.dim(' › '))

  let fullReply = ''
  try {
    await provider.chat(messages, model, (chunk) => {
      fullReply += chunk
      process.stdout.write(chunk)
    })

    const lineCount = fullReply.split('\n').length
    if (fullReply.includes('```') || fullReply.includes('**') || fullReply.includes('`')) {
      process.stdout.write(`\x1b[${lineCount}A\x1b[0J`)
      process.stdout.write(chalk.bold.cyan('kami-kun') + chalk.dim(' › '))
      console.log(renderMarkdown(fullReply))
    } else {
      process.stdout.write('\n\n')
    }
  } catch (e: unknown) {
    process.stdout.write('\n')
    printError((e as Error).message)
    process.exit(1)
  }
}
