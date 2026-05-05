import { parse, stringify } from 'smol-toml'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { Config } from './types.js'

const CONFIG_DIR = join(homedir(), '.nion')
const CONFIG_FILE = join(CONFIG_DIR, 'config.toml')

export function configExists(): boolean {
  return existsSync(CONFIG_FILE)
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return { default_provider: '', api_keys: {} }
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = parse(raw) as unknown as Config
    if (!parsed.api_keys) parsed.api_keys = {}
    return parsed
  } catch {
    return { default_provider: '', api_keys: {} }
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, stringify(config as unknown as Record<string, unknown>))
}

export function getConfigPath(): string {
  return CONFIG_FILE
}
