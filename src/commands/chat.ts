import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { printError, printHelp } from '../ui.js'
import { label } from '../model-labels.js'
import type { Message } from '../types.js'

function clearFull(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
}

const CHAT_HELP = [
  { cmd: '/exit',           desc: 'End session'              },
  { cmd: '/clear',          desc: 'Clear conversation history'},
  { cmd: '/model <name>',   desc: 'Switch model'             },
  { cmd: '/switch <id>',    desc: 'Switch provider'          },
  { cmd: '/name <name>',    desc: 'Change your display name' },
]

export async function runChat(opts: { provider?: string; model?: string }): Promise<void> {
  clearFull()

  const config = loadConfig()
  let providerId = opts.provider ?? config.default_provider ?? 'groq'
  let provider = getProvider(providerId)
  let model = opts.model ?? config.default_model ?? provider.defaultModel
  let userName = config.user_name ?? 'you'
  const history: Message[] = []

  // Header
  console.log()
  console.log(
    '  ' + chalk.bold.cyan('nion') +
    chalk.dim(' chat  ·  ') +
    chalk.white(provider.name) +
    chalk.dim('  ·  ') +
    chalk.white(label(model))
  )
  console.log('  ' + chalk.dim('─'.repeat(50)))
  console.log(
    chalk.dim('  /help') + '  ' +
    chalk.dim('/clear') + '  ' +
    chalk.dim('/model') + '  ' +
    chalk.dim('/switch') + '  ' +
    chalk.dim('/exit')
  )
  console.log()

  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    })

    const prompt = () => {
      rl.question('\n' + chalk.bold.green(userName) + chalk.dim(' › '), async (input) => {
        const line = input.trim()
        if (!line) { prompt(); return }

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
              clearFull()
              console.log()
              console.log(
                '  ' + chalk.bold.cyan('nion') +
                chalk.dim(' chat  ·  ') +
                chalk.white(provider.name) +
                chalk.dim('  ·  ') +
                chalk.white(label(model))
              )
              console.log('  ' + chalk.dim('─'.repeat(50)))
              console.log()
              console.log(chalk.dim('  History cleared.'))
              break

            case '/help':
              printHelp(CHAT_HELP)
              break

            case '/model':
              if (!arg) { printError('Usage: /model <name>'); break }
              model = arg
              console.log(chalk.dim(`\n  Model → ${label(model)}`))
              break

            case '/switch':
              if (!arg) { printError('Usage: /switch <provider>'); break }
              try {
                provider = getProvider(arg)
                providerId = arg
                model = config.default_model ?? provider.defaultModel
                console.log(chalk.dim(`\n  Provider → ${provider.name}  ·  ${label(model)}`))
              } catch (e: unknown) { printError((e as Error).message) }
              break

            case '/name':
              if (!arg) { printError('Usage: /name <name>'); break }
              userName = arg
              console.log(chalk.dim(`\n  Name → ${userName}`))
              break

            default:
              printError(`Unknown command: ${cmd}. Type /help for commands.`)
          }

          prompt()
          return
        }

        history.push({ role: 'user', content: line })
        process.stdout.write(
          '\n' + chalk.bold.cyan('nion') +
          chalk.dim(` › `)
        )

        try {
          const reply = await provider.chat(history, model, (chunk) => {
            process.stdout.write(chunk)
          })
          process.stdout.write('\n')
          history.push({ role: 'assistant', content: reply })
        } catch (e: unknown) {
          process.stdout.write('\n')
          printError((e as Error).message)
        }

        prompt()
      })
    }

    prompt()
    rl.on('close', () => resolve())
  })
}
