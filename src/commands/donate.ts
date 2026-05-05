import chalk from 'chalk'

const BTC = '1D9aoxzxTca8JcBkc6BUC85vEftbdbxNPe'

export function runDonate(): void {
  console.log()
  console.log(
    chalk.yellow('  ┌─────────────────────────────────────────────┐')
  )
  console.log(
    chalk.yellow('  │') + chalk.bold('  Support nion                               ') + chalk.yellow('│')
  )
  console.log(
    chalk.yellow('  └─────────────────────────────────────────────┘')
  )
  console.log()
  console.log(
    '  nion is free and open source. If it saves you'
  )
  console.log(
    '  time or helps your work, consider donating.'
  )
  console.log()
  console.log(chalk.bold('  ₿  Bitcoin'))
  console.log()
  console.log('  ' + chalk.cyan(BTC))
  console.log()
  console.log(chalk.dim('  Every contribution keeps this project alive.'))
  console.log(chalk.dim('  Thank you.'))
  console.log()
}
