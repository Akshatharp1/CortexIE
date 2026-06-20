import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip, Button, Avatar, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, LinearProgress, Breadcrumbs, Link,
} from '@mui/material'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import HealingRoundedIcon from '@mui/icons-material/HealingRounded'
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import StatusChip from '../components/StatusChip.jsx'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS, buildTimeSeries } from '../data/mockData.js'

function TerminalLogs({ env }) {
  const [logs, setLogs] = useState([])
  const terminalRef = useRef(null)

  useEffect(() => {
    const initial = [
      `[INFO] [${new Date(Date.now() - 60000).toLocaleTimeString()}] [IaC] Running Terraform validate... success`,
      `[INFO] [${new Date(Date.now() - 55000).toLocaleTimeString()}] [IaC] Applied network security policies for namespace cortex-ie-${env.id}`,
      `[INFO] [${new Date(Date.now() - 50000).toLocaleTimeString()}] [Kubernetes] Allocated resource quotas: CPU ${env.cpu} vCPU, Memory ${env.memoryGb} GB`,
      `[INFO] [${new Date(Date.now() - 45000).toLocaleTimeString()}] [Mesh] Mounted ingress gateway routing rules on port 80/443`,
      `[INFO] [${new Date(Date.now() - 40000).toLocaleTimeString()}] [Docker] Initialized sidecar proxy containers for logging and observability`,
      `[INFO] [${new Date(Date.now() - 35000).toLocaleTimeString()}] [Services] Spawned ${env.services.length} services as managed processes`,
      `[INFO] [${new Date(Date.now() - 30000).toLocaleTimeString()}] [Orchestrator] Service mesh health checks completed: health status 100%`,
    ]
    setLogs(initial)
  }, [env.id, env.cpu, env.memoryGb, env.services.length])

  useEffect(() => {
    const messages = [
      'Checking database connection pool... status OK',
      'Flushing redis cache partition... 12 keys evicted',
      'Syncing configuration rules from environment configmap',
      'Observability telemetry payload dispatched to CortexIE controller',
      'CPU sample collected: healthy process load',
      'Incoming API ping from edge controller... routed in 8ms',
      'Garbage collection complete: heap cleaned',
      'Active websocket sessions: 2 active clients',
      'Security audit: no anomalies detected in service communication',
    ]

    const interval = setInterval(() => {
      if (env.status !== 'running') return
      const randMsg = messages[Math.floor(Math.random() * messages.length)]
      const timestamp = new Date().toLocaleTimeString()
      setLogs((prev) => [...prev, `[INFO] [${timestamp}] [Service Runtime] ${randMsg}`].slice(-50))
    }, 4000)

    return () => clearInterval(interval)
  }, [env.status])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <Card sx={{ bgcolor: '#070a13', border: '1px solid rgba(148,160,189,0.15)' }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#19d3c5', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 }}>
            cortexie@orchestrator:~# tail -f /var/log/cortexie/{env.name}.log
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
          </Box>
        </Stack>
        <Box
          ref={terminalRef}
          sx={{
            height: 180,
            overflowY: 'auto',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 12,
            lineHeight: 1.5,
            color: '#3ddc97',
            bgcolor: '#04060b',
            p: 1.5,
            borderRadius: 1,
            border: '1px solid rgba(148, 160, 189, 0.1)',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(148, 160, 189, 0.2)', borderRadius: 2 },
          }}
        >
          {logs.map((log, idx) => (
            <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
              {log}
            </div>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

function DependencyGraph({ env }) {
  const isRunning = env.status === 'running'
  const ingresses = []
  const middlewares = []
  const databases = []
  const others = []

  env.services.forEach((s) => {
    const n = s.name.toLowerCase()
    if (n.includes('web') || n.includes('gateway') || n.includes('ui') || n.includes('proxy')) {
      ingresses.push(s)
    } else if (n.includes('db') || n.includes('postgres') || n.includes('mongo') || n.includes('redis') || n.includes('vault') || n.includes('store')) {
      databases.push(s)
    } else if (n.includes('api') || n.includes('svc') || n.includes('trainer') || n.includes('seeder') || n.includes('collector') || n.includes('grafana')) {
      middlewares.push(s)
    } else {
      others.push(s)
    }
  })

  const mid = [...middlewares, ...others]
  const db = [...databases]
  const nodes = []
  const nodeMap = {}

  const distribute = (list, x, canvasHeight = 200) => {
    const count = list.length
    list.forEach((item, index) => {
      const y = count === 1 ? canvasHeight / 2 + 10 : 35 + (index * (canvasHeight - 50)) / (count - 1)
      nodes.push({ name: item.name, status: item.status, x, y })
      nodeMap[item.name] = { x, y }
    })
  }

  distribute(ingresses.length ? ingresses : [{ name: 'Gateway/Ingress', status: 'healthy' }], 80)
  distribute(mid.length ? mid : [{ name: 'App Controller', status: 'healthy' }], 260)
  distribute(db.length ? db : [{ name: 'Database / PV', status: 'healthy' }], 440)

  const links = []
  const addLink = (from, to, status) => {
    const fNode = nodeMap[from]
    const tNode = nodeMap[to]
    if (fNode && tNode) {
      links.push({ from, to, x1: fNode.x, y1: fNode.y, x2: tNode.x, y2: tNode.y, status })
    }
  }

  if (ingresses.length && mid.length) {
    ingresses.forEach(i => {
      mid.forEach(m => addLink(i.name, m.name, m.status))
    })
  } else {
    nodes.filter(n => n.x === 80).forEach(i => {
      nodes.filter(n => n.x === 260).forEach(m => addLink(i.name, m.name, m.status))
    })
  }

  if (mid.length && db.length) {
    mid.forEach(m => {
      db.forEach(d => addLink(m.name, d.name, d.status))
    })
  } else {
    nodes.filter(n => n.x === 260).forEach(m => {
      nodes.filter(n => n.x === 440).forEach(d => addLink(m.name, d.name, d.status))
    })
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 'bold' }}>Topology Digital Twin</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, height: 14, overflow: 'hidden' }}>
          Service-mesh dependency graph with active packet animation.
        </Typography>
        <Box sx={{ bgcolor: 'rgba(148,160,189,0.02)', border: '1px solid rgba(148,160,189,0.08)', borderRadius: 1.5, display: 'flex', justifyContent: 'center', p: 0.5 }}>
          <svg width="100%" height="200" viewBox="0 0 520 220" style={{ background: '#0b0e1a', borderRadius: 6 }}>
            <style>
              {`
                @keyframes flow-active {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .flow-path {
                  stroke-dasharray: 6,4;
                }
                .flow-active {
                  animation: flow-active 1.2s linear infinite;
                }
                .mesh-node {
                  transition: 0.2s;
                }
                .mesh-node:hover {
                  filter: brightness(1.25);
                }
              `}
            </style>
            
            {links.map((lnk, idx) => {
              const isLinkActive = isRunning && lnk.status !== 'stopped' && lnk.status !== 'unhealthy'
              const color = lnk.status === 'healthy' ? '#7c5cff' : lnk.status === 'degraded' ? '#ffb547' : lnk.status === 'unhealthy' ? '#f44336' : 'rgba(148,160,189,0.15)'
              return (
                <path
                  key={idx}
                  d={`M ${lnk.x1} ${lnk.y1} C ${(lnk.x1 + lnk.x2) / 2} ${lnk.y1}, ${(lnk.x1 + lnk.x2) / 2} ${lnk.y2}, ${lnk.x2} ${lnk.y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isLinkActive ? 2 : 1}
                  opacity={isLinkActive ? 0.8 : 0.2}
                  className={`flow-path ${isLinkActive ? 'flow-active' : ''}`}
                />
              )
            })}

            {nodes.map((node) => {
              const strokeColor = node.status === 'healthy' ? '#3ddc97' : node.status === 'degraded' ? '#ffb547' : node.status === 'unhealthy' ? '#f44336' : '#94a0bd'
              const label = node.name.length > 15 ? node.name.slice(0, 12) + '...' : node.name
              return (
                <g key={node.name} transform={`translate(${node.x}, ${node.y})`} className="mesh-node">
                  {isRunning && node.status === 'healthy' && (
                    <circle r="16" fill="none" stroke="#3ddc97" strokeWidth="3" opacity="0.15" />
                  )}
                  <circle r="12" fill="#141a2e" stroke={strokeColor} strokeWidth="2" />
                  <circle r="4" fill={strokeColor} />
                  <text
                    y="24"
                    textAnchor="middle"
                    fill="#e8ecf6"
                    style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 500 }}
                  >
                    {label}
                  </text>
                </g>
              )
            })}
          </svg>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function EnvironmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { environments, cloneEnvironment, deleteEnvironment, rollback, resolveDrift, setEnvStatus } = useApp()
  const env = environments.find((e) => e.id === id)

  if (!env) {
    return (
      <Box>
        <Typography variant="h5">Sandbox not found</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/environments')}>Back to sandboxes</Button>
      </Box>
    )
  }

  const product = PRODUCTS.find((p) => p.id === env.product)
  const cpuSeries = buildTimeSeries(env.cpuUsage || 30, 4)
  const memSeries = buildTimeSeries(env.memUsage || 40, 4)

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" sx={{ cursor: 'pointer' }} onClick={() => navigate('/environments')}>Sandboxes</Link>
        <Typography color="text.primary">{env.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'rgba(124,92,255,0.15)', width: 52, height: 52, fontSize: 26 }}>{product?.icon}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4">{env.name}</Typography>
            <StatusChip status={env.status} />
            {env.drift && <Chip size="small" color="warning" variant="outlined" label="Drift" />}
          </Stack>
          <Typography color="text.secondary">{product?.name} · {env.region} · owner {env.owner}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={async () => { const nid = await cloneEnvironment(env.id); if (nid) navigate(`/environments/${nid}`) }}>Clone</Button>
          {env.status === 'running'
            ? <Button size="small" variant="outlined" startIcon={<PauseCircleOutlineRoundedIcon />} onClick={() => setEnvStatus(env.id, 'idle')}>Pause</Button>
            : env.status === 'idle'
              ? <Button size="small" variant="outlined" onClick={() => setEnvStatus(env.id, 'running')}>Resume</Button>
              : null}
          <Button size="small" variant="outlined" startIcon={<RestartAltRoundedIcon />} onClick={() => rollback(env.id)}>Rollback</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />}
            onClick={() => { deleteEnvironment(env.id); navigate('/environments') }}>Terminate</Button>
        </Stack>
      </Stack>

      {env.drift && (
        <Alert severity="warning" sx={{ mb: 2.5 }}
          action={<Button color="inherit" size="small" startIcon={<HealingRoundedIcon />} onClick={() => resolveDrift(env.id)}>Auto-remediate</Button>}>
          Configuration drift detected — a service deviates from its blueprint. CortexIE can reconcile automatically.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {[
          ['Health', `${env.health}%`], ['vCPU', env.cpu], ['Memory', `${env.memoryGb} GB`], ['Cost', `$${env.costPerDay}/day`],
        ].map(([k, v]) => (
          <Grid item xs={6} md={3} key={k}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary">{k}</Typography>
              <Typography variant="h5">{v}</Typography>
            </CardContent></Card>
          </Grid>
        ))}

        <Grid item xs={12} md={4}>
          <Card><CardContent sx={{ p: '16px !important' }}>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 'bold' }}>CPU utilization</Typography>
            <Box sx={{ height: 200, mt: 3.5 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuSeries}>
                  <defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c5cff" stopOpacity={0.5} /><stop offset="100%" stopColor="#7c5cff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                  <XAxis dataKey="t" stroke="#94a0bd" fontSize={11} interval={4} />
                  <YAxis domain={[0, 100]} stroke="#94a0bd" fontSize={11} />
                  <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke="#7c5cff" strokeWidth={2} fill="url(#c1)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent sx={{ p: '16px !important' }}>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 'bold' }}>Memory utilization</Typography>
            <Box sx={{ height: 200, mt: 3.5 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memSeries}>
                  <defs><linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19d3c5" stopOpacity={0.5} /><stop offset="100%" stopColor="#19d3c5" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                  <XAxis dataKey="t" stroke="#94a0bd" fontSize={11} interval={4} />
                  <YAxis domain={[0, 100]} stroke="#94a0bd" fontSize={11} />
                  <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke="#19d3c5" strokeWidth={2} fill="url(#m1)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <DependencyGraph env={env} />
        </Grid>

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Services & Processes</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service Name</TableCell>
                  <TableCell>PID</TableCell>
                  <TableCell>Port</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">CPU Usage</TableCell>
                  <TableCell align="right">Memory (MB)</TableCell>
                  <TableCell align="right">Endpoint</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {env.services.map((s) => (
                  <TableRow key={s.name} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{s.pid || '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{s.port || '—'}</TableCell>
                    <TableCell><StatusChip status={s.status} /></TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                      {s.status === 'healthy' || s.status === 'degraded' ? `${s.cpuPct || '0.1'}%` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                      {s.status === 'healthy' || s.status === 'degraded' ? `${s.memMB || '15'} MB` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {s.url ? (
                        <Button
                          size="small"
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ textTransform: 'none', fontSize: 12, py: 0 }}
                          endIcon={<LaunchRoundedIcon sx={{ width: 12, height: 12 }} />}
                        >
                          Visit Service UI
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12}>
          <TerminalLogs env={env} />
        </Grid>
      </Grid>
    </Box>
  )
}
