#!/usr/bin/env node
import { buildCli } from './cli.js'
import { checkForUpdates } from './updater.js'
import { printUpdateAvailable } from './ui.js'

const VERSION = process.env['NION_VERSION'] ?? '1.0.0'

// Background update check (non-blocking)
const updateCheck = checkForUpdates(VERSION)

const program = buildCli()
await program.parseAsync(process.argv)

// Show update notice after command finishes
try {
  const latest = await Promise.race([
    updateCheck,
    new Promise<null>(r => setTimeout(() => r(null), 0)), // don't wait if already done
  ])
  if (latest) printUpdateAvailable(latest)
} catch {}
