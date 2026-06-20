// Docker provider — provisions each sandbox service as a Docker container.
//
// SETUP (do all of these before setting CORTEXIE_PROVIDER=docker):
//
//   1. Install Docker Desktop (Windows/Mac) or Docker Engine (Linux).
//      Verify: `docker info`
//
//   2. Create a shared bridge network for sandbox containers:
//        docker network create cortexie
//      Or set DOCKER_NETWORK to an existing network name.
//
//   3. Build / push service images to your registry so they are pullable.
//      Each service name (e.g. "leasestar-web") maps to an image:
//        <DOCKER_REGISTRY>/<service-name>:latest
//      Set DOCKER_REGISTRY to your registry prefix (e.g. myregistry.io/cortexie).
//
//   4. Each image must expose a container port (default 8080) with a GET /health
//      endpoint that returns HTTP 200 when ready.
//      Override the container port with DOCKER_CONTAINER_PORT if needed.
//
//   5. Set env vars in .env (or export them) and restart the server:
//        CORTEXIE_PROVIDER=docker
//        DOCKER_REGISTRY=myregistry.io/cortexie
//        DOCKER_NETWORK=cortexie
//        DOCKER_CONTAINER_PORT=8080   # optional, default 8080

import { exec } from 'child_process'
import { promisify } from 'util'
import http from 'http'

const execAsync = promisify(exec)

const DOCKER_REGISTRY      = process.env.DOCKER_REGISTRY      || 'localhost/cortexie'
const DOCKER_NETWORK       = process.env.DOCKER_NETWORK        || 'cortexie'
const DOCKER_CONTAINER_PORT = Number(process.env.DOCKER_CONTAINER_PORT) || 8080

// Host-side port range for Docker containers — kept separate from the local
// provider's range (8100+) so both providers can coexist in dev if needed.
let nextPort = 9100
const allocPort = () => nextPort++

// Deterministic container name: <envId>-<serviceName>
function containerName(env, svc) {
  return `${env.id}-${svc.name}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

// TODO: Adjust this to match your image naming convention.
// Current pattern: <DOCKER_REGISTRY>/<service-name>:latest
// Examples:
//   myregistry.io/cortexie/leasestar-web:latest
//   myregistry.io/cortexie/postgres:15
function imageName(svc) {
  // TODO: If some services use public images (e.g. postgres:15, redis:7),
  // add a lookup table here instead of always prefixing with DOCKER_REGISTRY.
  return `${DOCKER_REGISTRY}/${svc.name}:latest`
}

export async function spawnService(env, svc) {
  const port = allocPort()
  const name = containerName(env, svc)

  svc.port = port
  svc.containerName = name
  svc.status = 'pending'
  svc.cpuPct = 0
  svc.memMB = 0

  // TODO: Add any extra -e flags your service images need (secrets, DB URLs, etc.).
  // TODO: Add -v mounts if your services need persistent volumes.
  // TODO: Add --env-file if you manage config via a per-env .env file.
  // TODO: Replace ':latest' with a pinned tag from the pipeline branch/tag.
  const cmd = [
    'docker run -d',
    `--name ${name}`,
    `--network ${DOCKER_NETWORK}`,
    `-p ${port}:${DOCKER_CONTAINER_PORT}`,
    `-e SERVICE_NAME=${svc.name}`,
    `-e ENV_NAME=${env.name}`,
    `-e ENV_ID=${env.id}`,
    `-e PRODUCT=${env.product}`,
    imageName(svc),
  ].join(' ')

  try {
    const { stdout } = await execAsync(cmd)
    svc.containerId = stdout.trim().slice(0, 12)
    svc.status = 'healthy'
    console.log(`[docker] started ${name} (${svc.containerId}) on port ${port}`)
  } catch (err) {
    console.error(`[docker] failed to start ${name}:`, err.stderr || err.message)
    svc.status = 'unhealthy'
  }
}

export async function killService(svc) {
  svc.status = 'stopped'
  svc.cpuPct = 0
  svc.memMB = 0

  if (!svc.containerName) return
  try {
    await execAsync(`docker stop ${svc.containerName}`)
    await execAsync(`docker rm ${svc.containerName}`)
    console.log(`[docker] removed ${svc.containerName}`)
  } catch (err) {
    // Container may already be gone after a crash — safe to ignore.
    console.warn(`[docker] cleanup warning for ${svc.containerName}:`, err.message)
  }
  svc.containerId = null
  svc.containerName = null
}

export async function sample(environments) {
  const svcs = []
  for (const env of environments.values()) {
    for (const svc of env.services) {
      if (svc.containerName && svc.status !== 'stopped') svcs.push(svc)
    }
  }
  if (!svcs.length) return

  const names = svcs.map((s) => s.containerName).join(' ')
  try {
    // `docker stats --no-stream --format "{{json .}}"` emits one JSON object
    // per container, one per line.  Each object has:
    //   Name, CPUPerc ("2.34%"), MemUsage ("123MiB / 2GiB"), MemPerc, etc.
    const { stdout } = await execAsync(
      `docker stats --no-stream --format "{{json .}}" ${names}`
    )
    const byName = {}
    for (const line of stdout.trim().split('\n').filter(Boolean)) {
      try {
        const row = JSON.parse(line)
        byName[row.Name] = row
      } catch { /* skip malformed line */ }
    }
    for (const svc of svcs) {
      const row = byName[svc.containerName]
      if (!row) continue
      svc.cpuPct = Math.round(parseFloat(row.CPUPerc ?? '0') * 10) / 10
      // MemUsage is "123MiB / 2GiB" — take the left side and strip the unit.
      const memStr = (row.MemUsage ?? '').split('/')[0].trim()
      svc.memMB = Math.round(parseFloat(memStr) || 0)
    }
  } catch (err) {
    console.warn('[docker] stats error:', err.message)
  }
}

export async function pingHealth(svc) {
  // Containers publish their health endpoint on the mapped host port,
  // so the same HTTP check used by the local provider works here.
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
