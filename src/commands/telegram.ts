import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { startBot } from '../telegram.js'
import { printError, printSuccess, printInfo } from '../ui.js'

export async function runTelegram(opts: { provider?: string; model?: string }): Promise<void> {
  const config = loadConfig()
  const providerId = opts.provider ?? config.default_provider ?? 'groq'
  const token = config.api_keys['telegram']

  if (!token) {
    printError('No Telegram bot token configured.')
    console.log()
    console.log('  1. Create a bot via ' + chalk.cyan('@BotFather') + ' on Telegram')
    console.log('  2. Copy the token')
    console.log('  3. Run: ' + chalk.cyan('nion config set-key telegram <token>'))
    console.log()
    console.log('  Optional — restrict to specific users:')
    console.log('  ' + chalk.cyan('nion config set-key telegram_allowed username1,username2'))
    console.log()
    process.exit(1)
  }

  printSuccess(`Provider: ${chalk.cyan(providerId)}`)
  if (opts.model) printInfo(`Model: ${opts.model}`)
  printInfo('Data stays local — nothing is collected or sent to any server.')
  console.log()

  await startBot(providerId, opts.model)
}
