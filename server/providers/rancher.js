// Rancher / Kubernetes provider — provisions each sandbox as a Kubernetes
// namespace with workloads managed through the Rancher v3 API.
//
// ─── SETUP ────────────────────────────────────────────────────────────────────
//
//   1. Generate a Rancher API token:
//        Rancher UI → top-right avatar → Account & API Keys → Add Key
//        Or via API: POST <RANCHER_URL>/v3/tokens
//        The token format is:  token-xxxxx:xxxxxxxxxxxxxxxxxx
//
//   2. Find your Cluster ID:
//        GET <RANCHER_URL>/v3/clusters
//        Look for the cluster you want to target → copy the `id` field (e.g. c-m-abcd1234).
//
//   3. Find your Project ID (namespaces must belong to a project):
//        GET <RANCHER_URL>/v3/clusters/<CLUSTER_ID>/projects
//        Copy the `id` field (e.g. c-m-abcd1234:p-xxxxx) → set RANCHER_PROJECT_ID.
//
//   4. Set all env vars in .env and restart:
//        CORTEXIE_PROVIDER=rancher
//        RANCHER_URL=https://rancher.internal
//        RANCHER_TOKEN=token-xxxxx:xxxxxxxxxxxxxxxxxx
//        RANCHER_CLUSTER_ID=c-m-abcd1234
//        RANCHER_PROJECT_ID=c-m-abcd1234:p-xxxxx
//        RANCHER_NAMESPACE_PREFIX=cortexie-        # optional, default cortexie-
//        RANCHER_SKIP_TLS=true                     # set true for self-signed certs
//
//   5. Ensure the Rancher user tied to the token has at least "Project Member"
//      rights on the target project so it can create namespaces and workloads.
//
// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
//
//   • Each CortexIE environment maps to one Kubernetes namespace:
//       <RANCHER_NAMESPACE_PREFIX><envId>   e.g. cortexie-env-65
//
//   • Each service in the environment maps to one Kubernetes Deployment + Service.
//     The Deployment image is resolved from RANCHER_IMAGE_REGISTRY:
//       <RANCHER_IMAGE_REGISTRY>/<service-name>:<pipeline-tag>
//
//   • CPU / memory metrics are fetched from the Rancher monitoring API
//     (requires the Rancher Monitoring app to be installed on the cluster).
//
// ─── API REFERENCE ────────────────────────────────────────────────────────────
//   Rancher v3 API:    https://ranchermanager.docs.rancher.com/reference-guides/rancher-manager-api
//   Kubernetes API:    https://kubernetes.io/docs/reference/kubernetes-api/
//   Rancher Monitoring: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting

import https from 'https'
import http from 'http'

const RANCHER_URL      = process.env.RANCHER_URL             || ''
const RANCHER_TOKEN    = process.env.RANCHER_TOKEN           || ''
const CLUSTER_ID       = process.env.RANCHER_CLUSTER_ID      || ''
const PROJECT_ID       = process.env.RANCHER_PROJECT_ID      || ''
const NS_PREFIX        = process.env.RANCHER_NAMESPACE_PREFIX || 'cortexie-'
const IMAGE_REGISTRY   = process.env.RANCHER_IMAGE_REGISTRY  || 'myregistry.io/cortexie'
const SKIP_TLS         = process.env.RANCHER_SKIP_TLS === 'true'

// ── Internal HTTP helper ──────────────────────────────────────────────────────

function rancherRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    if (!RANCHER_URL) {
      reject(new Error('RANCHER_URL is not set. Check your .env file.'))
      return
    }
    const url = new URL(path, RANCHER_URL)
    const isHttps = url.protocol === 'https:'
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${RANCHER_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      rejectUnauthorized: !SKIP_TLS,
    }
    const transport = isHttps ? https : http
    const req = transport.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// Namespace name for an environment.
