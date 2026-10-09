#!/usr/bin/env node
/**
 * Start (or reuse) Metro, WARM its first Android bundle, then open the dev client on the
 * running emulator.
 *
 *   pnpm --filter @stellaeum/mobile run dev:android
 *
 * Why: the dev client gives up after ~10 s if Metro is still doing its first, cold bundle
 * ("There was a problem loading the project: java.net.SocketTimeoutException"). That happens
 * after a fresh `expo start`, after `--clear`, or on a cold Metro cache. Tapping Reload on
 * that error screen crashes the app. This script builds the bundle BEFORE the app asks for it
 * (no time limit), and always opens the app the safe way: force-stop, then the dev-client
 * deep link (the same thing pressing `a` in the Expo terminal does). Run it again any time
 * the app shows that error screen; do not tap Reload.
 *
 * Env passes straight through to Metro, e.g. EXPO_PUBLIC_FF_DNES_V2=true pnpm run dev:android
 * (EXPO_PUBLIC_* values are inlined at bundle time, so changing one needs Metro restarted:
 * pass --restart).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, openSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 8081
const APP_ID = 'com.stellaeum.app'
const here = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(here, '..')
const restart = process.argv.includes('--restart')

function adbPath() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  const exe = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  return existsSync(exe) ? exe : 'adb'
}
const ADB = adbPath()
const adb = (...args) => spawnSync(ADB, args, { encoding: 'utf8', timeout: 30_000 })

async function metroUp() {
  try {
    const r = await fetch(`http://localhost:${PORT}/status`, { signal: AbortSignal.timeout(2000) })
    return (await r.text()).includes('packager-status:running')
  } catch {
    return false
  }
}

async function waitFor(fn, ms, what) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Timed out waiting for ${what}`)
}

function killMetro() {
  if (process.platform === 'win32') {
    const out = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-NetTCPConnection -State Listen -LocalPort ${PORT} -ErrorAction SilentlyContinue).OwningProcess`], { encoding: 'utf8' })
    for (const pid of new Set(out.stdout.split(/\s+/).filter(Boolean))) spawnSync('taskkill', ['/PID', pid, '/T', '/F'])
  } else {
    spawnSync('sh', ['-c', `lsof -ti tcp:${PORT} | xargs -r kill -9`])
  }
}

// 1. A device must be there.
const devices = adb('devices').stdout ?? ''
if (!/\tdevice\b/.test(devices)) {
  console.error('[dev-android] No emulator/device online. Start the emulator first, then run this again.')
  process.exit(1)
}

// 2. Metro: reuse it, or start it detached (log in the OS temp folder).
if (restart && (await metroUp())) {
  console.log('[dev-android] --restart: stopping Metro')
  killMetro()
  await new Promise((r) => setTimeout(r, 1500))
}
if (!(await metroUp())) {
  const log = path.join(os.tmpdir(), 'stellaeum-metro.log')
  console.log(`[dev-android] starting Metro (log: ${log})`)
  const fd = openSync(log, 'w')
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'start', '--localhost'], {
    cwd: appDir,
    detached: true,
    stdio: ['ignore', fd, fd],
    shell: process.platform === 'win32',
    env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
  })
  child.unref()
  await waitFor(metroUp, 120_000, 'Metro to start')
} else {
  console.log('[dev-android] reusing the Metro that is already running')
}

// 3. Warm the Android bundle. The dev server hands the dev client a manifest with the bundle
//    URL; requesting that URL here builds and caches it with NO client timeout running.
console.log('[dev-android] warming the Android bundle (first time can take a few minutes)...')
const t0 = Date.now()
const manifestRes = await fetch(`http://localhost:${PORT}/`, {
  headers: { 'expo-platform': 'android', accept: 'application/expo+json,application/json' },
})
const manifest = await manifestRes.json()
const bundleUrl = manifest?.launchAsset?.url
if (!bundleUrl) throw new Error('Metro returned no launchAsset url; is this an Expo dev server?')
const bundle = await fetch(bundleUrl.replace('://127.0.0.1', '://localhost'))
if (!bundle.ok) throw new Error(`Bundle request failed: ${bundle.status}`)
await bundle.arrayBuffer() // drain: the body arrives once the build is finished
console.log(`[dev-android] bundle ready in ${Math.round((Date.now() - t0) / 1000)} s`)

// 4. Open the app the safe way: reverse the port, force-stop, then the dev-client deep link.
adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`)
adb('shell', 'am', 'force-stop', APP_ID)
await new Promise((r) => setTimeout(r, 1000))
const url = `exp+stellaeum://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${PORT}`)}`
const start = adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, APP_ID)
console.log(start.stdout.trim().split('\n').pop())
console.log('[dev-android] done. If the app ever shows the timeout screen again, run this script again; do not tap Reload.')
