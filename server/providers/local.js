// Local provider — provisions each sandbox service as a real Node child process
// forked on the host machine, bound to an incrementing local port.
// This is the default provider and requires no external tooling.

import { fork } from 'child_process'
import { fileURLToPath } from 'url'
import http from 'http'
import pidusage from 'pidusage'

const RUNTIME = fileURLToPath(new URL('../service-runtime.js', import.meta.url))

let nextPort = 8100
export const allocPort = () => nextPort++

export function spawnService(env, svc) {
  const port = allocPort()
  const child = fork(RUNTIME, [], {
    env: {
      ...process.env,
      SERVICE_PORT: String(port),
      SERVICE_NAME: svc.name,
      ENV_NAME: env.name,
      ENV_ID: env.id,
      PRODUCT: env.product,
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  })
  svc.port = port
  svc.pid = child.pid
  svc.child = child
  svc.status = 'pending'
  svc.cpuPct = 0
  svc.memMB = 0

  child.on('message', (m) => {
    if (m?.type === 'ready') svc.status = 'healthy'
  })
  child.on('exit', () => {
    if (svc.status !== 'stopped') svc.status = 'unhealthy'
    svc.child = null
    svc.pid = null
  })
}

export function killService(svc) {
  svc.status = 'stopped'
  if (svc.child) {
    try { svc.child.kill('SIGTERM') } catch { /* ignore */ }
  }
  svc.child = null
  svc.pid = null
  svc.cpuPct = 0
  svc.memMB = 0
}

export async function sample(environments) {
  const pids = []
  for (const env of environments.values()) {
    for (const svc of env.services) if (svc.pid) pids.push(svc.pid)
  }
  if (!pids.length) return
  let stats = {}
  try {
    stats = await pidusage(pids)
  } catch {
    return
  }
  for (const env of environments.values()) {
    for (const svc of env.services) {
      const s = svc.pid && stats[svc.pid]
      if (s) {
        svc.cpuPct = Math.round(s.cpu * 10) / 10
        svc.memMB = Math.round(s.memory / (1024 * 1024))
      }
    }
  }
}

export async function pingHealth(svc) {
  if (!svc.port) return false
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port: svc.port, path: '/health', timeout: 800 },
      (res) => { resolve(res.statusCode === 200); res.resume() }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}
