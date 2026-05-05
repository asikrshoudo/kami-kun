import * as readline from 'readline'
import chalk from 'chalk'
import { loadConfig } from '../config.js'
import { getProvider } from '../providers/index.js'
import { TOOL_DEFINITIONS, executeTool } from '../tools.js'
import { getFileDiff } from '../diff.js'
import { scanProjectContext } from '../context.js'
import {
  printLogo, printSessionHeader, printAssistantStart, printChunk,
  printAssistantEnd, printToolCall, printToolResult, printApprovalPrompt,
  waitForApproval, printError, printHelp, createSpinner,
} from '../ui.js'
import type { Message, ToolCall } from '../types.js'

type Mode = 'auto' | 'suggest' | 'manual'

const SYSTEM = (context: string) => `You are an expert coding agent with access to the filesystem and shell.
Use tools to complete tasks precisely. Always reason before calling tools.
When writing files, make targeted changes. When done, give a concise summary.

${context}`

export async function runAgent(opts: {
  provider?: string
  model?: string
  mode?: string
  task?: string
}): Promise<void> {
  const config = loadConfig()
  const providerId = opts.provider ?? config.default_provider ?? 'groq'
  const mode = (opts.mode ?? 'suggest') as Mode

  let provider
  try {
    provider = getProvider(providerId)
  } catch (e: unknown) {
    printError((e as Error).message)
    process.exit(1)
  }

  if (!provider.chatWithTools) {
    printError(`${provider.name} does not support tool use. Try: openai, anthropic, groq`)
    process.exit(1)
  }

  const model = opts.model ?? config.default_model ?? provider.defaultModel

  printLogo()
  printSessionHeader(provider.name, model, mode)

  // Scan project context
  const spinner = createSpinner('Scanning project...').start()
  const context = scanProjectContext()
  spinner.stop()

  const systemPrompt = SYSTEM(context)

  // One-shot mode: task passed as argument
  if (opts.task) {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: opts.task },
    ]
    console.log(chalk.bold.green('task') + chalk.dim(' › ') + opts.task + '\n')
    try {
      await agentLoop(messages, provider, model, mode)
    } catch (e: unknown) {
      printError((e as Error).message)
    }
    return
  }

  // Interactive mode
  console.log(chalk.dim('  Give the agent a task. /help for commands.\n'))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  const prompt = () => {
    rl.question(chalk.bold.green('task') + chalk.dim(' › '), async (input) => {
      const line = input.trim()
      if (!line) { prompt(); return }

      if (line === '/exit') {
        console.log(chalk.dim('\n  Exiting.\n'))
        rl.close()
        return
      }

      if (line === '/help') {
        printHelp([
          { cmd: '/exit', desc: 'Quit' },
          { cmd: '/clear', desc: 'Clear and restart' },
          { cmd: '/mode auto|suggest|manual', desc: 'Change approval mode' },
        ])
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
  rl.on('close', () => process.exit(0))
}

async function agentLoop(
  messages: Message[],
  provider: ReturnType<typeof getProvider>,
  model: string,
  mode: Mode,
  depth = 0
): Promise<void> {
  if (depth > 25) {
    console.log(chalk.yellow('\n  ⚠ Max iterations reached.\n'))
    return
  }

  const spinner = createSpinner('Thinking...').start()
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

  if (!response.toolCalls || response.toolCalls.length === 0) return

  messages.push({ role: 'assistant', content: response.content })

  for (const call of response.toolCalls) {
    const approved = await handleToolCall(call, mode)
    if (!approved) {
      messages.push({
        role: 'user',
        content: `Tool call ${call.name} was rejected by the user.`,
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
  // For write_file, compute and show diff
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
