import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { loadConfig, saveConfig, configExists } from './config.js'
import { ALL_PROVIDERS } from './providers/index.js'
import { label } from './model-labels.js'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function clearFull(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
}

function openBrowser(url: string): void {
  try {
    const p = process.platform
    if (p === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' })
    else if (p === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true })
    else {
      try { execSync(`xdg-open "${url}"`, { stdio: 'ignore' }) }
      catch {
        try { execSync(`termux-open-url "${url}"`, { stdio: 'ignore' }) }
        catch {}
      }
    }
  } catch {}
}

const PROVIDER_LINKS: Record<string, string> = {
  groq:       'https://console.groq.com',
  google:     'https://aistudio.google.com',
  anthropic:  'https://console.anthropic.com',
  openai:     'https://platform.openai.com',
  deepseek:   'https://platform.deepseek.com',
  mistral:    'https://console.mistral.ai',
  together:   'https://api.together.xyz',
  grok:       'https://console.x.ai',
  perplexity: 'https://www.perplexity.ai/settings/api',
  cohere:     'https://dashboard.cohere.com',
}

export async function runOnboarding(): Promise<void> {
  clearFull()
  await sleep(100)

  console.log(chalk.cyan(`
  ███╗   ██╗██╗ ██████╗ ███╗   ██╗
  ████╗  ██║██║██╔═══██╗████╗  ██║
  ██╔██╗ ██║██║██║   ██║██╔██╗ ██║
  ██║╚██╗██║██║██║   ██║██║╚██╗██║
  ██║ ╚████║██║╚██████╔╝██║ ╚████║
  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝`))
  console.log()

  // Boot animation before clack
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
  const steps = [
    { msg: 'Loading providers', duration: 500 },
    { msg: 'Checking configuration', duration: 400 },
  ]
  for (const step of steps) {
    let i = 0
    const iv = setInterval(() => {
      process.stdout.write(`\r  ${chalk.cyan(frames[i++ % frames.length])} ${chalk.dim(step.msg)}`)
    }, 80)
    await sleep(step.duration)
    clearInterval(iv)
    process.stdout.write(`\r  ${chalk.green('✓')} ${chalk.dim(step.msg)}\n`)
  }
  console.log()
  await sleep(200)

  clack.intro(chalk.bold.cyan('nion') + chalk.dim('  first run setup'))

  // Name
  const name = await clack.text({
    message: 'What should I call you?',
    placeholder: 'your name',
    validate: v => (!v.trim() ? 'Name cannot be empty' : undefined),
  })
  if (clack.isCancel(name)) { clack.cancel('Setup cancelled.'); process.exit(0) }

  // Provider
  const providerId = await clack.select({
    message: 'Choose a provider',
    options: [
      { value: 'groq',       label: 'Groq',        hint: 'free · fastest inference'        },
      { value: 'google',     label: 'Gemini',       hint: 'free tier · capable'             },
      { value: 'deepseek',   label: 'DeepSeek',     hint: 'free tier · strong at coding'   },
      { value: 'anthropic',  label: 'Anthropic',    hint: 'paid · best at reasoning'        },
      { value: 'openai',     label: 'OpenAI',       hint: 'paid · GPT-4o'                  },
      { value: 'mistral',    label: 'Mistral',      hint: 'paid · great for code'           },
      { value: 'together',   label: 'Together AI',  hint: 'free tier · many open models'   },
      { value: 'grok',       label: 'xAI Grok',     hint: 'paid · Grok-2'                  },
      { value: 'perplexity', label: 'Perplexity',   hint: 'paid · web search built-in'     },
      { value: 'cohere',     label: 'Cohere',       hint: 'free tier · Command R+'         },
      { value: 'ollama',     label: 'Ollama',       hint: 'local · no key · works offline' },
    ],
  })
  if (clack.isCancel(providerId)) { clack.cancel('Setup cancelled.'); process.exit(0) }

  const pid = providerId as string
  const provider = ALL_PROVIDERS.find(p => p.id === pid)
  let chosenModel = provider?.defaultModel ?? ''

  // Model selection with friendly names + default pre-selected
  if (provider && provider.models.length > 1) {
    const model = await clack.select({
      message: 'Choose a default model',
      initialValue: provider.defaultModel,
      options: provider.models.map(m => ({
        value: m,
        label: label(m),
        hint: m === provider.defaultModel ? 'recommended' : undefined,
      })),
    })
    if (clack.isCancel(model)) { clack.cancel('Setup cancelled.'); process.exit(0) }
    chosenModel = model as string
  }

  // Agent mode
  const agentMode = await clack.select({
    message: 'Default agent approval mode',
    initialValue: 'suggest',
    options: [
      { value: 'suggest', label: 'Suggest', hint: 'shows action, runs after 2s — recommended' },
      { value: 'manual',  label: 'Manual',  hint: 'press y before every tool call'            },
      { value: 'auto',    label: 'Auto',    hint: 'executes everything immediately'            },
    ],
  })
  if (clack.isCancel(agentMode)) { clack.cancel('Setup cancelled.'); process.exit(0) }

  // API key flow
  let apiKey = ''

  if (pid !== 'ollama') {
    const link = PROVIDER_LINKS[pid] ?? ''

    const hasKey = await clack.confirm({
      message: `Do you already have a ${provider?.name ?? pid} API key?`,
    })
    if (clack.isCancel(hasKey)) { clack.cancel('Setup cancelled.'); process.exit(0) }

    if (!hasKey) {
      clack.log.info(`Opening ${chalk.cyan(link)} in your browser...`)
      openBrowser(link)
      await sleep(800)
    }

    const key = await clack.text({
      message: 'Paste your API key',
      placeholder: 'paste here',
      validate: v => (!v.trim() ? 'API key cannot be empty' : undefined),
    })
    if (clack.isCancel(key)) { clack.cancel('Setup cancelled.'); process.exit(0) }
    apiKey = (key as string).trim()

  } else {
    clack.log.step('Checking Ollama...')
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) clack.log.success('Ollama is running')
      else clack.log.warn('Ollama not responding — run: ollama serve')
    } catch {
      clack.log.warn('Ollama not found — install from ollama.com then run: ollama serve')
    }
  }

  // Save
  const config = loadConfig()
  config.user_name = name as string
  config.default_provider = pid
  config.default_model = chosenModel
  config.api_keys['default_agent_mode'] = agentMode as string
  if (apiKey) config.api_keys[pid] = apiKey
  saveConfig(config)

  clack.log.success('Configuration saved')
  console.log()

  // Start now?
  const startNow = await clack.confirm({
    message: 'Start chatting now?',
    initialValue: true,
  })

  if (clack.isCancel(startNow) || !startNow) {
    clack.outro(
      chalk.bold.green(`All set, ${name as string}!`) +
      chalk.dim('\n\n  ') + chalk.cyan('nion chat') +
      chalk.dim('   — start a conversation') +
      chalk.dim('\n  ') + chalk.cyan('nion agent') +
      chalk.dim('  — let the agent code for you') +
      '\n'
    )
    return
  }

  clearFull()
  const { runChat } = await import('./commands/chat.js')
  await runChat({ provider: pid, model: chosenModel })
}

export function shouldOnboard(): boolean {
  return !configExists()
}
