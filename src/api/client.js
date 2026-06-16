// Thin REST client for the CortexIE backend.
// Vite proxies /api -> http://localhost:4000 (see vite.config.js).

const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `${res.status} ${res.statusText}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listEnvironments: () => req('/environments'),
  getEnvironment: (id) => req(`/environments/${id}`),
  createEnvironment: (plan, name, owner) =>
    req('/environments', { method: 'POST', body: JSON.stringify({ plan, name, owner }) }),
  cloneEnvironment: (id) => req(`/environments/${id}/clone`, { method: 'POST' }),
  pauseEnvironment: (id) => req(`/environments/${id}/pause`, { method: 'POST' }),
  resumeEnvironment: (id) => req(`/environments/${id}/resume`, { method: 'POST' }),
  rollbackEnvironment: (id) => req(`/environments/${id}/rollback`, { method: 'POST' }),
  deleteEnvironment: (id) => req(`/environments/${id}`, { method: 'DELETE' }),
  activities: () => req('/activities'),
}

// Format an ISO timestamp into a short relative label ("3m ago").
export function relativeTime(iso) {
  if (!iso) return ''
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
