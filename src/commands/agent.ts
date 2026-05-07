import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { TOOL_DEFINITIONS, executeTool } from '../tools.js'
import { getFileDiff } from '../diff.js'
import { scanProjectContext } from '../context.js'
import {
  printError, printToolCall, printToolResult,
  printApprovalPrompt, waitForApproval, createSpinner,
  printAssistantStart, printChunk, printAssistantEnd,
  printSessionHeader,
} from '../ui.js'
import type { Message, ToolCall } from '../types.js'

type Mode = 'auto' | 'suggest' | 'manual'

function clearFull(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
}

const SYSTEM = (context: string) => `You are an expert CLI coding agent.
Platform: ${process.platform} | CWD: ${process.cwd()} | Shell: ${process.env['SHELL'] ?? 'bash'}

You have deep expertise in:
- Linux/Unix commands, bash scripting, permissions, processes, signals, pipes
- CLI tools: git, curl, grep, sed, awk, find, tar, ssh, chmod, chown, ps, kill
- Package managers: npm, pip, cargo, apt, brew, pacman, pkg (Termux), pnpm, yarn
- Runtimes: Node.js, Python, Rust, Go, Java, Ruby, PHP
- Build tools: make, cmake, webpack, vite, tsc, gradle
- Frameworks: React, Next.js, Express, FastAPI, Django, Flask, Spring
- Databases: SQLite, PostgreSQL, MySQL, MongoDB, Redis
- Error diagnosis: reading stack traces, logs, exit codes, system errors
- Common fixes: missing deps, permission errors, port conflicts, env issues, syntax errors

Rules:
- Start working immediately. No long explanations before acting.
- When writing code, write small complete working pieces.
- Never write more than 60 lines in a single write_file call — split large files.
- After writing a file, always run it or test it to verify it works.
- When a command fails, read the error carefully and fix the root cause.
- Don't retry the same failing command — understand why it failed first.
- Use run_command to install dependencies, create directories, test code.
- If something isn't working after 2 attempts, try a different approach.
- At the end, give a short summary of what was done.

${context}`

export async function runAgent(opts: {
  provider?: string
  model?: string
  mode?: string
  task?: string
}): Promise<void> {
  clearFull()

  const config = loadConfig()
  const providerId = opts.provider ?? config.default_provider ?? 'groq'
  const mode = (opts.mode ?? config.api_keys['default_agent_mode'] ?? 'suggest') as Mode

  let provider
  try {
    provider = getProvider(providerId)
  } catch (e: unknown) {
    printError((e as Error).message)
    process.exit(1)
  }

  if (!provider.chatWithTools) {
    printError(`${provider.name} does not support tool use. Try: openai, anthropic, groq, deepseek`)
    process.exit(1)
  }

  const model = opts.model ?? config.default_model ?? provider.defaultModel

  printSessionHeader(provider.name, model, mode)

  const spinner = createSpinner('Scanning project...').start()
  const context = scanProjectContext()
  spinner.stop()

  const systemPrompt = SYSTEM(context)

  // One-shot task from CLI argument
  if (opts.task) {
    console.log(
      '\n  ' + chalk.bold.green('task') +
      chalk.dim(' › ') +
      chalk.white(opts.task) + '\n'
    )
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: opts.task },
    ]
    try {
      await agentLoop(messages, provider, model, mode)
    } catch (e: unknown) {
      printError((e as Error).message)
    }
    console.log()
    return
  }

  // Interactive mode
  const W = Math.min(process.stdout.columns || 60, 80)
  console.log(chalk.dim('  Give me a task. /exit to quit.\n'))

  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    })

    const prompt = () => {
      rl.question('\n' + chalk.bold.green('task') + chalk.dim(' › '), async (input) => {
        const line = input.trim()
        if (!line) { prompt(); return }

        if (line === '/exit') {
          console.log(chalk.dim('\n  Done.\n'))
          rl.close()
          return
        }

        if (line === '/help') {
          console.log(chalk.dim('\n  Just type your task in plain English.'))
          console.log(chalk.dim('  Examples:'))
          console.log(chalk.dim('    fix the bug in server.ts'))
          console.log(chalk.dim('    add user authentication to this Express app'))
          console.log(chalk.dim('    why is npm install failing\n'))
          prompt()
          return
        }

        const messages: Message[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: line },
        ]

        console.log()
        try {
          await agentLoop(messages, provider!, model, mode)
        } catch (e: unknown) {
          printError((e as Error).message)
        }

        console.log()
        prompt()
      })
    }

    prompt()
    rl.on('close', () => resolve())
  })
}

async function agentLoop(
  messages: Message[],
  provider: ReturnType<typeof getProvider>,
  model: string,
  mode: Mode,
  depth = 0
): Promise<void> {
  if (depth > 25) {
    console.log(chalk.yellow('\n  Max iterations reached.\n'))
    return
  }

  const spinner = createSpinner('Working...').start()
  let response
  try {
    response = await provider.chatWithTools!(messages, model, TOOL_DEFINITIONS)
  } finally {
    spinner.stop()
  }

  if (response.content) {
    printAssistantStart()
    printChunk(response.content)
    printAssistantEnd()
  }

  if (!response.toolCalls?.length) return

  messages.push({ role: 'assistant', content: response.content })

  for (const call of response.toolCalls) {
    const approved = await handleToolCall(call, mode)
    if (!approved) {
      messages.push({
        role: 'user',
        content: `Tool call ${call.name} was rejected.`,
      })
      continue
    }

    const result = executeTool(call.name, call.arguments)
    printToolResult(result)
    messages.push({
      role: 'user',
      content: `Tool result for ${call.name}:\n${result}`,
    })
  }

  await agentLoop(messages, provider, model, mode, depth + 1)
}

async function handleToolCall(call: ToolCall, mode: Mode): Promise<boolean> {
  let diff: string | null = null
  if (call.name === 'write_file') {
    const path = call.arguments['path'] as string
    const content = call.arguments['content'] as string
    diff = getFileDiff(path, content)
  }
  printToolCall(call.name, call.arguments, diff)
  printApprovalPrompt(mode)
  return waitForApproval(mode)
}
