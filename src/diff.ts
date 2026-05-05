import { diffLines } from 'diff'
import { existsSync, readFileSync } from 'fs'
import chalk from 'chalk'

export function getFileDiff(path: string, newContent: string): string | null {
  if (!existsSync(path)) return null
  const old = readFileSync(path, 'utf-8')
  if (old === newContent) return null
  const changes = diffLines(old, newContent)
  const lines: string[] = []
  for (const c of changes) {
    const parts = c.value.replace(/\n$/, '').split('\n')
    for (const line of parts) {
      if (c.added) lines.push(chalk.green('+ ') + chalk.green(line))
      else if (c.removed) lines.push(chalk.red('- ') + chalk.red(line))
    }
  }
  return lines.length > 0 ? lines.join('\n') : null
}
