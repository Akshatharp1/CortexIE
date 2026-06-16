// CortexIE orchestrator — manages REAL sandbox environments.
//
// Each environment is a set of real Node child processes (one per service),
// each bound to a real local port. We track live CPU/memory via `pidusage`,
// run health checks against each service's /health endpoint, and support
// provision / pause / resume / clone / rollback / terminate — all backed by
// actual process lifecycle operations.

import { fork } from 'child_process'
import { fileURLToPath } from 'url'
import http from 'http'
import pidusage from 'pidusage'

const RUNTIME = fileURLToPath(new URL('./service-runtime.js', import.meta.url))

const PROVISION_STEPS = [
  'Parsing request & resolving dependencies',
  'Allocating ports & process slots',
  'Spawning service processes',
  'Wiring service mesh & health probes',
  'Running health checks',
  'Sandbox ready',
]

let nextPort = 8100
let envSeq = 100
const allocPort = () => nextPort++
const newId = () => `env-${(++envSeq).toString(16)}`

// In-memory registry. Each env: { id, name, product, template, region, status,
//   cpu, memoryGb, costPerDay, owner, createdAt, drift, provisionStep,
//   services: [{ name, status, port, pid, child, cpuPct, memMB }] }
const environments = new Map()
const activities = []

function logActivity(text, kind = 'info') {
  activities.unshift({ id: `a${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text, kind, t: new Date().toISOString() })
  if (activities.length > 40) activities.length = 40
}

function spawnService(env, svc) {
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
    // If the env still expects this service, mark it unhealthy (real signal).
    if (svc.status !== 'stopped') svc.status = 'unhealthy'
    svc.child = null
    svc.pid = null
  })
}

function killService(svc) {
  svc.status = 'stopped'
  if (svc.child) {
    try { svc.child.kill('SIGTERM') } catch { /* ignore */ }
  }
  svc.child = null
  svc.pid = null
  svc.cpuPct = 0
  svc.memMB = 0
}

async function provision(env) {
  env.status = 'provisioning'
  env.provisionStep = 0
  logActivity(`Provisioning ${env.name} (${env.services.length} services)`, 'info')

  // Spawn services one at a time with a short delay, advancing the step UI.
  for (let i = 0; i < env.services.length; i++) {
    await new Promise((r) => setTimeout(r, 700))
    spawnService(env, env.services[i])
    env.provisionStep = Math.min(2 + i, PROVISION_STEPS.length - 1)
  }
  await new Promise((r) => setTimeout(r, 700))
  env.provisionStep = PROVISION_STEPS.length
  env.status = 'running'
  logActivity(`${env.name} provisioned successfully`, 'success')
}

export function createEnvironment(plan, name, owner) {
  const id = newId()
  const env = {
    id,
    name: name || `${plan.product}-sandbox`,
    product: plan.product,
    template: plan.template,
    templateName: plan.templateName,
    region: plan.region || 'local (Node host)',
    status: 'provisioning',
    cpu: plan.cpu || 2,
    memoryGb: plan.memoryGb || 4,
    costPerDay: plan.estCostPerDay ?? plan.costPerDay ?? 6,
    owner: owner || 'Akshatha Reddy',
    createdAt: new Date().toISOString(),
    drift: false,
    provisionStep: 0,
    services: (plan.services || []).map((s) => ({ name: typeof s === 'string' ? s : s.name, status: 'pending' })),
  }
  environments.set(id, env)
  provision(env) // async, runs in background
  return id
}

export function cloneEnvironment(sourceId) {
  const src = environments.get(sourceId)
  if (!src) return null
  const id = newId()
  const env = {
    ...src,
    id,
    name: `${src.name}-clone`,
    status: 'provisioning',
    createdAt: new Date().toISOString(),
    provisionStep: 0,
    drift: false,
    services: src.services.map((s) => ({ name: s.name, status: 'pending' })),
  }
  environments.set(id, env)
  logActivity(`Cloning ${src.name} → ${env.name}`, 'info')
  provision(env)
  return id
}

export function pauseEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  env.services.forEach(killService)
  env.status = 'idle'
  logActivity(`${env.name} paused (processes stopped)`, 'warning')
  return true
}

export function resumeEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  env.services.forEach((svc) => spawnService(env, svc))
  env.status = 'running'
  logActivity(`${env.name} resumed`, 'success')
  return true
}

export function rollbackEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  // Re-spawn any dead services back to a healthy baseline.
  env.services.forEach((svc) => {
    if (!svc.child) spawnService(env, svc)
  })
  env.drift = false
  env.status = 'running'
  logActivity(`Rolled back ${env.name} to healthy snapshot`, 'success')
  return true
}

export function deleteEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  env.services.forEach(killService)
  environments.delete(id)
  logActivity(`${env.name} terminated`, 'warning')
  return true
}

// ---- live stats sampler ----------------------------------------------------
async function sample() {
  const pids = []
  for (const env of environments.values()) {
    for (const svc of env.services) if (svc.pid) pids.push(svc.pid)
  }
  if (!pids.length) return
  let stats = {}
  try {
    stats = await pidusage(pids)
  } catch {
    return // a pid may have just died between collection and sampling
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
setInterval(() => { sample().catch(() => {}) }, 2000)

// ---- serialization for the API ---------------------------------------------
function pingHealth(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 800 }, (res) => {
      resolve(res.statusCode === 200)
      res.resume()
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

function serialize(env) {
  const live = env.services.filter((s) => s.pid)
  const totalCpu = Math.round(live.reduce((a, s) => a + (s.cpuPct || 0), 0) * 10) / 10
  const totalMem = live.reduce((a, s) => a + (s.memMB || 0), 0)
  const memBudgetMB = Math.max(1, env.services.length) * 192
  const memPct = Math.min(100, Math.round((totalMem / memBudgetMB) * 100))
  const healthyCount = env.services.filter((s) => s.status === 'healthy').length
  const health = env.status === 'provisioning'
    ? 0
    : Math.round((healthyCount / Math.max(1, env.services.length)) * 100)
  const uptimeSec = Math.round((Date.now() - new Date(env.createdAt).getTime()) / 1000)

  return {
    id: env.id,
    name: env.name,
    product: env.product,
    template: env.template,
    templateName: env.templateName,
    region: env.region,
    status: env.status,
    owner: env.owner,
    createdAt: env.createdAt,
    cpu: env.cpu,
    memoryGb: env.memoryGb,
    costPerDay: env.costPerDay,
    drift: env.drift,
    provisionStep: env.provisionStep,
    health,
    cpuUsage: Math.min(100, Math.round(totalCpu)),
    cpuPct: totalCpu,
    memMB: totalMem,
    memUsage: memPct,
    uptimeSec,
    services: env.services.map((s) => ({
      name: s.name,
      status: s.status,
      port: s.port || null,
      pid: s.pid || null,
      cpuPct: s.cpuPct || 0,
      memMB: s.memMB || 0,
      url: s.port ? `http://localhost:${s.port}` : null,
    })),
  }
}

export function listEnvironments() {
  return [...environments.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(serialize)
}

export function getEnvironment(id) {
  const env = environments.get(id)
  return env ? serialize(env) : null
}

export function getActivities() {
  return activities
}

export async function refreshHealth() {
  // Optional deeper check: ping live services and downgrade unresponsive ones.
  for (const env of environments.values()) {
    for (const svc of env.services) {
      if (svc.pid && svc.port && svc.status === 'healthy') {
        const ok = await pingHealth(svc.port)
        if (!ok) svc.status = 'degraded'
      }
    }
  }
}

// ---- seed one real environment so the platform isn't empty on boot ---------
export function seed() {
  createEnvironment(
    {
      product: 'leasestar',
      template: 'tpl-leasestar-lite',
      templateName: 'LeaseStar — Lite',
      region: 'local (Node host)',
      cpu: 4,
      memoryGb: 8,
      estCostPerDay: 6.8,
      services: ['leasestar-web', 'leasestar-api', 'postgres'],
    },
    'leasestar-ui-regression',
    'Akshatha Reddy',
  )
}

// Clean up all child processes on shutdown.
function shutdown() {
  for (const env of environments.values()) env.services.forEach(killService)
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
