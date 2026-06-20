// Provider factory — selects the backend driver based on CORTEXIE_PROVIDER.
//
// Supported values (set in .env or export before starting the server):
//
//   local    (default) — Node child processes via fork(). No external deps.
//   docker             — Docker containers via `docker` CLI.
//   rancher            — Kubernetes workloads via Rancher v3 API.
//
// See the individual provider files in this directory for full setup docs.

const PROVIDER = (process.env.CORTEXIE_PROVIDER || 'local').toLowerCase()

let provider

if (PROVIDER === 'rancher') {
  provider = await import('./rancher.js')
  console.log('[cortexie] Provider: Rancher / Kubernetes')
  if (!process.env.RANCHER_URL || !process.env.RANCHER_TOKEN || !process.env.RANCHER_CLUSTER_ID) {
    console.warn('[cortexie] WARNING: One or more Rancher env vars are missing.')
    console.warn('[cortexie]   Required: RANCHER_URL, RANCHER_TOKEN, RANCHER_CLUSTER_ID')
    console.warn('[cortexie]   See server/providers/rancher.js for full setup instructions.')
  }
} else if (PROVIDER === 'docker') {
  provider = await import('./docker.js')
  console.log('[cortexie] Provider: Docker')
  console.log(`[cortexie]   Registry : ${process.env.DOCKER_REGISTRY || 'localhost/cortexie (default)'}`)
  console.log(`[cortexie]   Network  : ${process.env.DOCKER_NETWORK  || 'cortexie (default)'}`)
} else {
  if (PROVIDER !== 'local') {
    console.warn(`[cortexie] Unknown CORTEXIE_PROVIDER="${PROVIDER}", falling back to local.`)
  }
  provider = await import('./local.js')
  console.log('[cortexie] Provider: Local (Node child processes)')
}

export const { spawnService, killService, sample, pingHealth } = provider
