import { existsSync, readFileSync, readdirSync } from 'fs'
import { execSync } from 'child_process'

const KEY_FILES = [
  'package.json', 'README.md', 'Cargo.toml',
  'pyproject.toml', 'requirements.txt', 'go.mod',
  'Makefile', 'docker-compose.yml',
]

export function scanProjectContext(): string {
  const parts: string[] = ['# Project Context\n']

  // NION.md — project memory (highest priority)
  if (existsSync('NION.md')) {
    const memory = readFileSync('NION.md', 'utf-8')
    parts.push(`## Project Memory (NION.md)\n${memory}\n`)
    parts.push('---\n')
  }

  // Global memory
  const globalMemory = `${process.env['HOME'] ?? '~'}/.nion/memory.md`
  if (existsSync(globalMemory)) {
    const mem = readFileSync(globalMemory, 'utf-8')
    if (mem.trim()) parts.push(`## Global Memory\n${mem}\n`)
  }

  try {
    const entries = readdirSync('.').filter(f => f !== 'node_modules' && f !== '.git')
    parts.push(`## Files in current directory\n${entries.join('  ')}\n`)
  } catch {}

  for (const file of KEY_FILES) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8')
      const trimmed = content.length > 1500 ? content.slice(0, 1500) + '\n...' : content
      parts.push(`## ${file}\n\`\`\`\n${trimmed}\n\`\`\`\n`)
    }
  }

  try {
    const status = execSync('git status --short 2>/dev/null', { encoding: 'utf-8', timeout: 2000 }).trim()
    if (status) parts.push(`## Git status\n${status}\n`)
    const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf-8', timeout: 2000 }).trim()
    if (branch) parts.push(`## Branch: ${branch}\n`)
  } catch {}

  return parts.join('\n')
}
