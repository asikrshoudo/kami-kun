import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { printError, printHelp, printHeader } from '../ui.js'
import type { Message } from '../types.js'

const CHAT_HELP = [
  { cmd: '/help', desc: 'Show this help' },
  { cmd: '/exit', desc: 'End session' },
  { cmd: '/clear', desc: 'Clear conversation history' },
  { cmd: '/model <name>', desc: 'Switch model' },
  { cmd: '/switch <provider>', desc: 'Switch provider' },
  { cmd: '/name <name>', desc: 'Change your display name' },
]

export async function runChat(opts: { provider?: string; model?: string }): Promise<void> {
  const config = loadConfig()
  let providerId = opts.provider ?? config.default_provider ?? 'groq'
  let provider = getProvider(providerId)
  let model = opts.model ?? config.default_model ?? provider.defaultModel
  let userName = config.user_name ?? 'you'
  const history: Message[] = []

  printHeader(`nion chat  ·  ${provider.name} / ${model}`)
  console.log(chalk.dim('  Type /help for commands, /exit to quit\n'))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  const prompt = () => {
    rl.question(chalk.bold.green(userName) + chalk.dim(' › '), async (input) => {
      const line = input.trim()
      if (!line) { prompt(); return }

      // Handle slash commands
      if (line.startsWith('/')) {
        const [cmd, ...rest] = line.split(' ')
        const arg = rest.join(' ').trim()

        switch (cmd) {
          case '/exit':
            console.log(chalk.dim('\n  See you later.\n'))
            rl.close()
            return

          case '/clear':
            history.length = 0
            console.log(chalk.dim('  History cleared.\n'))
            break

          case '/help':
            printHelp(CHAT_HELP)
            break

          case '/model':
            if (!arg) { printError('Usage: /model <name>'); break }
            model = arg
            console.log(chalk.dim(`  Switched to model: ${model}\n`))
            break

          case '/switch':
            if (!arg) { printError('Usage: /switch <provider>'); break }
            try {
              provider = getProvider(arg)
              providerId = arg
              model = config.default_model ?? provider.defaultModel
              console.log(chalk.dim(`  Switched to: ${provider.name} / ${model}\n`))
            } catch (e: unknown) {
              printError((e as Error).message)
            }
            break

          case '/name':
            if (!arg) { printError('Usage: /name <name>'); break }
            userName = arg
            console.log(chalk.dim(`  Name set to: ${userName}\n`))
            break

          default:
            printError(`Unknown command: ${cmd}`)
        }

        prompt()
        return
      }

      // Normal message
      history.push({ role: 'user', content: line })
      process.stdout.write('\n' + chalk.bold.cyan('nion') + chalk.dim(` [${provider.name}/${model}] › `))

      try {
        const reply = await provider.chat(history, model, (chunk) => {
          process.stdout.write(chunk)
        })
        process.stdout.write('\n\n')
        history.push({ role: 'assistant', content: reply })
      } catch (e: unknown) {
        process.stdout.write('\n')
        printError((e as Error).message)
      }

      prompt()
    })
  }

  prompt()

  rl.on('close', () => process.exit(0))
}
