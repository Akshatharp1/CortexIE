import { useNavigate } from 'react-router-dom'
import {
  Grid, Card, CardContent, Typography, Box, Button, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, Chip, Stack, LinearProgress, Divider,
} from '@mui/material'
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import StatCard from '../components/StatCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS, buildTimeSeries } from '../data/mockData.js'

const PIE_COLORS = ['#7c5cff', '#19d3c5', '#3ddc97', '#ffb547', '#4aa8ff', '#ff5d6c']
const provisionSeries = buildTimeSeries(45, 6).map((d, i) => ({ ...d, value: 4 + (i % 6) }))

export default function Dashboard() {
  const navigate = useNavigate()
  const { environments, activities } = useApp()

  const running = environments.filter((e) => e.status === 'running').length
  const totalCost = environments.reduce((s, e) => s + (e.status === 'provisioning' ? 0 : e.costPerDay), 0)
  const avgHealth = Math.round(
    environments.filter((e) => e.status !== 'provisioning').reduce((s, e) => s + e.health, 0) /
      Math.max(1, environments.filter((e) => e.status !== 'provisioning').length),
  )
  const driftCount = environments.filter((e) => e.drift).length

  const byProduct = PRODUCTS.map((p) => ({
    name: p.name.split(' ')[0],
    value: environments.filter((e) => e.product === p.id).length,
  })).filter((d) => d.value > 0)

  const healthSeries = buildTimeSeries(avgHealth, 3)

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4">Welcome back, Akshatha</Typography>
          <Typography color="text.secondary">
            Environment-as-a-Service control center · Integrated Environments
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/create')}>
          New Sandbox
        </Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<DnsRoundedIcon />} label="Active environments" value={running} sub={`${environments.length} total`} trend={12} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<SpeedRoundedIcon />} label="Avg. fleet health" value={`${avgHealth}%`} color="success" sub={`${driftCount} drift alerts`} trend={3} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<SavingsRoundedIcon />} label="Spend / day" value={`$${totalCost.toFixed(0)}`} color="warning" sub="≈ $/mo projected" trend={-8} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<BoltRoundedIcon />} label="Avg. provision time" value="4.2 min" color="info" sub="was ~6 hrs manually" trend={-31} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Fleet health (24h)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Aggregate health score across all sandboxes
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthSeries}>
                    <defs>
                      <linearGradient id="h" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3ddc97" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3ddc97" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                    <XAxis dataKey="t" stroke="#94a0bd" fontSize={12} interval={3} />
                    <YAxis domain={[0, 100]} stroke="#94a0bd" fontSize={12} />
                    <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="#3ddc97" strokeWidth={2} fill="url(#h)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">By product</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Environment distribution
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byProduct} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {byProduct.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" flexWrap="wrap" gap={0.5} justifyContent="center">
                {byProduct.map((d, i) => (
                  <Chip key={d.name} size="small" variant="outlined" label={`${d.name} ${d.value}`}
                    sx={{ borderColor: PIE_COLORS[i % PIE_COLORS.length], color: PIE_COLORS[i % PIE_COLORS.length] }} />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Recent environments</Typography>
                <Button size="small" onClick={() => navigate('/environments')}>View all</Button>
              </Stack>
              <Box sx={{ mt: 1 }}>
                {environments.slice(0, 5).map((e) => (
                  <Box key={e.id}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.25, cursor: 'pointer' }}
                      onClick={() => navigate(`/environments/${e.id}`)}>
                      <Avatar variant="rounded" sx={{ bgcolor: 'rgba(124,92,255,0.15)' }}>
                        {PRODUCTS.find((p) => p.id === e.product)?.icon || '📦'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap fontWeight={600}>{e.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.region} · {e.owner}</Typography>
                      </Box>
                      <Box sx={{ width: 90, display: { xs: 'none', sm: 'block' } }}>
                        <Typography variant="caption" color="text.secondary">Health {e.health}%</Typography>
                        <LinearProgress variant="determinate" value={e.health}
                          color={e.health > 80 ? 'success' : e.health > 50 ? 'warning' : 'error'}
                          sx={{ height: 6, borderRadius: 3 }} />
                      </Box>
                      <StatusChip status={e.status} />
                    </Stack>
                    <Divider />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Activity feed</Typography>
              <List dense>
                {activities.slice(0, 6).map((a) => (
                  <ListItem key={a.id} disableGutters>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor:
                        a.kind === 'success' ? 'success.main' : a.kind === 'warning' ? 'warning.main' : a.kind === 'error' ? 'error.main' : 'info.main' }}>
                        {' '}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={a.text} secondary={a.t}
                      primaryTypographyProps={{ fontSize: 13.5 }} secondaryTypographyProps={{ fontSize: 11.5 }} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Provisioning throughput (24h)</Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={provisionSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,160,189,0.12)" />
                    <XAxis dataKey="t" stroke="#94a0bd" fontSize={12} interval={3} />
                    <YAxis stroke="#94a0bd" fontSize={12} />
                    <RTooltip contentStyle={{ background: '#141a2e', border: '1px solid rgba(148,160,189,0.2)', borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#7c5cff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
