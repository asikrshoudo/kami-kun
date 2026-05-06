import chalk from 'chalk'
import { loadConfig, saveConfig, getConfigPath } from '../config.js'
import { ALL_PROVIDERS } from '../providers/index.js'
import { printSuccess, printInfo, printHeader } from '../ui.js'
import { runOnboarding } from '../onboarding.js'

export async function runConfigSetup(): Promise<void> {
  await runOnboarding()
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
    if (key && id !== 'default_agent_mode') {
      const masked = key.slice(0, 4) + '*'.repeat(8)
      console.log(`    ${chalk.cyan(id.padEnd(16))} ${chalk.dim(masked)}`)
    }
  }
  const missing = ALL_PROVIDERS.filter(p => !config.api_keys[p.id])
  if (missing.length) {
    console.log()
    console.log(chalk.dim(`  Not configured: ${missing.map(p => p.id).join(', ')}`))
  }
  console.log()
}
