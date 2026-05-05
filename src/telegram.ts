import { loadConfig } from './config.js'
import { getProvider } from './providers/index.js'
import { TOOL_DEFINITIONS, executeTool } from './tools.js'
import { scanProjectContext } from './context.js'
import { getFileDiff } from './diff.js'
import type { Message, ToolCall } from './types.js'

const TG_MAX = 4000

interface Update {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string }
    chat: { id: number }
    text?: string
  }
}

async function tgFetch(token: string, method: string, body?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function send(token: string, chatId: number, text: string): Promise<number> {
  const t = text.length > TG_MAX ? text.slice(0, TG_MAX) + '\n...' : text
  const res = await tgFetch(token, 'sendMessage', {
    chat_id: chatId,
    text: t,
    parse_mode: 'Markdown',
  }) as { result?: { message_id: number } }
  return res.result?.message_id ?? 0
}

async function edit(token: string, chatId: number, msgId: number, text: string): Promise<void> {
  const t = text.length > TG_MAX ? text.slice(0, TG_MAX) + '\n...' : text
  await tgFetch(token, 'editMessageText', {
    chat_id: chatId,
    message_id: msgId,
    text: t,
    parse_mode: 'Markdown',
  })
}

interface AgentResult {
  answer: string
  filesModified: string[]
  commandsRun: string[]
  error?: string
}

async function runAgentSilent(
  task: string,
  providerId: string,
  model?: string
): Promise<AgentResult> {
  const config = loadConfig()
  const provider = getProvider(providerId)
  const resolvedModel = model ?? config.default_model ?? provider.defaultModel

  if (!provider.chatWithTools) {
    return { answer: '', filesModified: [], commandsRun: [], error: `${provider.name} does not support tool use.` }
  }

  const context = scanProjectContext()
  const SYSTEM = `You are an expert coding agent. Complete the task efficiently.
Use tools as needed. Give a concise final summary of what you did.
${context}`

  const messages: Message[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: task },
  ]

  const filesModified: string[] = []
  const commandsRun: string[] = []
  let finalAnswer = ''

  async function loop(depth = 0): Promise<void> {
    if (depth > 20) return
    const response = await provider.chatWithTools!(messages, resolvedModel, TOOL_DEFINITIONS)

    if (response.content) finalAnswer = response.content
    if (!response.toolCalls?.length) return

    messages.push({ role: 'assistant', content: response.content })

    for (const call of response.toolCalls) {
      if (call.name === 'write_file') filesModified.push(call.arguments['path'] as string)
      if (call.name === 'run_command') commandsRun.push(call.arguments['command'] as string)

      const result = executeTool(call.name, call.arguments)
      messages.push({ role: 'user', content: `Tool result for ${call.name}:\n${result}` })
    }

    await loop(depth + 1)
  }

  await loop()
  return { answer: finalAnswer, filesModified, commandsRun }
}

function formatResult(result: AgentResult): string {
  if (result.error) return `❌ *Error*\n\n${result.error}`

  const parts: string[] = []
  parts.push(`✅ *Done*\n`)
  if (result.answer) parts.push(result.answer)

  if (result.filesModified.length) {
    parts.push(`\n_Modified:_ ${result.filesModified.map(f => `\`${f}\``).join(', ')}`)
  }
  if (result.commandsRun.length) {
    parts.push(`_Ran:_ ${result.commandsRun.map(c => `\`${c}\``).join(', ')}`)
  }

  return parts.join('\n')
}

export async function startBot(providerId: string, model?: string): Promise<void> {
  const config = loadConfig()
  const token = config.api_keys['telegram']
  if (!token) {
    console.error('No Telegram bot token. Run: nion config set-key telegram <token>')
    process.exit(1)
  }

  const allowedStr = config.api_keys['telegram_allowed'] ?? ''
  const allowedUsers = allowedStr ? allowedStr.split(',').map(s => s.trim()) : []

  console.log('🤖 Telegram bot started. Waiting for messages...')
  console.log(allowedUsers.length ? `   Allowed users: ${allowedUsers.join(', ')}` : '   Open to all users')

  let offset = 0

  while (true) {
    try {
      const res = await tgFetch(token, `getUpdates?offset=${offset}&timeout=25&limit=10`) as {
        ok: boolean; result: Update[]
      }

      if (!res.ok || !res.result?.length) continue

      for (const update of res.result) {
        offset = update.update_id + 1

        const msg = update.message
        if (!msg?.text) continue

        const chatId = msg.chat.id
        const username = msg.from?.username ?? String(msg.from?.id ?? '')
        const text = msg.text.trim()

        if (text.startsWith('/')) {
          if (text === '/start') {
            await send(token, chatId, '👋 *Nion CLI*\n\nSend me a coding task and I will get it done.\n\nYour data stays on your machine — I collect nothing.')
          } else if (text === '/help') {
            await send(token, chatId, '*Commands:*\n\n`/start` — Welcome\n`/help` — This message\n\nOr just send a task:\n_"Fix the bug in auth.ts"_\n_"Create a REST API with Express"_')
          }
          continue
        }

        if (allowedUsers.length && !allowedUsers.includes(username)) {
          await send(token, chatId, '❌ Not authorized.')
          continue
        }

        const statusId = await send(token, chatId, `⚙️ _Working..._`)

        try {
          const result = await runAgentSilent(text, providerId, model)
          await edit(token, chatId, statusId, formatResult(result))
        } catch (e: unknown) {
          await edit(token, chatId, statusId, `❌ *Error*\n\n${(e as Error).message}`)
        }
      }
    } catch {
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}
