# nion

A terminal AI coding agent that works with any model — cloud or local. Built for developers who don't want to be locked into one provider or one subscription.

Most AI CLI tools give you one provider and call it a day. Nion gives you ten, plus full offline support through Ollama, a Telegram bot for remote control, and an agent that can actually read your codebase, search GitHub and Stack Overflow, run commands, and write code — without asking you to babysit every step.

---

## Install

```bash
npm install -g nion-cli
```

Requires Node.js 18 or later. Works on Linux, macOS, Windows, and Termux on Android.

One-liner alternative:

```bash
curl -sSL https://raw.githubusercontent.com/asikrshoudo/nion-cli/main/install.sh | bash
```

---

## Quick start

```bash
# Set up your API keys
nion config setup

# Start a chat session
nion chat

# Ask a quick question without starting a session
nion ask "explain async/await in JavaScript"

# Let the agent write and fix code for you
nion agent "create a REST API with Express, add JWT auth and input validation"

# Use a specific provider or model
nion chat -p groq -m llama-3.3-70b-versatile
nion chat -p anthropic -m claude-3-5-sonnet-20241022
nion chat -p ollama -m gemma3
```

---

## Providers

| Provider | ID | Free tier |
|---|---|---|
| OpenAI | `openai` | No |
| Anthropic | `anthropic` | No |
| Google Gemini | `google` | Yes |
| Groq | `groq` | Yes |
| xAI Grok | `grok` | No |
| DeepSeek | `deepseek` | Yes |
| Mistral | `mistral` | No |
| Perplexity | `perplexity` | No |
| Together AI | `together` | Yes |
| Cohere | `cohere` | Yes |
| Ollama (local) | `ollama` | Always free |

Groq is a good default — it's fast, free, and the llama models are capable. Google Gemini Flash also has a generous free quota.

For a full list of models under each provider:

```bash
nion models
```

---

## Commands

```
nion chat               Start an interactive chat session
nion agent [task]       Run the coding agent on a task
nion ask <question>     One-shot question, no history kept
nion models             List all providers and available models
nion config setup       Interactive setup for API keys
nion config set-key     Add or update a single API key
nion config show        Show current configuration
nion telegram           Start the Telegram bot
nion update             Check for a newer version
nion donate             Support the project
```

---

## Agent mode

This is where nion actually earns its keep. The agent can:

- Read and write files in your project
- Run shell commands (npm, git, pytest, make — anything)
- Search GitHub for code examples and relevant repos
- Search Stack Overflow for solutions
- Fetch documentation from any URL
- Show diffs before overwriting files
- Loop until the task is complete

```bash
# Give it a task directly
nion agent "add error handling to all async functions in src/"

# Or start an interactive session and give tasks one by one
nion agent
```

### Approval modes

By default, the agent shows each tool call and executes it after 2 seconds — giving you time to press `n` to reject it. You can change this:

```bash
nion agent "task" --mode auto      # executes immediately, no prompts
nion agent "task" --mode suggest   # shows each action, auto-runs after 2s (default)
nion agent "task" --mode manual    # must press y before each tool call
```

Use `auto` when you trust the task and want speed. Use `manual` when editing critical files or running unfamiliar commands.

### Available tools

| Tool | What it does |
|---|---|
| `read_file` | Reads a file |
| `write_file` | Creates or overwrites a file (shows diff first) |
| `list_dir` | Lists directory contents |
| `run_command` | Runs a shell command |
| `search_github` | Searches GitHub public repos and code |
| `search_stackoverflow` | Searches Stack Overflow questions and answers |
| `fetch_url` | Fetches content from a URL |

---

## Local AI with Ollama

No API key. No internet required. Runs entirely on your machine.

Install Ollama from [ollama.com](https://ollama.com), then:

```bash
# Pull a model
ollama pull qwen2.5-coder     # best for coding tasks
ollama pull llama3.2          # general purpose
ollama pull gemma3            # lightweight, fast
ollama pull deepseek-coder-v2 # strong at code

# Use it with nion
nion chat -p ollama -m qwen2.5-coder
nion agent -p ollama -m llama3.1
```

For agent mode specifically, use models that support function calling: `llama3.1`, `llama3.2`, `qwen2.5-coder`, `mistral`, `deepseek-coder-v2`. Models like `gemma3` work for chat but not for tool use.

---

## Telegram bot

Run nion on a server or your home machine and control it from your phone.

**Setup:**

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Create a new bot with `/newbot` and copy the token
3. Add the token to nion:

```bash
nion config set-key telegram YOUR_BOT_TOKEN
```

4. Optionally restrict access to specific Telegram usernames:

```bash
nion config set-key telegram_allowed yourusername,otherusername
```

If you skip this, anyone who finds your bot can send it tasks — so setting allowed users is recommended.

5. Start the bot:

```bash
nion telegram
```

6. Message your bot any coding task. It will run the agent and reply with a clean summary when done.

**Running 24/7 on a VPS:**

```bash
npm install -g pm2
pm2 start "nion telegram" --name nion-bot
pm2 save
pm2 startup
```

The bot does not spam intermediate messages. It sends one reply when the task is finished.

---

## Configuration

Config lives at `~/.nion/config.toml`. It never leaves your machine.

```bash
nion config setup        # guided setup for all providers
nion config show         # see what's currently configured
```

To set defaults manually, edit `~/.nion/config.toml`:

```toml
default_provider = "groq"
default_model = "llama-3.3-70b-versatile"
user_name = "your name"

[api_keys]
groq = "your-key-here"
anthropic = "your-key-here"
telegram = "your-bot-token"
telegram_allowed = "username1,username2"
```

---

## Privacy

Nion collects nothing. There is no telemetry, no analytics, no account, no server involved in running it.

Your messages go directly from your machine to the AI provider you configured and nowhere else. The config file, conversation history, and any project files the agent reads or writes stay entirely on your own system.

The source code is open. You can verify this yourself.

---

## Donate

Nion is free and will stay free. If it's useful to you, consider buying me a coffee.

**Bitcoin:** `1D9aoxzxTca8JcBkc6BUC85vEftbdbxNPe`

```bash
nion donate
```

---

## License

AGPL-3.0

Free to use, modify, and distribute. If you build something on top of nion, keep it open source.

---

Made by [@asikrshoudo](https://github.com/asikrshoudo)
