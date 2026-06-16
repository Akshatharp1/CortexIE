import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Button, Alert, Avatar, LinearProgress, Divider,
} from '@mui/material'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import AutoDeleteRoundedIcon from '@mui/icons-material/AutoDeleteRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded'
import StatCard from '../components/StatCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS } from '../data/mockData.js'

export default function CostOptimization() {
  const { environments, setEnvStatus, deleteEnvironment } = useApp()

  const active = environments.filter((e) => e.status !== 'provisioning')
  const totalDay = active.reduce((s, e) => s + e.costPerDay, 0)
  const totalMonth = totalDay * 30

  // Idle / low-utilization environments are optimization candidates.
  const idleCandidates = active.filter((e) => e.status === 'idle' || e.cpuUsage < 10)
  const potentialSavings = idleCandidates.reduce((s, e) => s + e.costPerDay, 0)

  const byProduct = PRODUCTS.map((p) => ({
    name: p.name.split(' ')[0],
    cost: active.filter((e) => e.product === p.id).reduce((s, e) => s + e.costPerDay, 0),
  })).filter((d) => d.cost > 0)

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <SavingsRoundedIcon color="primary" />
        <Typography variant="h4">Cost Optimization</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Intelligent resource allocation, idle detection, and one-click cleanup recommendations.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={4}>
          <StatCard icon={<SavingsRoundedIcon />} label="Current spend / day" value={`$${totalDay.toFixed(0)}`} sub={`$${totalMonth.toFixed(0)}/mo projected`} color="warning" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={<TrendingDownRoundedIcon />} label="Potential savings / day" value={`$${potentialSavings.toFixed(0)}`} sub={`${idleCandidates.length} idle candidates`} color="success" trend={-Math.round((potentialSavings / Math.max(1, totalDay)) * 100)} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={<AutoDeleteRoundedIcon />} label="Auto-cleanup policy" value="72h" sub="idle environments reaped" color="info" />
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Typography variant="h6">Spend by product (per day)</Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProduct} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                  <XAxis type="number" stroke="#94a0bd" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#94a0bd" fontSize={12} width={80} />
                  <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} formatter={(v) => [`$${v.toFixed(1)}/day`, 'Cost']} />
                  <Bar dataKey="cost" fill="#ffb547" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>AI recommendations</Typography>
            {idleCandidates.length === 0 ? (
              <Alert severity="success">Fleet is well-utilized — no idle environments detected.</Alert>
            ) : (
              <Stack spacing={1.5}>
                {idleCandidates.map((e) => (
                  <Alert key={e.id} severity="info" icon={<PauseCircleOutlineRoundedIcon />}
                    action={
                      <Stack direction="row" spacing={0.5}>
                        {e.status !== 'idle' && <Button size="small" color="inherit" onClick={() => setEnvStatus(e.id, 'idle')}>Pause</Button>}
                        <Button size="small" color="inherit" onClick={() => deleteEnvironment(e.id)}>Reap</Button>
                      </Stack>
                    }>
                    <b>{e.name}</b> — {e.cpuUsage}% CPU. Save <b>${e.costPerDay}/day</b>.
                  </Alert>
                ))}
              </Stack>
            )}
          </CardContent></Card>
        </Grid>

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Cost breakdown</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Environment</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Utilization</TableCell>
                  <TableCell align="right">$/day</TableCell>
                  <TableCell align="right">$/mo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {active.sort((a, b) => b.costPerDay - a.costPerDay).map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{e.owner}</Typography></TableCell>
                    <TableCell><StatusChip status={e.status} /></TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      <LinearProgress variant="determinate" value={e.cpuUsage} color={e.cpuUsage < 10 ? 'error' : e.cpuUsage < 40 ? 'warning' : 'success'} sx={{ height: 6, borderRadius: 3 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 600 }}>${e.costPerDay}</TableCell>
                    <TableCell align="right">${(e.costPerDay * 30).toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="flex-end" spacing={3}>
              <Typography color="text.secondary">Total</Typography>
              <Typography fontWeight={700} color="warning.main">${totalDay.toFixed(1)}/day</Typography>
              <Typography fontWeight={700}>${totalMonth.toFixed(0)}/mo</Typography>
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  )
}
