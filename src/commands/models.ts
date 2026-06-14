import chalk from 'chalk'
import { ALL_PROVIDERS } from '../providers/index.js'
import { loadConfig } from '../config.js'
import { printHeader } from '../ui.js'

export function runModels(): void {
  const config = loadConfig()
  printHeader('Available Models')

  for (const provider of ALL_PROVIDERS) {
    const hasKey = !!config.api_keys[provider.id]
    const status = hasKey ? chalk.green('●') : chalk.dim('○')
    console.log(`\n  ${status} ${chalk.bold(provider.name)} ${chalk.dim(`(${provider.id})`)}`)
    for (const model of provider.models) {
      const isDefault = model === provider.defaultModel
      console.log(
        '    ' +
        (isDefault ? chalk.dim('→ ') : '  ') +
        (isDefault ? chalk.white(model) : chalk.dim(model))
      )
    }
  }

  console.log()
  console.log(chalk.dim('  ● = key configured   ○ = no key   → = default model'))
  console.log(chalk.dim('  Add keys: kami-kun config set-key <provider> <key>\n'))
}
