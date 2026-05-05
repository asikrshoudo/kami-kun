import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'
import type { Tool } from './types.js'

const BLOCKED = [
  /rm\s+-rf\s+\//,
  /mkfs/, /dd\s+if=/, /:\(\)\s*\{.*\}/,
  /shutdown/, /reboot/, /halt/,
]

function blocked(cmd: string): boolean {
  return BLOCKED.some(p => p.test(cmd))
}

function stripHtml(html: string): string {
  return html
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, m =>
      '\n' + m.replace(/<[^>]*>/g, '') + '\n'
    )
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path to read' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates or overwrites)',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_dir',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Directory path (default: .)' } },
      required: [],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command and return output',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string', description: 'Shell command' } },
      required: ['command'],
    },
  },
  {
    name: 'search_github',
    description: 'Search GitHub public repositories for code examples and projects',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        type: { type: 'string', description: 'Search type: repositories or code (default: repositories)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_stackoverflow',
    description: 'Search Stack Overflow for solutions and code examples',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description: 'Fetch content from a URL (README, docs, raw code)',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL to fetch' } },
      required: ['url'],
    },
  },
]

export function executeTool(name: string, args: Record<string, unknown>): string {
  try {
    switch (name) {

      case 'read_file': {
        const path = args['path'] as string
        return readFileSync(path, 'utf-8')
      }

      case 'write_file': {
        const path = args['path'] as string
        const content = args['content'] as string
        writeFileSync(path, content, 'utf-8')
        return `Written: ${path}`
      }

      case 'list_dir': {
        const path = (args['path'] as string) || '.'
        return readdirSync(path)
          .map(e => {
            try { return statSync(`${path}/${e}`).isDirectory() ? `${e}/` : e }
            catch { return e }
          })
          .join('\n')
      }

      case 'run_command': {
        const command = args['command'] as string
        if (blocked(command)) return 'BLOCKED: Command not allowed.'
        try {
          return execSync(command, {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 2 * 1024 * 1024,
          }).trim() || '(no output)'
        } catch (e: unknown) {
          const err = e as { stdout?: string; stderr?: string; message?: string }
          return ((err.stdout || '') + (err.stderr || '')).trim() || err.message || 'Command failed'
        }
      }

      case 'search_github': {
        const query = encodeURIComponent(args['query'] as string)
        const type = (args['type'] as string) || 'repositories'
        const endpoint = type === 'code'
          ? `https://api.github.com/search/code?q=${query}&per_page=5`
          : `https://api.github.com/search/repositories?q=${query}&sort=stars&per_page=5`

        const proc = execSync(
          `curl -s -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "${endpoint}"`,
          { encoding: 'utf-8', timeout: 10000 }
        )
        const data = JSON.parse(proc)
        if (!data.items?.length) return 'No results found on GitHub.'

        if (type === 'code') {
          return data.items.slice(0, 5).map((i: { name: string; path: string; repository: { full_name: string }; html_url: string }) =>
            `File: ${i.name}\nRepo: ${i.repository.full_name}\nPath: ${i.path}\nURL: ${i.html_url}`
          ).join('\n\n')
        }

        return data.items.slice(0, 5).map((r: { full_name: string; description: string; stargazers_count: number; language: string; html_url: string }) =>
          `Repo: ${r.full_name}\nStars: ${r.stargazers_count}\nLang: ${r.language || 'N/A'}\nDesc: ${r.description || ''}\nURL: ${r.html_url}`
        ).join('\n\n')
      }

      case 'search_stackoverflow': {
        const query = encodeURIComponent(args['query'] as string)
        const url = `https://api.stackexchange.com/2.3/search/advanced?q=${query}&site=stackoverflow&pagesize=3&sort=relevance&answers=1&filter=withbody`
        const proc = execSync(
          `curl -s --compressed "${url}"`,
          { encoding: 'utf-8', timeout: 10000 }
        )
        const data = JSON.parse(proc)
        if (!data.items?.length) return 'No results found on Stack Overflow.'

        return data.items.slice(0, 3).map((q: { title: string; score: number; answer_count: number; link: string; body: string }) => {
          const body = stripHtml(q.body || '').slice(0, 600)
          return `Q: ${q.title}\nScore: ${q.score} | Answers: ${q.answer_count}\nURL: ${q.link}\n\n${body}`
        }).join('\n\n---\n\n')
      }

      case 'fetch_url': {
        const url = args['url'] as string
        const proc = execSync(
          `curl -s -L --max-time 10 "${url}"`,
          { encoding: 'utf-8', timeout: 12000, maxBuffer: 1024 * 1024 }
        )
        const isHtml = proc.trimStart().startsWith('<')
        const content = isHtml ? stripHtml(proc) : proc
        return content.slice(0, 3000) + (content.length > 3000 ? '\n...(truncated)' : '')
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (e: unknown) {
    return `Error: ${(e as Error).message}`
  }
}
