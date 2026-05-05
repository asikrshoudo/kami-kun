import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig, saveConfig, getConfigPath } from '../config.js'
import { ALL_PROVIDERS } from '../providers/index.js'
import { printSuccess, printError, printHeader, printInfo } from '../ui.js'

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

export async function runConfigSetup(): Promise<void> {
  const config = loadConfig()
  printHeader('nion config setup')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })

  console.log(chalk.dim('  Select providers to configure (press Enter to skip):\n'))

  for (const provider of ALL_PROVIDERS) {
    const existing = config.api_keys[provider.id]
    const hint = existing ? chalk.dim(` [current: ${'*'.repeat(8)}]`) : ''
    const key = await ask(rl, `  ${chalk.cyan(provider.name)}${hint}: `)
    if (key.trim()) {
      config.api_keys[provider.id] = key.trim()
      config.default_provider = provider.id
      config.default_model = provider.defaultModel
    }
  }

  const nameInput = await ask(rl, `\n  Your name ${chalk.dim(`[current: ${config.user_name ?? 'not set'}]`)}: `)
  if (nameInput.trim()) config.user_name = nameInput.trim()

  rl.close()
  saveConfig(config)
  printSuccess(`Config saved to ${getConfigPath()}`)
  printInfo(`Default provider: ${config.default_provider}`)
  console.log(chalk.dim('\n  Run "nion chat" to start chatting.\n'))
}

export async function runConfigSetKey(provider: string, key: string): Promise<void> {
  const config = loadConfig()
  config.api_keys[provider] = key
  if (!config.default_provider) {
    config.default_provider = provider
    const p = ALL_PROVIDERS.find(p => p.id === provider)
    if (p) config.default_model = p.defaultModel
  }
  saveConfig(config)
  printSuccess(`API key set for ${provider}`)
}

export async function runConfigShow(): Promise<void> {
  const config = loadConfig()
  printHeader('nion config')
  console.log(`  ${chalk.dim('file:')}             ${getConfigPath()}`)
  console.log(`  ${chalk.dim('default_provider:')} ${chalk.white(config.default_provider || chalk.red('not set'))}`)
  console.log(`  ${chalk.dim('default_model:')}    ${chalk.white(config.default_model || chalk.dim('none'))}`)
  console.log(`  ${chalk.dim('user_name:')}        ${chalk.white(config.user_name || chalk.dim('none'))}`)
  console.log()
  console.log(`  ${chalk.dim('api keys:')}`)
  for (const [id, key] of Object.entries(config.api_keys)) {
    if (key) {
      const masked = key.slice(0, 4) + '*'.repeat(8)
      console.log(`    ${chalk.cyan(id.padEnd(14))} ${chalk.dim(masked)}`)
    }
  }
  const missing = ALL_PROVIDERS.filter(p => !config.api_keys[p.id])
  if (missing.length > 0) {
    console.log()
    console.log(chalk.dim(`  Not configured: ${missing.map(p => p.id).join(', ')}`))
  }
  console.log()
}
