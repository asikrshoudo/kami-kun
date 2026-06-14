import React, { useState, useEffect, useRef } from 'react'
import { render, Box, Text, Static, useInput, useApp, measureElement } from 'ink'
import Spinner from 'ink-spinner'
import chalk from 'chalk'
import ora, { type Ora } from 'ora'

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
  console.log(chalk.yellow('│') + chalk.dim('  Run: npm update -g kami-kun'))
  console.log(chalk.yellow('└─────────────────────────────────────────────┘\n'))
}

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' })
}

export function printConfigRow(key: string, value: string): void {
  console.log('  ' + chalk.dim(key.padEnd(20)) + chalk.white(value))
}

export function printModelTable(
  providers: Array<{ name: string; models: string[]; defaultModel: string; hasKey: boolean }>
): void {
  for (const p of providers) {
    const status = p.hasKey ? chalk.green('●') : chalk.dim('○')
    console.log(`\n  ${status} ${chalk.bold(p.name)}`)
    for (const m of p.models) {
      const arrow = m === p.defaultModel ? chalk.dim('→ ') : '  '
      const lbl = m === p.defaultModel ? chalk.white(m) : chalk.dim(m)
      console.log(`    ${arrow}${lbl}`)
    }
  }
  console.log()
}

function highlight(code: string, lang: string): string {
  if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
    return code
      .replace(/(^|\s)(#[^\n]*)/g, (_, p, c) => _ + chalk.dim(c))
      .replace(/\b(export|if|then|else|fi|for|do|done|while|function|return|echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|curl|npm|npx|git|node|python|pip)\b/g, chalk.cyan('$&'))
      .replace(/("[^"]*"|'[^']*')/g, chalk.yellow('$&'))
      .replace(/\$\{?[\w]+\}?/g, chalk.green('$&'))
  }
  if (['ts', 'tsx', 'js', 'jsx', 'javascript', 'typescript'].includes(lang)) {
    return code
      .replace(/\b(import|export|from|const|let|var|function|async|await|return|if|else|for|while|class|interface|type|extends|implements|new|this|throw|try|catch|finally|of|in|switch|case|break|default|null|undefined|true|false)\b/g, chalk.magenta('$&'))
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/gs, chalk.yellow('$&'))
      .replace(/(\/\/[^\n]*)/g, chalk.dim('$&'))
      .replace(/\b(\d+)\b/g, chalk.cyan('$&'))
  }
  if (lang === 'json') {
    return code
      .replace(/("[^"]*")(\s*:)/g, chalk.cyan('$1') + '$2')
      .replace(/:\s*("[^"]*")/g, ': ' + chalk.yellow('$1'))
      .replace(/:\s*(\d+)/g, ': ' + chalk.green('$1'))
      .replace(/:\s*(true|false|null)/g, ': ' + chalk.magenta('$1'))
  }
  return code
}

export function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []

  for (const line of lines) {
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      if (!inCode) {
        inCode = true
        codeLang = fence[1] ?? ''
        codeLines = []
      } else {
        inCode = false
        const raw = codeLines.join('\n')
        const highlighted = highlight(raw, codeLang)
        const W = Math.min(process.stdout.columns || 80, 88)
        out.push(chalk.dim('  ┌' + '─'.repeat(W - 4) + '┐'))
        for (const cl of highlighted.split('\n')) {
          const stripped = cl.replace(/\x1b\[[0-9;]*m/g, '')
          const pad = Math.max(0, W - 6 - stripped.length)
          out.push(chalk.dim('  │') + ' ' + cl + ' '.repeat(pad) + ' ' + chalk.dim('│'))
        }
        out.push(chalk.dim('  └' + '─'.repeat(W - 4) + '┘'))
      }
      continue
    }

    if (inCode) { codeLines.push(line); continue }

    let l = line
    l = l.replace(/`([^`]+)`/g, chalk.bgBlack.cyan(' $1 '))
    l = l.replace(/\*\*([^*]+)\*\*/g, chalk.bold('$1'))
    l = l.replace(/\*([^*]+)\*/g, chalk.italic('$1'))
    l = l.replace(/^(#{1,3})\s+(.+)/, (_m, h, t) =>
      h.length === 1 ? '\n' + chalk.bold.cyan(t) + '\n' + chalk.dim('─'.repeat(t.length))
      : h.length === 2 ? '\n' + chalk.bold.white(t)
      : chalk.bold(t)
    )
    l = l.replace(/^(\s*[-•*])\s+/, chalk.dim('  · '))
    l = l.replace(/^(\s*\d+\.)\s+/, chalk.dim('$1') + ' ')
    out.push(l)
  }
  return out.join('\n')
}

let _streamBuffer = ''

export function printAssistantStart(): void {
  _streamBuffer = ''
  process.stdout.write('\n' + chalk.bold.cyan('kami-kun') + chalk.dim(' › '))
}

export function printChunk(text: string): void {
  _streamBuffer += text
  process.stdout.write(text)
}

export function printAssistantEnd(): void {
  process.stdout.write('\n')
  _streamBuffer = ''
}

export function printSessionHeader(provider: string, model: string, mode: string): void {
  const modeStr =
    mode === 'auto' ? chalk.green('⚡ auto')
    : mode === 'manual' ? chalk.yellow('⚑ manual')
    : chalk.blue('◎ suggest')

  const W = Math.min(process.stdout.columns || 80, 88)
  const info = `  ${chalk.bold.cyan('kami-kun')}  ${chalk.dim('·')}  ${chalk.white(provider)}  ${chalk.dim('/')}  ${chalk.dim(model)}  ${chalk.dim('·')}  ${modeStr}`
  const plain = `  kami-kun  ·  ${provider}  /  ${model}  ·  ${mode}`
  const pad = Math.max(0, W - plain.length - 2)

  console.log()
  console.log(chalk.dim('  ╭' + '─'.repeat(W - 4) + '╮'))
  console.log(chalk.dim('  │') + info + ' '.repeat(pad) + chalk.dim('│'))
  console.log(chalk.dim('  ╰' + '─'.repeat(W - 4) + '╯'))
  console.log()
}

const TOOL_ICONS: Record<string, string> = {
  write_file: '✎',
  read_file: '◎',
  run_command: '⚡',
  list_dir: '⊞',
  search_github: '⌕',
  search_stackoverflow: '⌕',
  fetch_url: '↗',
}

export function printToolCall(
  name: string,
  args: Record<string, unknown>,
  diff?: string | null
): void {
  const W = Math.min(process.stdout.columns || 80, 88)
  const icon = TOOL_ICONS[name] ?? '⚙'
  const title = ` ${icon}  ${name} `
  const dashes = Math.max(0, W - title.length - 6)

  console.log()
  console.log(
    chalk.magenta('  ╭─') +
    chalk.bold.magenta(title) +
    chalk.magenta('─'.repeat(dashes) + '╮')
  )

  for (const [k, v] of Object.entries(args)) {
    const val = String(v)
    const isLong = val.includes('\n') || val.length > 60
    if (isLong) {
      console.log(chalk.magenta('  │') + '  ' + chalk.dim(k.padEnd(10)) + chalk.dim('→') + '  ' + chalk.dim('(see below)') + chalk.magenta(' '.repeat(Math.max(0, W - k.length - 18)) + '│'))
    } else {
      const row = chalk.dim(k.padEnd(10)) + chalk.dim('→') + '  ' + chalk.yellow(val.slice(0, 60))
      const rowLen = k.length + 14 + Math.min(val.length, 60)
      console.log(chalk.magenta('  │') + '  ' + row + ' '.repeat(Math.max(0, W - rowLen - 6)) + chalk.magenta('│'))
    }
  }

  if (diff) {
    console.log(chalk.magenta('  │') + chalk.dim(' '.repeat(W - 4)) + chalk.magenta('│'))
    const diffLines = diff.split('\n').slice(0, 24)
    for (const dl of diffLines) {
      const colour = dl.startsWith('+') ? chalk.green : dl.startsWith('-') ? chalk.red : chalk.dim
      const stripped = dl.replace(/\x1b\[[0-9;]*m/g, '')
      const pad = Math.max(0, W - stripped.length - 6)
      console.log(chalk.magenta('  │') + ' ' + colour(dl) + ' '.repeat(pad) + chalk.magenta('│'))
    }
    if (diff.split('\n').length > 24) {
      console.log(chalk.magenta('  │') + '  ' + chalk.dim('... (truncated)') + ' '.repeat(Math.max(0, W - 20)) + chalk.magenta('│'))
    }
  }

  console.log(chalk.magenta('  ╰' + '─'.repeat(W - 4) + '╯'))
}

export function printToolResult(output: string): void {
  const W = Math.min(process.stdout.columns || 80, 88)
  const lines = output.split('\n')
  const preview = lines.slice(0, 10)
  const extra = lines.length > 10 ? lines.length - 10 : 0

  console.log(chalk.dim('  ╭─ output ' + '─'.repeat(Math.max(0, W - 12)) + '╮'))
  for (const pl of preview) {
    const stripped = pl.replace(/\x1b\[[0-9;]*m/g, '')
    const pad = Math.max(0, W - stripped.length - 6)
    console.log(chalk.dim('  │') + '  ' + chalk.dim(pl) + ' '.repeat(pad) + chalk.dim('│'))
  }
  if (extra > 0) {
    console.log(chalk.dim('  │') + '  ' + chalk.dim(`... ${extra} more lines`) + ' '.repeat(Math.max(0, W - extra.toString().length - 18)) + chalk.dim('│'))
  }
  console.log(chalk.dim('  ╰' + '─'.repeat(W - 4) + '╯'))
  console.log()
}

export function printApprovalPrompt(mode: string): void {
  if (mode === 'auto') {
    console.log('  ' + chalk.dim('[auto — executing]'))
    return
  }
  if (mode === 'suggest') {
    process.stdout.write(
      '  ' + chalk.blue('◎') + chalk.dim(' executing in 2s — press ') +
      chalk.yellow('n') + chalk.dim(' to reject: ')
    )
    return
  }
  process.stdout.write(
    '  ' + chalk.yellow('⚑') + chalk.dim(' approve? ') +
    chalk.green('y') + chalk.dim('/') + chalk.red('n') + chalk.dim(' › ')
  )
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

export function printLogo(): void {
  console.log(chalk.cyan(`
  ███╗   ██╗██╗ ██████╗ ███╗   ██╗
  ████╗  ██║██║██╔═══██╗████╗  ██║
  ██╔██╗ ██║██║██║   ██║██╔██╗ ██║
  ██║╚██╗██║██║██║   ██║██║╚██╗██║
  ██║ ╚████║██║╚██████╔╝██║ ╚████║
  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝`))
  console.log(chalk.dim('  the universal AI CLI\n'))
}

export function printUserPrompt(name: string): string {
  return '\n' + chalk.bold.green(name) + chalk.dim(' › ')
}
