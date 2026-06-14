import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { printError, printHelp, renderMarkdown } from '../ui.js'
import { label } from '../model-labels.js'
import type { Message } from '../types.js'

function clearFull(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
}

const AGENT_TRIGGERS = [
  /\b(create|make|build|generate|scaffold|init|setup|write|code|fix|refactor|add|implement)\b/i,
  /\b(project|folder|file|directory|repo|app|api|server|component|function|class)\b/i,
]

function looksLikeCodingTask(text: string): boolean {
  return AGENT_TRIGGERS.filter(r => r.test(text)).length >= 2
}

const CHAT_HELP = [
  { cmd: '/exit',         desc: 'End session'               },
  { cmd: '/clear',        desc: 'Clear conversation history' },
  { cmd: '/agent',        desc: 'Switch to agent mode'       },
  { cmd: '/model <name>', desc: 'Switch model'               },
  { cmd: '/switch <id>',  desc: 'Switch provider'            },
]

function printChatHeader(providerName: string, modelName: string): void {
  const W = Math.min(process.stdout.columns || 80, 88)
  console.log()
  console.log(
    '  ' + chalk.bold.cyan('kami-kun') +
    chalk.dim('  chat') +
    chalk.dim('  ·  ') +
    chalk.white(providerName) +
    chalk.dim('  /  ') +
    chalk.white(modelName)
  )
  console.log('  ' + chalk.dim('─'.repeat(W - 4)))
  console.log(
    '  ' + chalk.dim('/help') + '  ' +
    chalk.dim('/agent') + '  ' +
    chalk.dim('/clear') + '  ' +
    chalk.dim('/exit')
  )
  console.log()
}

export async function runChat(opts: { provider?: string; model?: string }): Promise<void> {
  clearFull()

  const config = loadConfig()
  let providerId = opts.provider ?? config.default_provider ?? 'groq'
  let provider = getProvider(providerId)
  let model = opts.model ?? config.default_model ?? provider.defaultModel
  let userName = config.user_name ?? 'you'
  const history: Message[] = []

  printChatHeader(provider.name, label(model))

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

            case '/agent':
              console.log(chalk.dim('\n  Switching to agent mode...\n'))
              rl.close()
              const { runAgent } = await import('./agent.js')
              await runAgent({ provider: providerId, model })
              resolve()
              return

            case '/clear':
              history.length = 0
              clearFull()
              printChatHeader(provider.name, label(model))
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
              printError(`Unknown command: ${cmd}`)
          }

          prompt()
          return
        }

        if (looksLikeCodingTask(line)) {
          console.log()
          console.log(
            '  ' + chalk.yellow('⚡') +
            chalk.dim(' Looks like a coding task — ') +
            chalk.cyan('/agent') +
            chalk.dim(' can write files and run commands.')
          )
        }

        history.push({ role: 'user', content: line })

        console.log()
        process.stdout.write(chalk.bold.cyan('kami-kun') + chalk.dim(' › '))

        let fullReply = ''
        try {
          const reply = await provider.chat(history, model, (chunk) => {
            fullReply += chunk
            process.stdout.write(chunk)
          })

          const lineCount = fullReply.split('\n').length
          if (fullReply.includes('```') || fullReply.includes('**') || fullReply.includes('`')) {
            process.stdout.write(`\x1b[${lineCount}A\x1b[0J`)
            process.stdout.write(chalk.bold.cyan('kami-kun') + chalk.dim(' › '))
            console.log(renderMarkdown(fullReply))
          } else {
            process.stdout.write('\n')
          }

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
