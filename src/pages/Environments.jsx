import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Stack, Chip, IconButton,
  Avatar, LinearProgress, Tooltip, InputAdornment, Menu, MenuItem as MenuItemMUI, Button,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import StatusChip from '../components/StatusChip.jsx'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS } from '../data/mockData.js'

export default function Environments() {
  const navigate = useNavigate()
  const { environments, cloneEnvironment, deleteEnvironment, rollback } = useApp()
  const [q, setQ] = useState('')
  const [product, setProduct] = useState('all')
  const [status, setStatus] = useState('all')
  const [menu, setMenu] = useState({ anchor: null, id: null })

  const filtered = environments.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase()) && !e.owner.toLowerCase().includes(q.toLowerCase())) return false
    if (product !== 'all' && e.product !== product) return false
    if (status !== 'all' && e.status !== status) return false
    return true
  })

  const openMenu = (e, id) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, id }) }
  const closeMenu = () => setMenu({ anchor: null, id: null })

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Environments</Typography>
          <Typography color="text.secondary">{filtered.length} of {environments.length} sandboxes</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/create')}>New Sandbox</Button>
      </Stack>

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={6}>
              <TextField fullWidth size="small" placeholder="Search by name or owner" value={q}
                onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={3} md={3}>
              <TextField fullWidth size="small" select label="Product" value={product} onChange={(e) => setProduct(e.target.value)}>
                <MenuItem value="all">All products</MenuItem>
                {PRODUCTS.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={3}>
              <TextField fullWidth size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['all', 'running', 'provisioning', 'idle', 'error'].map((s) => (
                  <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {filtered.map((e) => {
          const product = PRODUCTS.find((p) => p.id === e.product)
          return (
            <Grid item xs={12} sm={6} lg={4} key={e.id}>
              <Card sx={{ height: '100%', cursor: 'pointer', transition: '0.15s', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/environments/${e.id}`)}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar variant="rounded" sx={{ bgcolor: 'rgba(124,92,255,0.15)' }}>{product?.icon || '📦'}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap fontWeight={700}>{e.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{product?.name}</Typography>
                    </Box>
                    <IconButton size="small" onClick={(ev) => openMenu(ev, e.id)}><MoreVertRoundedIcon fontSize="small" /></IconButton>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                    <StatusChip status={e.status} />
                    {e.drift && (
                      <Tooltip title="Configuration drift detected">
                        <Chip size="small" color="warning" variant="outlined" icon={<WarningAmberRoundedIcon />} label="Drift" />
                      </Tooltip>
                    )}
                  </Stack>

                  {e.status === 'provisioning' ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">Provisioning…</Typography>
                      <LinearProgress sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
                    </Box>
                  ) : (
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">CPU {e.cpuUsage}%</Typography>
                        <LinearProgress variant="determinate" value={e.cpuUsage} sx={{ height: 5, borderRadius: 3 }} />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Mem {e.memUsage}%</Typography>
                        <LinearProgress variant="determinate" value={e.memUsage} color="secondary" sx={{ height: 5, borderRadius: 3 }} />
                      </Grid>
                    </Grid>
                  )}

                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">{e.region}</Typography>
                    <Typography variant="caption" color="warning.main">${e.costPerDay}/day</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={closeMenu}>
        <MenuItemMUI onClick={() => { cloneEnvironment(menu.id); closeMenu() }}>
          <ContentCopyRoundedIcon fontSize="small" style={{ marginRight: 8 }} /> Clone
        </MenuItemMUI>
        <MenuItemMUI onClick={() => { rollback(menu.id); closeMenu() }}>
          <RestartAltRoundedIcon fontSize="small" style={{ marginRight: 8 }} /> Rollback to snapshot
        </MenuItemMUI>
        <MenuItemMUI onClick={() => { deleteEnvironment(menu.id); closeMenu() }} sx={{ color: 'error.main' }}>
          <DeleteOutlineRoundedIcon fontSize="small" style={{ marginRight: 8 }} /> Terminate
        </MenuItemMUI>
      </Menu>
    </Box>
  )
}
