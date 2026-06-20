import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ENVIRONMENTS, TEMPLATES, USERS, ROLES, PROVISION_STEPS } from '../data/mockData.js'
import { api, relativeTime } from '../api/client.js'

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

  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const timers = useRef({})

  const logActivity = (text, kind = 'info') =>
    setActivities((a) => [{ id: `a${Date.now()}`, text, kind, t: 'just now' }, ...a].slice(0, 30))

  // Poll live environments from backend, otherwise fallback to local mock data.
  useEffect(() => {
    let active = true
    async function checkAndFetch() {
      try {
        const data = await api.listEnvironments()
        if (active) {
          setEnvironments(data)
          setIsBackendConnected(true)
        }
      } catch (err) {
        if (active) {
          setIsBackendConnected(false)
        }
      }
    }
    checkAndFetch()
    const interval = setInterval(checkAndFetch, 2500)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  // Poll activities from backend if connected.
  useEffect(() => {
    if (!isBackendConnected) return
    let active = true
    async function loadActivities() {
      try {
        const data = await api.activities()
        if (active) {
          const mapped = data.map((act) => ({
            id: act.id,
            text: act.text,
            kind: act.kind,
            t: relativeTime(act.t),
          }))
          setActivities(mapped)
        }
      } catch (err) {
        console.warn('Failed to load activities from backend:', err.message)
      }
    }
    loadActivities()
    const timer = setInterval(loadActivities, 3500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isBackendConnected])

  // Simulate live metric drift for running environments (ONLY when backend is offline).
  useEffect(() => {
    if (isBackendConnected) return
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
  }, [isBackendConnected])

  // Drive a provisioning environment through its service states to "running" (simulation only).
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

  const createEnvironment = async (plan, name, owner) => {
    const defaultOwner = owner || (settings.role === 'Platform Admin' ? 'Akshatha Reddy' : 'Guest')
    if (isBackendConnected) {
      try {
        const data = await api.createEnvironment(plan, name, defaultOwner)
        logActivity(`Requested provisioning for ${name || plan.product} via backend`, 'info')
        const list = await api.listEnvironments()
        setEnvironments(list)
        return data.id
      } catch (err) {
        logActivity(`Backend provisioning failed: ${err.message}. Falling back to simulation.`, 'error')
      }
    }

    // Simulation fallback:
    const id = newId()
    const env = {
      id,
      name: name || `${plan.product}-sandbox`,
      product: plan.product,
      template: plan.template,
      status: 'provisioning',
      health: 0,
      region: plan.region,
      owner: defaultOwner,
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
    logActivity(`Provisioning ${env.name} (Simulation)`, 'info')
    startProvisioning(id)
    return id
  }

  const cloneEnvironment = async (sourceId) => {
    if (isBackendConnected) {
      try {
        const data = await api.cloneEnvironment(sourceId)
        logActivity(`Cloning environment via backend`, 'info')
        const list = await api.listEnvironments()
        setEnvironments(list)
        return data.id
      } catch (err) {
        logActivity(`Backend clone failed: ${err.message}`, 'error')
      }
    }

    // Simulation:
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
    logActivity(`Cloning ${src.name} → ${env.name} (Simulation)`, 'info')
    startProvisioning(id)
    return id
  }

  const deleteEnvironment = async (id) => {
    if (isBackendConnected) {
      try {
        await api.deleteEnvironment(id)
        logActivity(`Terminated environment via backend`, 'warning')
        const list = await api.listEnvironments()
        setEnvironments(list)
        return
      } catch (err) {
        logActivity(`Backend terminate failed: ${err.message}`, 'error')
      }
    }

    // Simulation:
    const env = environments.find((e) => e.id === id)
    if (timers.current[id]) {
      clearInterval(timers.current[id])
      delete timers.current[id]
    }
    setEnvironments((envs) => envs.filter((e) => e.id !== id))
    if (env) logActivity(`${env.name} terminated (Simulation)`, 'warning')
  }

  const setEnvStatus = async (id, status) => {
    if (isBackendConnected) {
      try {
        if (status === 'idle') {
          await api.pauseEnvironment(id)
        } else if (status === 'running') {
          await api.resumeEnvironment(id)
        }
        const list = await api.listEnvironments()
        setEnvironments(list)
        return
      } catch (err) {
        logActivity(`Backend state change to ${status} failed: ${err.message}`, 'error')
      }
    }

    // Simulation:
    setEnvironments((envs) => envs.map((e) => (e.id === id ? { ...e, status } : e)))
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`${env.name} → ${status} (Simulation)`, status === 'error' ? 'error' : 'info')
  }

  const resolveDrift = async (id) => {
    if (isBackendConnected) {
      try {
        await api.rollbackEnvironment(id)
        logActivity(`Configuration drift resolved via backend`, 'success')
        const list = await api.listEnvironments()
        setEnvironments(list)
        return
      } catch (err) {
        logActivity(`Backend drift resolution failed: ${err.message}`, 'error')
      }
    }

    // Simulation:
    setEnvironments((envs) => envs.map((e) => (e.id === id ? { ...e, drift: false, health: 100 } : e)))
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`Configuration drift resolved on ${env.name} (Simulation)`, 'success')
  }

  const rollback = async (id) => {
    if (isBackendConnected) {
      try {
        await api.rollbackEnvironment(id)
        logActivity(`Rolled back environment via backend`, 'success')
        const list = await api.listEnvironments()
        setEnvironments(list)
        return
      } catch (err) {
        logActivity(`Backend rollback failed: ${err.message}`, 'error')
      }
    }

    // Simulation:
    setEnvironments((envs) =>
      envs.map((e) =>
        e.id === id
          ? { ...e, status: 'running', health: 100, drift: false, services: e.services.map((s) => ({ ...s, status: 'healthy' })) }
          : e,
      ),
    )
    const env = environments.find((e) => e.id === id)
    if (env) logActivity(`Rolled back ${env.name} to last healthy snapshot (Simulation)`, 'success')
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
