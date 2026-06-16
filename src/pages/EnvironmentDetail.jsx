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
import StatusChip from '../components/StatusChip.jsx'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS, buildTimeSeries } from '../data/mockData.js'

export default function EnvironmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { environments, cloneEnvironment, deleteEnvironment, rollback, resolveDrift, setEnvStatus } = useApp()
  const env = environments.find((e) => e.id === id)

  if (!env) {
    return (
      <Box>
        <Typography variant="h5">Environment not found</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/environments')}>Back to environments</Button>
      </Box>
    )
  }

  const product = PRODUCTS.find((p) => p.id === env.product)
  const cpuSeries = buildTimeSeries(env.cpuUsage || 30, 4)
  const memSeries = buildTimeSeries(env.memUsage || 40, 4)

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" sx={{ cursor: 'pointer' }} onClick={() => navigate('/environments')}>Environments</Link>
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
          <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => { const nid = cloneEnvironment(env.id); if (nid) navigate(`/environments/${nid}`) }}>Clone</Button>
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

        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6">CPU utilization</Typography>
            <Box sx={{ height: 200 }}>
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
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6">Memory utilization</Typography>
            <Box sx={{ height: 200 }}>
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

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Services</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Health</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {env.services.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.name}</TableCell>
                    <TableCell><StatusChip status={s.status} /></TableCell>
                    <TableCell align="right" sx={{ width: 200 }}>
                      <LinearProgress variant="determinate"
                        value={s.status === 'healthy' ? 100 : s.status === 'degraded' ? 55 : s.status === 'unhealthy' ? 20 : s.status === 'idle' ? 70 : 0}
                        color={s.status === 'healthy' ? 'success' : s.status === 'degraded' || s.status === 'idle' ? 'warning' : s.status === 'pending' ? 'info' : 'error'}
                        sx={{ height: 6, borderRadius: 3 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  )
}
