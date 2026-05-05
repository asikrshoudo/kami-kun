#!/usr/bin/env bash
set -e

printf '\n'
printf '  ███╗   ██╗██╗ ██████╗ ███╗   ██╗\n'
printf '  ████╗  ██║██║██╔═══██╗████╗  ██║\n'
printf '  ██╔██╗ ██║██║██║   ██║██╔██╗ ██║\n'
printf '  ██║╚██╗██║██║██║   ██║██║╚██╗██║\n'
printf '  ██║ ╚████║██║╚██████╔╝██║ ╚████║\n'
printf '  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝\n'
printf '\n'
printf '  Nion CLI Installer\n\n'

if ! command -v node &>/dev/null; then
  printf '  Node.js is required (v18+). Install it from https://nodejs.org\n'
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  printf '  Node.js v18+ required. Current: %s\n' "$(node --version)"
  exit 1
fi

printf '  Installing via npm...\n\n'
npm install -g nion-cli

printf '\n  Get started:\n'
printf '    nion config setup    <- add your API keys\n'
printf '    nion chat            <- start chatting\n'
printf '    nion ask "Hello"     <- quick question\n\n'
