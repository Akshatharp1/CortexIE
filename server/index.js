// CortexIE backend — REST API over the orchestrator.
// Provisions and manages REAL local sandbox processes.

import express from 'express'
import cors from 'cors'
import * as orch from './orchestrator.js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'cortexie-backend' }))

app.get('/api/environments', (_req, res) => res.json(orch.listEnvironments()))

app.get('/api/environments/:id', (req, res) => {
  const env = orch.getEnvironment(req.params.id)
  if (!env) return res.status(404).json({ error: 'not found' })
  res.json(env)
})

app.post('/api/environments', (req, res) => {
  const { plan, name, owner } = req.body || {}
  if (!plan || !Array.isArray(plan.services) || plan.services.length === 0) {
    return res.status(400).json({ error: 'plan with services[] is required' })
  }
  const id = orch.createEnvironment(plan, name, owner)
  res.status(201).json(orch.getEnvironment(id))
})

app.post('/api/environments/:id/clone', (req, res) => {
  const id = orch.cloneEnvironment(req.params.id)
  if (!id) return res.status(404).json({ error: 'not found' })
  res.status(201).json(orch.getEnvironment(id))
})

app.post('/api/environments/:id/pause', (req, res) => {
  if (!orch.pauseEnvironment(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.json(orch.getEnvironment(req.params.id))
})

app.post('/api/environments/:id/resume', (req, res) => {
  if (!orch.resumeEnvironment(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.json(orch.getEnvironment(req.params.id))
})

app.post('/api/environments/:id/rollback', (req, res) => {
  if (!orch.rollbackEnvironment(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.json(orch.getEnvironment(req.params.id))
})

app.delete('/api/environments/:id', (req, res) => {
  if (!orch.deleteEnvironment(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

app.get('/api/activities', (_req, res) => res.json(orch.getActivities()))

app.listen(PORT, () => {
  console.log(`\n  CortexIE backend running on http://localhost:${PORT}`)
  console.log('  Seeding an initial real sandbox environment...')
  orch.seed()
})
