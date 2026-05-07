import { Command } from 'commander'
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { createRequire } from 'module'
import { loadConfig } from './config.js'
import { label } from './model-labels.js'
import { runChat } from './commands/chat.js'
import { runAgent } from './commands/agent.js'
import { runAsk } from './commands/ask.js'
import { runModels } from './commands/models.js'
import { runUpdate } from './commands/update.js'
import { runTelegram } from './commands/telegram.js'
import { runDonate } from './commands/donate.js'
import { runConfigSetup, runConfigSetKey, runConfigShow } from './commands/config.js'

const require = createRequire(import.meta.url)
const { version: VERSION } = require('../package.json') as { version: string }

export function buildCli(): Command {
  const program = new Command()
  program
    .name('nion')
    .description('The Universal AI CLI — One tool. Every model. Every platform.')
    .version(VERSION)

  program
    .command('chat')
    .description('Interactive chat session')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .action(async (opts) => { await runChat(opts) })

  program
    .command('agent [task]')
    .description('Agentic coding — creates files, runs commands, searches web')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .option('--mode <mode>', 'auto | suggest | manual  (default: suggest)')
    .action(async (task, opts) => { await runAgent({ ...opts, task }) })

  program
    .command('ask <prompt>')
    .description('One-shot question, no session')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .action(async (prompt, opts) => { await runAsk(prompt, opts) })

  program
    .command('models')
    .description('List all providers and models')
    .action(() => { runModels() })

  program
    .command('update')
    .description('Check for updates')
    .action(async () => { await runUpdate() })

  program
    .command('telegram')
    .description('Start Telegram bot for remote control')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .action(async (opts) => { await runTelegram(opts) })

  program
    .command('donate')
    .description('Support nion development')
    .action(() => { runDonate() })

  const config = program.command('config').description('Manage API keys and settings')
  config.command('setup').description('Interactive setup wizard').action(async () => { await runConfigSetup() })
  config.command('set-key <provider> <key>').description('Set an API key').action(async (p, k) => { await runConfigSetKey(p, k) })
  config.command('show').description('Show current config').action(async () => { await runConfigShow() })

  program.action(async () => {
    const cfg = loadConfig()
    const providerName = cfg.default_provider ?? 'groq'
    const modelName = label(cfg.default_model ?? '')

    console.log()
    console.log(
      '  ' + chalk.bold.cyan('nion') +
      chalk.dim(`  ·  ${providerName}  ·  ${modelName}`)
    )
    console.log()

    const mode = await clack.select({
      message: 'What do you want to do?',
      options: [
        { value: 'agent', label: 'Agent', hint: 'AI creates files, runs commands, searches web' },
        { value: 'chat',  label: 'Chat',  hint: 'conversation, questions, explanations'         },
        { value: 'ask',   label: 'Ask',   hint: 'quick one-shot question'                       },
      ],
    })

    if (clack.isCancel(mode)) { process.exit(0) }

    if (mode === 'chat') await runChat({})
    else if (mode === 'agent') await runAgent({})
    else if (mode === 'ask') {
      const prompt = await clack.text({ message: 'Your question' })
      if (!clack.isCancel(prompt)) await runAsk(prompt as string, {})
    }
  })

  return program
}
