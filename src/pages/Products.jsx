import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Stack, Button, Avatar, Divider,
} from '@mui/material'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS } from '../data/mockData.js'
import { generatePlanRuleBased } from '../ai/engine.js'

export default function Products() {
  const navigate = useNavigate()
  const { createEnvironment, environments } = useApp()

  const quickProvision = (p) => {
    const plan = generatePlanRuleBased({ productId: p.id })
    const id = createEnvironment(plan, `${p.id}-${Math.random().toString(36).slice(2, 6)}`)
    navigate(`/environments/${id}`)
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <CategoryRoundedIcon color="primary" />
        <Typography variant="h4">Products</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Available RealPage products inside the CortexIE Sandbox Orchestrator. Click "Provision" to launch a dedicated sandbox.
      </Typography>

      <Grid container spacing={2.5}>
        {PRODUCTS.map((p) => {
          const runningCount = environments.filter((e) => e.product === p.id && e.status === 'running').length
          return (
            <Grid item xs={12} md={6} lg={4} key={p.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                    <Avatar variant="rounded" sx={{ bgcolor: 'rgba(124,92,255,0.15)', width: 44, height: 44, fontSize: 22 }}>
                      {p.icon}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap variant="subtitle1">
                        {p.name}
                      </Typography>
                      <Chip size="small" label="Ready to provision" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {p.description}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">Services Included</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5, mb: 2 }}>
                    {p.services.map((s) => (
                      <Chip key={s} size="small" variant="outlined" label={s} sx={{ height: 20, fontSize: 10.5 }} />
                    ))}
                  </Stack>

                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">vCPU</Typography>
                      <Typography fontWeight={600}>{p.cpu}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Memory</Typography>
                      <Typography fontWeight={600}>{p.memoryGb}GB</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Running</Typography>
                      <Typography fontWeight={600} color="primary.main">{runningCount}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
                <Divider />
                <Box sx={{ p: 1.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<RocketLaunchRoundedIcon />}
                    onClick={() => quickProvision(p)}
                  >
                    Provision sandbox
                  </Button>
                </Box>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