function namespaceName(envId) {
  return `${NS_PREFIX}${envId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

// Workload name inside Kubernetes (must be RFC 1123).
function workloadName(svcName) {
  return svcName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

// ── Namespace helpers ─────────────────────────────────────────────────────────

async function ensureNamespace(ns) {
  // TODO: Check if namespace already exists before creating it.
  //       GET /v3/cluster/<CLUSTER_ID>/namespaces?name=<ns>
  //       If found (items.length > 0), skip creation.

  // TODO: Uncomment and fill in RANCHER_PROJECT_ID once you have it.
  //
  // await rancherRequest('POST', `/v3/clusters/${CLUSTER_ID}/namespaces`, {
  //   name: ns,
  //   projectId: PROJECT_ID,   // e.g. "c-m-abcd1234:p-xxxxx"
  //   labels: {
  //     'cortexie/managed': 'true',
  //   },
  //   // TODO: Add resource quotas here if your cluster enforces them.
  //   // resourceQuota: { limit: { cpu: '4', memory: '8Gi' } },
  // })

  console.warn(`[rancher] TODO: ensureNamespace(${ns}) — implement once you have Rancher access`)
}

async function deleteNamespace(ns) {
  // TODO: Uncomment once Rancher access is available.
  //
  // await rancherRequest('DELETE', `/v3/clusters/${CLUSTER_ID}/namespaces/${ns}`)

  console.warn(`[rancher] TODO: deleteNamespace(${ns})`)
}

// ── Deployment helpers ────────────────────────────────────────────────────────

function buildDeploymentManifest(env, svc, ns) {
  const name = workloadName(svc.name)
  // TODO: Replace image tag with the actual pipeline tag from env.pipelineBranch.
  const image = `${IMAGE_REGISTRY}/${svc.name}:latest`

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace: ns,
      labels: {
        app: name,
        'cortexie/env-id': env.id,
        'cortexie/env-name': env.name,
        'cortexie/service': svc.name,
      },
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name,
            image,
            // TODO: Add ports, env vars, resource limits, volume mounts, etc.
            // TODO: Add imagePullSecrets if your registry is private.
            env: [
              { name: 'SERVICE_NAME', value: svc.name },
              { name: 'ENV_NAME',     value: env.name },
              { name: 'ENV_ID',       value: env.id },
              { name: 'PRODUCT',      value: env.product },
            ],
            // TODO: Set resource requests/limits based on blueprint sizing.
            // resources: {
            //   requests: { cpu: '100m', memory: '128Mi' },
            //   limits:   { cpu: '500m', memory: '512Mi' },
            // },
            // TODO: Add a readinessProbe matching your service's /health endpoint.
            // readinessProbe: {
            //   httpGet: { path: '/health', port: 8080 },
            //   initialDelaySeconds: 5,
            //   periodSeconds: 10,
            // },
          }],
        },
      },
    },
  }
}

function buildServiceManifest(svc, ns) {
  const name = workloadName(svc.name)
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace: ns },
    spec: {
      selector: { app: name },
      // TODO: Change to NodePort or LoadBalancer if you need external access.
      type: 'ClusterIP',
      ports: [{
        // TODO: Match the container port your service image actually listens on.
        port: 8080,
        targetPort: 8080,
      }],
    },
  }
}

// ── Provider interface ────────────────────────────────────────────────────────

export async function spawnService(env, svc) {
  svc.status = 'pending'
  svc.cpuPct = 0
  svc.memMB = 0

  const ns = namespaceName(env.id)

  try {
    // Step 1: Create the namespace (idempotent).
    await ensureNamespace(ns)

    // Step 2: Apply the Deployment.
    // TODO: Uncomment once RANCHER_URL / RANCHER_TOKEN / CLUSTER_ID are set.
    //
    // const deployResp = await rancherRequest(
    //   'POST',
    //   `/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/namespaces/${ns}/deployments`,
    //   buildDeploymentManifest(env, svc, ns)
    // )
    // if (deployResp.status >= 400) {
    //   throw new Error(`Deployment failed: ${JSON.stringify(deployResp.body)}`)
    // }

    // Step 3: Create a Kubernetes Service for networking.
    // TODO: Uncomment once RANCHER_URL / RANCHER_TOKEN / CLUSTER_ID are set.
    //
    // const svcResp = await rancherRequest(
    //   'POST',
    //   `/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces/${ns}/services`,
    //   buildServiceManifest(svc, ns)
    // )

    // Step 4: Store references so kill/rollback can find this workload later.
    svc.namespace = ns
    svc.rancherWorkloadId = `deployment:${ns}:${workloadName(svc.name)}`
    // svc.port = null  — ClusterIP services are not directly reachable from host.
    //                    Set svc.port if you use NodePort and know the assigned port.

    // Placeholder: mark healthy for the demo until real provisioning is wired.
    svc.status = 'healthy'
    console.warn(`[rancher] spawnService placeholder — ${svc.name} in ${ns}`)
    console.warn('[rancher] Set RANCHER_URL, RANCHER_TOKEN, RANCHER_CLUSTER_ID to activate.')
  } catch (err) {
    console.error(`[rancher] spawnService error for ${svc.name}:`, err.message)
    svc.status = 'unhealthy'
  }
}

export async function killService(svc) {
  svc.status = 'stopped'
  svc.cpuPct = 0
  svc.memMB = 0

  if (!svc.rancherWorkloadId) return

  const [, ns, name] = svc.rancherWorkloadId.split(':')

  // TODO: Delete the Deployment via the Rancher proxy to the K8s API.
  // Uncomment once Rancher access is available:
  //
  // await rancherRequest(
  //   'DELETE',
  //   `/k8s/clusters/${CLUSTER_ID}/apis/apps/v1/namespaces/${ns}/deployments/${name}`
  // )
  //
  // TODO: Also delete the Kubernetes Service:
  // await rancherRequest(
  //   'DELETE',
  //   `/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces/${ns}/services/${name}`
  // )
  //
  // TODO: If this is the last service in the namespace, delete the namespace too:
  // await deleteNamespace(ns)

  console.warn(`[rancher] TODO: killService ${name} in ${ns}`)
  svc.rancherWorkloadId = null
  svc.namespace = null
}

export async function sample(environments) {
  // TODO: Fetch CPU/memory for all CortexIE workloads via Rancher monitoring.
  //
  // Prerequisites:
  //   • Rancher Monitoring app must be installed on the cluster.
  //   • The Rancher token must have read access to the monitoring namespace.
  //
  // Option A — Query Prometheus directly through the Rancher proxy:
  //
  //   const cpuQuery = encodeURIComponent(
  //     'sum by (namespace,pod) (rate(container_cpu_usage_seconds_total{namespace=~"cortexie-.*"}[2m]))'
  //   )
  //   const resp = await rancherRequest(
  //     'GET',
  //     `/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy/api/v1/query?query=${cpuQuery}`
  //   )
  //   // resp.body.data.result is an array of { metric: { namespace, pod }, value: [timestamp, cpuFloat] }
  //   // Match pod labels (cortexie/env-id, cortexie/service) back to svc objects and set svc.cpuPct.
  //
  // Option B — kubectl top pods per namespace (simpler, requires metrics-server):
  //
  //   import { exec } from 'child_process'
  //   import { promisify } from 'util'
  //   const execAsync = promisify(exec)
  //   const { stdout } = await execAsync(`kubectl top pods -n ${ns} --no-headers`)
  //   // Parse "pod-name  12m  64Mi" output and map to services by label.
  //
  // For now leave metrics at 0 — the UI shows "—" for unknown values.
  void environments
}

export async function pingHealth(svc) {
  // TODO: Check Pod readiness via the Rancher / Kubernetes API.
  //
  // Option A — Kubernetes Pod conditions (most reliable):
  //
  //   if (!svc.namespace || !svc.rancherWorkloadId) return false
  //   const name = svc.rancherWorkloadId.split(':')[2]
  //   const resp = await rancherRequest(
  //     'GET',
  //     `/k8s/clusters/${CLUSTER_ID}/api/v1/namespaces/${svc.namespace}/pods?labelSelector=app=${name}`
  //   )
  //   const pods = resp.body?.items ?? []
  //   return pods.some((pod) =>
  //     pod.status?.conditions?.find((c) => c.type === 'Ready' && c.status === 'True')
  //   )
  //
  // Option B — HTTP check if service is exposed via NodePort (same as local/docker):
  //
  //   if (!svc.port) return false
  //   return new Promise((resolve) => {
  //     const req = http.get(
  //       { host: '127.0.0.1', port: svc.port, path: '/health', timeout: 800 },
  //       (res) => { resolve(res.statusCode === 200); res.resume() }
  //     )
  //     req.on('error', () => resolve(false))
  //     req.on('timeout', () => { req.destroy(); resolve(false) })
  //   })

  // Placeholder: return true so the UI shows healthy during the demo.
  void svc
  return true
}
