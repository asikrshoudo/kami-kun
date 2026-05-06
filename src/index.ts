#!/usr/bin/env node
import { buildCli } from './cli.js'
import { checkForUpdates } from './updater.js'
import { printUpdateAvailable } from './ui.js'
import { shouldOnboard, runOnboarding } from './onboarding.js'

const VERSION = process.env['NION_VERSION'] ?? '1.0.0'

const args = process.argv.slice(2)
const skipOnboarding = args.some(a =>
  ['--help', '-h', '--version', '-V', 'config'].includes(a)
)

if (shouldOnboard() && !skipOnboarding) {
  await runOnboarding()
  process.exit(0) // onboarding handles everything internally
}

const updateCheck = checkForUpdates(VERSION)
const program = buildCli()
await program.parseAsync(process.argv)

try {
  const latest = await Promise.race([
    updateCheck,
    new Promise<null>(r => setTimeout(() => r(null), 0)),
  ])
  if (latest) printUpdateAvailable(latest)
} catch {}
