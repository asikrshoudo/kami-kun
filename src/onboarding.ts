import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig, saveConfig, configExists } from './config.js'
import { ALL_PROVIDERS } from './providers/index.js'
import { printSuccess } from './ui.js'

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise(r => rl.question(q, r))
}

function askSelect(
  rl: readline.Interface,
  question: string,
  options: Array<{ label: string; value: string; hint?: string }>
): Promise<string> {
  console.log('\n' + chalk.bold(question))
  options.forEach((o, i) => {
    console.log(
      '  ' + chalk.cyan(`${i + 1}.`) + ' ' + o.label +
      (o.hint ? chalk.dim(` — ${o.hint}`) : '')
    )
  })
  return new Promise(r => {
    rl.question(chalk.dim('\n  Enter number › '), (input) => {
      const idx = parseInt(input.trim()) - 1
      r(options[idx]?.value ?? options[0].value)
    })
  })
}

export async function runOnboarding(): Promise<void> {
  console.clear()
  console.log(chalk.cyan(`
  ███╗   ██╗██╗ ██████╗ ███╗   ██╗
  ████╗  ██║██║██╔═══██╗████╗  ██║
  ██╔██╗ ██║██║██║   ██║██╔██╗ ██║
  ██║╚██╗██║██║██║   ██║██║╚██╗██║
  ██║ ╚████║██║╚██████╔╝██║ ╚████║
  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝`))
  console.log()
  console.log(chalk.bold('  Welcome to nion.'))
  console.log(chalk.dim('  The universal AI CLI — one tool, every model.\n'))
  console.log(chalk.dim('  Let\'s get you set up. This will take 30 seconds.\n'))

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const config = loadConfig()

  // Name
  const name = await ask(rl, chalk.bold('  What should I call you? ') + chalk.dim('(your name) › '))
  config.user_name = name.trim() || 'friend'

  // Use case
  const useCase = await askSelect(rl, '  What will you mainly use nion for?', [
    { label: 'Coding & development', value: 'coding' },
    { label: 'Writing & content', value: 'writing' },
    { label: 'General questions & research', value: 'general' },
    { label: 'Everything', value: 'all' },
  ])

  // Provider
  const providerChoice = await askSelect(rl, '  Which AI provider do you want to start with?', [
    { label: 'Groq', value: 'groq', hint: 'free, very fast, great for coding' },
    { label: 'Google Gemini', value: 'google', hint: 'free tier available' },
    { label: 'Anthropic Claude', value: 'anthropic', hint: 'best for complex tasks' },
    { label: 'OpenAI', value: 'openai', hint: 'GPT-4o' },
    { label: 'Ollama', value: 'ollama', hint: 'local, no API key needed' },
    { label: 'DeepSeek', value: 'deepseek', hint: 'free tier, strong coder' },
  ])

  config.default_provider = providerChoice

  const provider = ALL_PROVIDERS.find(p => p.id === providerChoice)
  if (provider) config.default_model = provider.defaultModel

  // API key (skip for Ollama)
  if (providerChoice !== 'ollama') {
    const keyHints: Record<string, string> = {
      groq: 'console.groq.com',
      google: 'aistudio.google.com',
      anthropic: 'console.anthropic.com',
      openai: 'platform.openai.com',
      deepseek: 'platform.deepseek.com',
    }
    const hint = keyHints[providerChoice] ?? ''
    console.log()
    if (hint) console.log(chalk.dim(`  Get your free API key at: ${hint}`))
    const key = await ask(rl, chalk.bold(`\n  Paste your ${providerChoice} API key › `))
    if (key.trim()) config.api_keys[providerChoice] = key.trim()
  }

  rl.close()
  saveConfig(config)

  console.log()
  printSuccess(`All set, ${config.user_name}!`)
  console.log()

  if (useCase === 'coding' || useCase === 'all') {
    console.log(chalk.dim('  Try: ') + chalk.cyan('nion agent "create a hello world Express API"'))
  } else {
    console.log(chalk.dim('  Try: ') + chalk.cyan('nion chat'))
  }

  console.log(chalk.dim('  Or:  ') + chalk.cyan('nion --help'))
  console.log()
  process.exit(0)
}

export function shouldOnboard(): boolean {
  return !configExists()
}
