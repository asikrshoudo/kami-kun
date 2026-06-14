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
    photo?: Array<{ file_id: string; width: number; height: number }>
    caption?: string
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
    chat_id: chatId, text: t, parse_mode: 'Markdown',
  }) as { result?: { message_id: number } }
  return res.result?.message_id ?? 0
}

async function edit(token: string, chatId: number, msgId: number, text: string): Promise<void> {
  const t = text.length > TG_MAX ? text.slice(0, TG_MAX) + '\n...' : text
  await tgFetch(token, 'editMessageText', {
    chat_id: chatId, message_id: msgId, text: t, parse_mode: 'Markdown',
  })
}

async function getFileUrl(token: string, fileId: string): Promise<string | null> {
  const res = await tgFetch(token, `getFile?file_id=${fileId}`) as {
    result?: { file_path: string }
  }
  if (!res.result?.file_path) return null
  return `https://api.telegram.org/file/bot${token}/${res.result.file_path}`
}

async function downloadImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const data = Buffer.from(buffer).toString('base64')
  const ct = res.headers.get('content-type') ?? 'image/jpeg'
  return { data, mediaType: ct }
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
  model?: string,
  imageBase64?: { data: string; mediaType: string }
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

  let userContent: Message['content']

  // If image provided, use vision format
  if (imageBase64 && providerId === 'anthropic') {
    userContent = JSON.stringify([
      { type: 'image', source: { type: 'base64', media_type: imageBase64.mediaType, data: imageBase64.data } },
      { type: 'text', text: task || 'Analyze this screenshot and help me with what you see.' },
    ])
  } else if (imageBase64 && providerId === 'google') {
    userContent = JSON.stringify([
      { type: 'text', text: task || 'Analyze this screenshot.' },
      { type: 'image_url', image_url: { url: `data:${imageBase64.mediaType};base64,${imageBase64.data}` } },
    ])
  } else {
    userContent = task
  }

  const messages: Message[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userContent },
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
  const parts: string[] = [`✅ *Done*\n`]
  if (result.answer) parts.push(result.answer)
  if (result.filesModified.length)
    parts.push(`\n_Modified:_ ${result.filesModified.map(f => `\`${f}\``).join(', ')}`)
  if (result.commandsRun.length)
    parts.push(`_Ran:_ ${result.commandsRun.map(c => `\`${c}\``).join(', ')}`)
  return parts.join('\n')
}

export async function startBot(providerId: string, model?: string): Promise<void> {
  const config = loadConfig()
  const token = config.api_keys['telegram']
  if (!token) {
    console.error('No Telegram bot token. Run: kami-kun config set-key telegram <token>')
    process.exit(1)
  }

  const allowedStr = config.api_keys['telegram_allowed'] ?? ''
  const allowedUsers = allowedStr ? allowedStr.split(',').map(s => s.trim()) : []

  console.log('🤖 Telegram bot started. Waiting for messages...')
  if (allowedUsers.length) console.log(`   Allowed: ${allowedUsers.join(', ')}`)
  else console.log('   Open to all users — set telegram_allowed to restrict')

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
        if (!msg) continue

        const chatId = msg.chat.id
        const username = msg.from?.username ?? String(msg.from?.id ?? '')
        const text = (msg.text ?? msg.caption ?? '').trim()
        const hasPhoto = !!msg.photo?.length

        if (!text && !hasPhoto) continue

        if (text.startsWith('/')) {
          if (text === '/start') {
            await send(token, chatId, `👋 *kami-kun* — Universal AI coding agent\n\nSend me a task or a screenshot and I will get it done.\n\nYour data stays on your machine.`)
          } else if (text === '/help') {
            await send(token, chatId, `*How to use:*\n\nJust send a task:\n_"Fix the bug in auth.ts"_\n_"Add input validation to all routes"_\n\nOr send a screenshot with a description.\n\n\`/start\` — Welcome\n\`/help\` — This message`)
          }
          continue
        }

        if (allowedUsers.length && !allowedUsers.includes(username)) {
          await send(token, chatId, '❌ Not authorized.')
          continue
        }

        const statusId = await send(token, chatId, `⚙️ _Working..._`)

        try {
          let imageData: { data: string; mediaType: string } | undefined

          // Handle photo input
          if (hasPhoto && msg.photo) {
            const largest = msg.photo[msg.photo.length - 1]
            const fileUrl = await getFileUrl(token, largest.file_id)
            if (fileUrl) {
              imageData = await downloadImageAsBase64(fileUrl)
            }
          }

          const task = text || 'Analyze this screenshot and describe what you see. If there is an error, explain it and suggest a fix.'
          const result = await runAgentSilent(task, providerId, model, imageData)
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
