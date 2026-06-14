import chalk from 'chalk'

const BTC = '1D9aoxzxTca8JcBkc6BUC85vEftbdbxNPe'
const DISCORD = 'https://www.thekami.tech/discord/'

export function runDonate(): void {
  const W = Math.min(process.stdout.columns || 80, 88)
  console.log()
  console.log(chalk.yellow('  ╭─ Support kami-kun ' + '─'.repeat(Math.max(0, W - 22)) + '╮'))
  console.log(chalk.yellow('  │') + chalk.dim(' '.repeat(W - 4)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  kami-kun is free and open source.' + ' '.repeat(Math.max(0, W - 38)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  If it saves you time, consider donating.' + ' '.repeat(Math.max(0, W - 44)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + chalk.dim(' '.repeat(W - 4)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  ' + chalk.bold('₿  Bitcoin') + ' '.repeat(Math.max(0, W - 14)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  ' + chalk.cyan(BTC) + ' '.repeat(Math.max(0, W - BTC.length - 6)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + chalk.dim(' '.repeat(W - 4)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  ' + chalk.bold('💬  Discord') + ' '.repeat(Math.max(0, W - 14)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + '  ' + chalk.cyan(DISCORD) + ' '.repeat(Math.max(0, W - DISCORD.length - 6)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + chalk.dim(' '.repeat(W - 4)) + chalk.yellow('│'))
  console.log(chalk.yellow('  │') + chalk.dim('  Thank you for your support.') + ' '.repeat(Math.max(0, W - 31)) + chalk.yellow('│'))
  console.log(chalk.yellow('  ╰' + '─'.repeat(W - 4) + '╯'))
  console.log()
}
