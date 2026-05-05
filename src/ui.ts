import chalk from 'chalk'
import ora, { type Ora } from 'ora'

const W = Math.min(process.stdout.columns || 72, 80)

function top(title: string, color: (s: string) => string): string {
  const t = title ? ` ${title} ` : ''
  const dashes = Math.max(0, W - t.length - 5)
  return color('╭─') + chalk.bold(t) + color('─'.repeat(dashes)) + color('╮')
}

function mid(content: string, color: (s: string) => string): string {
  const inner = W - 6
  const lines = content.split('\n')
  return lines.map(line => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '')
    const pad = Math.max(0, inner - stripped.length)
    return color('│') + '  ' + line + ' '.repeat(pad) + '  ' + color('│')
  }).join('\n')
}

function bot(color: (s: string) => string): string {
  return color('╰') + color('─'.repeat(W - 2)) + color('╯')
}

function drawBox(title: string, content: string, color: (s: string) => string): void {
  console.log(top(title, color))
  console.log(mid(content, color))
  console.log(bot(color))
}

export function printLogo(): void {
  console.log(chalk.cyan(`
  ███╗   ██╗██╗ ██████╗ ███╗   ██╗
  ████╗  ██║██║██╔═══██╗████╗  ██║
  ██╔██╗ ██║██║██║   ██║██╔██╗ ██║
  ██║╚██╗██║██║██║   ██║██║╚██╗██║
  ██║ ╚████║██║╚██████╔╝██║ ╚████║
  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝`))
  console.log(chalk.dim('  The Universal AI CLI\n'))
}

export function printSessionHeader(provider: string, model: string, mode: string): void {
  const info = [
    chalk.cyan(provider),
    chalk.dim('/'),
    chalk.white(model),
    chalk.dim('·'),
    modeLabel(mode),
  ].join(' ')
  console.log('\n' + chalk.dim('╭' + '─'.repeat(W - 2) + '╮'))
  console.log(chalk.dim('│') + '  ' + info + ' '.repeat(Math.max(0, W - 6 - stripAnsi(info).length)) + '  ' + chalk.dim('│'))
  console.log(chalk.dim('╰' + '─'.repeat(W - 2) + '╯') + '\n')
}

function modeLabel(mode: string): string {
  if (mode === 'auto') return chalk.green('⚡ auto')
  if (mode === 'manual') return chalk.yellow('👁  manual')
  return chalk.blue('◎ suggest')
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

export function printAssistantStart(): void {
  process.stdout.write('\n' + chalk.bold.cyan('nion') + chalk.dim(' › '))
}

export function printChunk(text: string): void {
  process.stdout.write(text)
}

export function printAssistantEnd(): void {
  process.stdout.write('\n')
}

export function printToolCall(
  name: string,
  args: Record<string, unknown>,
  diff?: string | null
): void {
  const icon = name === 'write_file' ? '✎' : name === 'read_file' ? '◎' : name === 'run_command' ? '⚡' : '⚙'
  const lines: string[] = [
    chalk.bold(`${icon}  ${name}`),
    '',
    ...Object.entries(args).map(([k, v]) =>
      chalk.dim(k.padEnd(12)) + chalk.dim('→') + '  ' + chalk.yellow(String(v).slice(0, 60))
    ),
  ]
  if (diff) {
    lines.push('')
    lines.push(...diff.split('\n').slice(0, 20))
    if (diff.split('\n').length > 20) lines.push(chalk.dim('  ... (truncated)'))
  }
  const content = lines.join('\n')
  console.log()
  drawBox('tool call', content, chalk.magenta)
}

export function printToolResult(output: string): void {
  const lines = output.split('\n')
  const preview = lines.slice(0, 12).join('\n')
  const extra = lines.length > 12 ? chalk.dim(`\n  ... ${lines.length - 12} more lines`) : ''
  drawBox('output', chalk.dim(preview) + extra, chalk.dim)
}

export function printApprovalPrompt(mode: string): void {
  if (mode === 'auto') {
    console.log('  ' + chalk.dim('[auto — executing]'))
    return
  }
  if (mode === 'suggest') {
    process.stdout.write('  ' + chalk.blue('[suggest]') + chalk.dim(' executing in 2s — press ') + chalk.yellow('n') + chalk.dim(' to reject: '))
    return
  }
  process.stdout.write('  ' + chalk.yellow('[manual]') + chalk.dim(' approve? ') + chalk.cyan('y') + chalk.dim('/') + chalk.red('n') + chalk.dim(' › '))
}

export async function waitForApproval(mode: string): Promise<boolean> {
  if (mode === 'auto') return true

  return new Promise(resolve => {
    if (mode === 'suggest') {
      let resolved = false
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true
          process.stdin.setRawMode(false)
          process.stdin.pause()
          console.log()
          resolve(true)
        }
      }, 2000)

      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.once('data', (key: string) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          process.stdin.setRawMode(false)
          process.stdin.pause()
          console.log()
          resolve(key.toLowerCase() !== 'n')
        }
      })
      return
    }

    // manual
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', (key: string) => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      console.log()
      resolve(key.toLowerCase() === 'y' || key === '\r' || key === '\n')
    })
  })
}

export function printError(msg: string): void {
  console.error('\n' + chalk.red('✗') + '  ' + chalk.red(msg))
}

export function printSuccess(msg: string): void {
  console.log(chalk.green('✓') + '  ' + msg)
}

export function printInfo(msg: string): void {
  console.log(chalk.dim('·') + '  ' + msg)
}

export function printWarning(msg: string): void {
  console.log(chalk.yellow('⚠') + '  ' + msg)
}

export function printHeader(text: string): void {
  console.log('\n' + chalk.bold.cyan(text))
  console.log(chalk.dim('─'.repeat(text.length)) + '\n')
}

export function printHelp(cmds: Array<{ cmd: string; desc: string }>): void {
  console.log('\n' + chalk.bold('Commands:'))
  for (const { cmd, desc } of cmds) {
    console.log('  ' + chalk.cyan(cmd.padEnd(22)) + chalk.dim(desc))
  }
  console.log()
}

export function printUpdateAvailable(version: string): void {
  console.log('\n' + chalk.yellow('┌─ Update available ──────────────────────────┐'))
  console.log(chalk.yellow('│') + '  New version: ' + chalk.bold.green(version))
  console.log(chalk.yellow('│') + chalk.dim('  Run: npm update -g nion-cli'))
  console.log(chalk.yellow('└─────────────────────────────────────────────┘\n'))
}

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' })
}

export function printModelTable(providers: Array<{ name: string; models: string[]; defaultModel: string; hasKey: boolean }>): void {
  for (const p of providers) {
    const status = p.hasKey ? chalk.green('●') : chalk.dim('○')
    console.log(`\n  ${status} ${chalk.bold(p.name)}`)
    for (const m of p.models) {
      const arrow = m === p.defaultModel ? chalk.dim('→ ') : '  '
      const label = m === p.defaultModel ? chalk.white(m) : chalk.dim(m)
      console.log(`    ${arrow}${label}`)
    }
  }
  console.log()
}

export function printConfigRow(key: string, value: string): void {
  console.log('  ' + chalk.dim(key.padEnd(20)) + chalk.white(value))
}

export function printUserPrompt(name: string): string {
  return '\n' + chalk.bold.green(name) + chalk.dim(' › ')
}
