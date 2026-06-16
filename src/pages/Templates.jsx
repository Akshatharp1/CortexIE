import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Stack, Button, Avatar, Divider, LinearProgress,
} from '@mui/material'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import LayersRoundedIcon from '@mui/icons-material/LayersRounded'
import { useApp } from '../context/AppContext.jsx'
import { PRODUCTS } from '../data/mockData.js'
import { generatePlanRuleBased } from '../ai/engine.js'

export default function Templates() {
  const navigate = useNavigate()
  const { templates, createEnvironment } = useApp()

  const quickProvision = (t) => {
    const plan = generatePlanRuleBased({ productId: t.product, templateId: t.id })
    const id = createEnvironment(plan, `${t.product}-${Math.random().toString(36).slice(2, 6)}`)
    navigate(`/environments/${id}`)
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <LayersRoundedIcon color="primary" />
        <Typography variant="h4">Blueprints</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Reusable, standardized environment templates. One click to provision a production-like sandbox.
      </Typography>

      <Grid container spacing={2.5}>
        {templates.map((t) => {
          const product = PRODUCTS.find((p) => p.id === t.product)
          return (
            <Grid item xs={12} md={6} lg={4} key={t.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Avatar variant="rounded" sx={{ bgcolor: 'rgba(124,92,255,0.15)' }}>{product?.icon}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{t.name}</Typography>
                      <Chip size="small" label={t.tier} variant="outlined" />
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {t.description}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">Services</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5, mb: 1.5 }}>
                    {t.services.slice(0, 5).map((s) => <Chip key={s} size="small" variant="outlined" label={s} />)}
                  </Stack>

                  <Grid container spacing={1}>
                    <Grid item xs={4}><Typography variant="caption" color="text.secondary">vCPU</Typography><Typography fontWeight={600}>{t.cpu}</Typography></Grid>
                    <Grid item xs={4}><Typography variant="caption" color="text.secondary">Mem</Typography><Typography fontWeight={600}>{t.memoryGb}GB</Typography></Grid>
                    <Grid item xs={4}><Typography variant="caption" color="text.secondary">Cost</Typography><Typography fontWeight={600} color="warning.main">${t.estCostPerDay}</Typography></Grid>
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Popularity</Typography>
                      <Typography variant="caption">{t.popularity}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={t.popularity} sx={{ height: 5, borderRadius: 3, mt: 0.5 }} />
                  </Box>
                </CardContent>
                <Divider />
                <Box sx={{ p: 1.5 }}>
                  <Button fullWidth variant="contained" startIcon={<RocketLaunchRoundedIcon />} onClick={() => quickProvision(t)}>
                    Provision from blueprint
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
