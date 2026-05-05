import chalk from 'chalk'
import { createSpinner, printSuccess, printInfo } from '../ui.js'
import { checkForUpdates } from '../updater.js'

const CURRENT_VERSION = process.env['NION_VERSION'] ?? '1.0.0'

export async function runUpdate(): Promise<void> {
  const spinner = createSpinner('Checking for updates...').start()

  try {
    const latest = await checkForUpdates(CURRENT_VERSION)
    spinner.stop()

    if (!latest) {
      printSuccess(`You are on the latest version (${CURRENT_VERSION})`)
      return
    }

    console.log()
    console.log(chalk.yellow('  Update available!'))
    console.log(`  Current: ${chalk.dim(CURRENT_VERSION)}`)
    console.log(`  Latest:  ${chalk.green(latest)}`)
    console.log()
    printInfo('Run: ' + chalk.cyan('npm update -g nion-cli'))
    console.log()
  } catch (e: unknown) {
    spinner.stop()
    console.log(chalk.dim('  Could not check for updates.'))
  }
}
