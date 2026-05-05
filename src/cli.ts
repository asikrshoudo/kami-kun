import { Command } from 'commander'
import { printLogo } from './ui.js'
import { runChat } from './commands/chat.js'
import { runAgent } from './commands/agent.js'
import { runAsk } from './commands/ask.js'
import { runModels } from './commands/models.js'
import { runUpdate } from './commands/update.js'
import { runTelegram } from './commands/telegram.js'
import { runDonate } from './commands/donate.js'
import { runConfigSetup, runConfigSetKey, runConfigShow } from './commands/config.js'

const VERSION = process.env['NION_VERSION'] ?? '1.0.0'

export function buildCli(): Command {
  const program = new Command()
  program
    .name('nion')
    .description('The Universal AI CLI — One tool. Every model. Every platform.')
    .version(VERSION)

  program
    .command('chat')
    .description('Interactive chat session')
    .option('-p, --provider <id>', 'Provider (groq, anthropic, ollama...)')
    .option('-m, --model <name>', 'Model name')
    .action(async (opts) => { await runChat(opts) })

  program
    .command('agent [task]')
    .description('Agentic coding — AI reads, writes, searches, runs commands')
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

  program.action(() => { printLogo(); program.help() })
  return program
}
