import { useEffect, useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, LinearProgress, Alert, Button, Avatar,
} from '@mui/material'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend } from 'recharts'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import HealingRoundedIcon from '@mui/icons-material/HealingRounded'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS } from '../data/mockData.js'

const MAX_POINTS = 20

export default function Monitoring() {
  const { environments, resolveDrift, rollback } = useApp()
  const [series, setSeries] = useState([])

  const live = environments.filter((e) => e.status === 'running' || e.status === 'idle')
  const avgCpu = Math.round(live.reduce((s, e) => s + e.cpuUsage, 0) / Math.max(1, live.length))
  const avgMem = Math.round(live.reduce((s, e) => s + e.memUsage, 0) / Math.max(1, live.length))

  // Live-updating multi-series chart driven by the simulated metrics.
  useEffect(() => {
    setSeries((prev) => {
      const point = { t: new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }), cpu: avgCpu, mem: avgMem }
      return [...prev, point].slice(-MAX_POINTS)
    })
  }, [avgCpu, avgMem])

  const drifted = environments.filter((e) => e.drift)
  const unhealthy = environments.filter((e) => e.health < 60 && e.status !== 'provisioning')

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <MonitorHeartRoundedIcon color="primary" />
        <Typography variant="h4">Monitoring</Typography>
        <Chip size="small" color="success" icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />} label="Live" variant="outlined" />
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Real-time health, resource utilization, and AI-detected configuration drift across the fleet.
      </Typography>

      {(drifted.length > 0 || unhealthy.length > 0) && (
        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          {drifted.map((e) => (
            <Alert key={e.id} severity="warning" icon={<WarningAmberRoundedIcon />}
              action={<Button color="inherit" size="small" startIcon={<HealingRoundedIcon />} onClick={() => resolveDrift(e.id)}>Remediate</Button>}>
              <b>{e.name}</b> — configuration drift detected. Predicted root cause: blueprint version mismatch.
            </Alert>
          ))}
          {unhealthy.map((e) => (
            <Alert key={e.id} severity="error"
              action={<Button color="inherit" size="small" onClick={() => rollback(e.id)}>Rollback</Button>}>
              <b>{e.name}</b> — health {e.health}%. One or more services unhealthy.
            </Alert>
          ))}
        </Stack>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card><CardContent>
            <Typography variant="h6">Fleet resource utilization (live)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Average CPU & memory across active sandboxes · refreshes every 3s</Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                  <XAxis dataKey="t" stroke="#94a0bd" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a0bd" fontSize={11} />
                  <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#7c5cff" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="mem" name="Memory %" stroke="#19d3c5" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={2.5}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary">Avg CPU</Typography>
              <Typography variant="h4" color="primary.main">{avgCpu}%</Typography>
              <LinearProgress variant="determinate" value={avgCpu} sx={{ height: 6, borderRadius: 3, mt: 1 }} />
            </CardContent></Card>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary">Avg Memory</Typography>
              <Typography variant="h4" color="secondary.main">{avgMem}%</Typography>
              <LinearProgress variant="determinate" value={avgMem} color="secondary" sx={{ height: 6, borderRadius: 3, mt: 1 }} />
            </CardContent></Card>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary">Drift / health alerts</Typography>
              <Typography variant="h4" color={drifted.length + unhealthy.length ? 'warning.main' : 'success.main'}>
                {drifted.length + unhealthy.length}
              </Typography>
            </CardContent></Card>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Sandbox health matrix</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sandbox</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Health</TableCell>
                  <TableCell>CPU</TableCell>
                  <TableCell>Memory</TableCell>
                  <TableCell>Drift</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {environments.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: 'rgba(124,92,255,0.15)', fontSize: 14 }}>
                          {PRODUCTS.find((p) => p.id === e.product)?.icon}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={e.status} variant="outlined" /></TableCell>
                    <TableCell sx={{ width: 130 }}>
                      <LinearProgress variant="determinate" value={e.health}
                        color={e.health > 80 ? 'success' : e.health > 50 ? 'warning' : 'error'} sx={{ height: 6, borderRadius: 3 }} />
                    </TableCell>
                    <TableCell>{e.cpuUsage}%</TableCell>
                    <TableCell>{e.memUsage}%</TableCell>
                    <TableCell>{e.drift ? <Chip size="small" color="warning" label="Drift" /> : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
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
