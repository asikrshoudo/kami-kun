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
    .name('kami-kun')
    .description('AI-powered CLI worker — give it a task, it gets it done')
    .version(VERSION)
    .argument('[task...]', 'Task to execute immediately')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .option('--mode <mode>', 'auto | suggest | manual')
    .action(async (taskParts: string[], opts) => {
      // Direct task execution — no mode selector, just work
      if (taskParts && taskParts.length > 0) {
        const task = taskParts.join(' ')
        await runAgent({ ...opts, task })
        return
      }

      // No task — show minimal selector
      const cfg = loadConfig()
      const providerName = cfg.default_provider ?? 'groq'
      const modelName = label(cfg.default_model ?? '')

      console.log()
      console.log(
        '  ' + chalk.bold.cyan('kami-kun') +
        chalk.dim(`  ·  ${providerName}  ·  ${modelName}`)
      )
      console.log()

      const mode = await clack.select({
        message: 'What do you want to do?',
        options: [
          { value: 'agent', label: 'Agent', hint: 'give a task — AI codes, fixes, builds'  },
          { value: 'chat',  label: 'Chat',  hint: 'ask questions, get explanations'         },
        ],
      })

      if (clack.isCancel(mode)) { process.exit(0) }
      if (mode === 'chat') await runChat(opts)
      else await runAgent(opts)
    })

  program
    .command('chat')
    .description('Interactive chat session')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .action(async (opts) => { await runChat(opts) })

  program
    .command('agent [task]')
    .description('Agentic worker — creates files, runs commands, fixes bugs')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .option('--mode <mode>', 'auto | suggest | manual')
    .action(async (task, opts) => { await runAgent({ ...opts, task }) })

  program
    .command('ask <prompt>')
    .description('One-shot question')
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
    .description('Start Telegram bot')
    .option('-p, --provider <id>', 'Provider')
    .option('-m, --model <name>', 'Model')
    .action(async (opts) => { await runTelegram(opts) })

  program
    .command('donate')
    .description('Support kami-kun development')
    .action(() => { runDonate() })

  const config = program.command('config').description('Manage API keys and settings')
  config.command('setup').action(async () => { await runConfigSetup() })
  config.command('set-key <provider> <key>').action(async (p, k) => { await runConfigSetKey(p, k) })
  config.command('show').action(async () => { await runConfigShow() })

  return program
}
