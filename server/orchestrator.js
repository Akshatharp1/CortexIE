// CortexIE orchestrator — manages sandbox environment lifecycle.
//
// The actual backend driver (process spawning, Docker, or Kubernetes) is
// selected via the CORTEXIE_PROVIDER env var.  See server/providers/ for docs.

import * as provider from './providers/index.js'

const PROVISION_STEPS = [
  'Parsing request & resolving dependencies',
  'Allocating ports & process slots',
  'Spawning service processes',
  'Wiring service mesh & health probes',
  'Running health checks',
  'Sandbox ready',
]

let envSeq = 100
const newId = () => `env-${(++envSeq).toString(16)}`

// In-memory registry. Each env: { id, name, product, template, region, status,
//   cpu, memoryGb, costPerDay, owner, createdAt, drift, provisionStep,
//   services: [{ name, status, port, pid, child, cpuPct, memMB,
//               containerName, containerId,          ← Docker fields
//               namespace, rancherWorkloadId }] }    ← Rancher fields
const environments = new Map()
const activities = []

function logActivity(text, kind = 'info') {
  activities.unshift({ id: `a${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text, kind, t: new Date().toISOString() })
  if (activities.length > 40) activities.length = 40
}

async function provision(env) {
  env.status = 'provisioning'
  env.provisionStep = 0
  logActivity(`Provisioning ${env.name} (${env.services.length} services)`, 'info')

  for (let i = 0; i < env.services.length; i++) {
    await new Promise((r) => setTimeout(r, 700))
    if (env.status !== 'provisioning') return
    await provider.spawnService(env, env.services[i])
    env.provisionStep = Math.min(2 + i, PROVISION_STEPS.length - 1)
  }
  await new Promise((r) => setTimeout(r, 700))
  if (env.status !== 'provisioning') return
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
  provision(env)
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

export async function pauseEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  await Promise.all(env.services.map((svc) => provider.killService(svc)))
  env.status = 'idle'
  logActivity(`${env.name} paused`, 'warning')
  return true
}

export async function resumeEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  await Promise.all(env.services.map((svc) => provider.spawnService(env, svc)))
  env.status = 'running'
  logActivity(`${env.name} resumed`, 'success')
  return true
}

export async function rollbackEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  // Re-provision any stopped or unhealthy services back to a healthy baseline.
  const dead = env.services.filter((svc) => svc.status !== 'healthy')
  await Promise.all(dead.map((svc) => provider.spawnService(env, svc)))
  env.drift = false
  env.status = 'running'
  logActivity(`Rolled back ${env.name} to healthy snapshot`, 'success')
  return true
}

export async function deleteEnvironment(id) {
  const env = environments.get(id)
  if (!env) return false
  await Promise.all(env.services.map((svc) => provider.killService(svc)))
  environments.delete(id)
  logActivity(`${env.name} terminated`, 'warning')
  return true
}

// ---- live stats sampler -------------------------------------------------------
setInterval(() => { provider.sample(environments).catch(() => {}) }, 2000)

// ---- serialization for the API -----------------------------------------------
function serialize(env) {
  const live = env.services.filter((s) => s.pid || s.containerId || s.rancherWorkloadId)
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
      containerId: s.containerId || null,
      rancherWorkloadId: s.rancherWorkloadId || null,
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
  for (const env of environments.values()) {
    for (const svc of env.services) {
      if (svc.status === 'healthy') {
        const ok = await provider.pingHealth(svc)
        if (!ok) svc.status = 'degraded'
      }
    }
  }
}

// ---- seed environments -------------------------------------------------------
export function seed() {
  // 1. LeaseStar (Running)
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

  // 2. Resident Screening (Idle — no processes, just metadata)
  const id2 = newId()
  environments.set(id2, {
    id: id2,
    name: 'screening-pii-audit',
    product: 'screening',
    template: 'tpl-screening-secure',
    templateName: 'Resident Screening — Secure',
    region: 'local (Node host)',
    status: 'idle',
    cpu: 6,
    memoryGb: 16,
    costPerDay: 11.4,
    owner: 'Dev Patel',
    createdAt: new Date(Date.now() - 3600_000 * 24).toISOString(),
    drift: false,
    provisionStep: 6,
    services: [
      { name: 'screening-api', status: 'stopped', port: null, cpuPct: 0, memMB: 0 },
      { name: 'pii-vault',     status: 'stopped', port: null, cpuPct: 0, memMB: 0 },
      { name: 'postgres',      status: 'stopped', port: null, cpuPct: 0, memMB: 0 },
    ],
  })

  // 3. AIRM ML Pipeline (Running, will drift after 6 s)
  const id3 = createEnvironment(
    {
      product: 'aim',
      template: 'tpl-airm-ml',
      templateName: 'AIRM — ML Pipeline',
      region: 'local (Node host)',
      cpu: 16,
      memoryGb: 64,
      estCostPerDay: 38.5,
      services: ['airm-api', 'model-trainer', 'feature-store', 'postgres', 'mongo'],
    },
    'airm-q3-model-eval',
    'Marcus Webb',
  )
  setTimeout(() => {
    const env = environments.get(id3)
    if (env) {
      env.drift = true
      const trainer = env.services.find((s) => s.name === 'model-trainer')
      if (trainer) trainer.status = 'degraded'
    }
  }, 6000)
}

// ---- graceful shutdown -------------------------------------------------------
async function shutdown() {
  for (const env of environments.values()) {
    await Promise.all(env.services.map((svc) => provider.killService(svc).catch(() => {})))
  }
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
