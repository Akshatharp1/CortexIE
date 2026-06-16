import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ENVIRONMENTS, TEMPLATES, USERS, ROLES, PROVISION_STEPS } from '../data/mockData.js'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

let idCounter = 100
const newId = () => `env-${(++idCounter).toString(16)}`

export function AppProvider({ children }) {
  const [environments, setEnvironments] = useState(ENVIRONMENTS)
  const [templates] = useState(TEMPLATES)
  const [users, setUsers] = useState(USERS)
  const [roles] = useState(ROLES)
  const [activities, setActivities] = useState([
    { id: 'a1', text: 'leasestar-ui-regression provisioned by Akshatha Reddy', kind: 'success', t: '6h ago' },
    { id: 'a2', text: 'Drift detected on airm-q3-model-eval (model-trainer)', kind: 'warning', t: '3h ago' },
    { id: 'a3', text: 'spend-reporting-poc health degraded — spend-api unhealthy', kind: 'error', t: '1h ago' },
  ])

  const [settings, setSettings] = useState({
    aiMode: 'rule', // 'rule' | 'claude'
    apiKey: '',
    autoCleanupHours: 72,
    role: 'Platform Admin',
  })

  const timers = useRef({})

  const logActivity = (text, kind = 'info') =>
    setActivities((a) => [{ id: `a${Date.now()}`, text, kind, t: 'just now' }, ...a].slice(0, 30))

  // Simulate live metric drift for running environments.
  useEffect(() => {
    const interval = setInterval(() => {
      setEnvironments((envs) =>
        envs.map((e) => {
          if (e.status !== 'running' && e.status !== 'idle') return e
          const jitter = (base) => Math.max(1, Math.min(99, Math.round(base + (Math.random() - 0.5) * 8)))
          return { ...e, cpuUsage: jitter(e.cpuUsage), memUsage: jitter(e.memUsage) }
        }),
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Drive a provisioning environment through its service states to "running".
  const startProvisioning = (envId) => {
    let step = 0
    timers.current[envId] = setInterval(() => {
      step += 1
      setEnvironments((envs) =>
        envs.map((e) => {
          if (e.id !== envId) return e
          const services = e.services.map((s, i) => ({
            ...s,
            status: i < step ? 'healthy' : s.status,
          }))
          const done = step >= e.services.length
          if (done) {
            clearInterval(timers.current[envId])
            delete timers.current[envId]
            logActivity(`${e.name} provisioned successfully`, 'success')
            return {
              ...e,
              services,
              status: 'running',
              health: 100,
              cpuUsage: 18,
              memUsage: 32,
              provisionStep: PROVISION_STEPS.length,
            }
          }
          return { ...e, services, provisionStep: Math.min(step, PROVISION_STEPS.length) }
        }),
      )
    }, 1100)
  }

  const createEnvironment = (plan, name, owner) => {
    const id = newId()
    const env = {
      id,
      name: name || `${plan.product}-sandbox`,
      product: plan.product,
      template: plan.template,
      status: 'provisioning',
      health: 0,
      region: plan.region,
      owner: owner || 'Akshatha Reddy',
      createdAt: new Date().toISOString(),
      cpu: plan.cpu,
      memoryGb: plan.memoryGb,
      cpuUsage: 0,
      memUsage: 0,
      costPerDay: plan.estCostPerDay,
      storageClass: plan.storageClass,
      loftProduct: plan.loftProduct,
      pipelineBranch: plan.pipelineBranch,
      drift: false,
      provisionStep: 0,
      services: plan.services.map((s) => ({ name: s, status: 'pending' })),
    }
    setEnvironments((envs) => [env, ...envs])
    logActivity(`Provisioning ${env.name} (${plan.templateName})`, 'info')
    startProvisioning(id)
    return id
  }

  const cloneEnvironment = (sourceId) => {
    const src = environments.find((e) => e.id === sourceId)
    if (!src) return null
    const id = newId()
    const env = {
      ...src,
      id,
      name: `${src.name}-clone`,
      status: 'provisioning',
      health: 0,
      cpuUsage: 0,
      memUsage: 0,
      createdAt: new Date().toISOString(),
      provisionStep: 0,
      services: src.services.map((s) => ({ ...s, status: 'pending' })),
    }
    setEnvironments((envs) => [env, ...envs])
    logActivity(`Cloning ${src.name} → ${env.name}`, 'info')
    startProvisioning(id)
    return id
  }

  const deleteEnvironment = (id) => {
    const env = environments.find((e) => e.id === id)
    if (timers.current[id]) {
      clearInterval(timers.current[id])
      delete timers.current[id]
    }
    setEnvironments((envs) => envs.filter((e) => e.id !== id))
    if (env) logActivity(`${env.name} terminated`, 'warning')
  }

  const setEnvStatus = (id, status) => {
    setEnvironments((envs) => envs.map((e) => (e.id === id ? { ...e, status } : e)))
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`${env.name} → ${status}`, status === 'error' ? 'error' : 'info')
  }

  const resolveDrift = (id) => {
    setEnvironments((envs) => envs.map((e) => (e.id === id ? { ...e, drift: false, health: 100 } : e)))
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`Configuration drift resolved on ${env.name}`, 'success')
  }

  const rollback = (id) => {
    setEnvironments((envs) =>
      envs.map((e) =>
        e.id === id
          ? { ...e, status: 'running', health: 100, drift: false, services: e.services.map((s) => ({ ...s, status: 'healthy' })) }
          : e,
      ),
    )
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`Rolled back ${env.name} to last healthy snapshot`, 'success')
  }

  const toggleUserStatus = (id) =>
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u)))

  const value = useMemo(
    () => ({
      environments,
      templates,
      users,
      roles,
      activities,
      settings,
      setSettings,
      createEnvironment,
      cloneEnvironment,
      deleteEnvironment,
      setEnvStatus,
      resolveDrift,
      rollback,
      toggleUserStatus,
    }),
    [environments, templates, users, roles, activities, settings],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
