import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, Stepper, Step, StepLabel, Button, Grid, TextField,
  MenuItem, ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Stack, Chip, Divider,
  CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText, LinearProgress, Paper,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded'
import { useApp } from '../context/AppContext.jsx'
import {
  REGIONS, TEMPLATES, PROVISION_STEPS,
  STORAGE_CLASSES, LOFT_PRODUCTS, GLOBAL_PIPELINE_VERSION,
} from '../data/mockData.js'
import { generatePlan } from '../ai/engine.js'

const STEPS = ['Describe', 'Configure', 'AI Plan', 'Provision']

const SAMPLE_PROMPTS = [
  'Spin up a full production-like OneSite environment with billing for a hotfix test',
  'Lightweight LeaseStar sandbox for UI regression QA',
  'AIRM ML pipeline with GPU workers for Q3 model evaluation',
  'Secure resident screening environment with PII masking and SOC2 audit logging',
]

export default function CreateSandbox() {
  const navigate = useNavigate()
  const { createEnvironment, environments, settings } = useApp()

  const [active, setActive] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [productId, setProductId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [region, setRegion] = useState(REGIONS[0])
  const [storageClass, setStorageClass] = useState(STORAGE_CLASSES[0])
  const [loftProduct, setLoftProduct] = useState(LOFT_PRODUCTS[0])
  const [branchMode, setBranchMode] = useState('global') // 'global' | 'custom'
  const [provisioningId, setProvisioningId] = useState(null)
  const [branchName, setBranchName] = useState('')
  const [options, setOptions] = useState({ seedData: true, observability: true, piiMasking: false })

  // The branch the pipeline builds from: the typed name, or the global version tag.
  const pipelineBranch =
    branchMode === 'custom' && branchName.trim() ? branchName.trim() : GLOBAL_PIPELINE_VERSION

  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)

  const availableTemplates = productId ? TEMPLATES.filter((t) => t.product === productId) : TEMPLATES

  const runPlanner = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generatePlan({ prompt, productId, templateId, region, options }, settings)
      result.storageClass = storageClass
      result.loftProduct = loftProduct
      result.pipelineBranch = pipelineBranch
      setPlan(result)
      if (!name) setName(`${result.product}-${Math.random().toString(36).slice(2, 6)}`)
      setActive(2)
    } catch (e) {
      setError(e?.message || 'Planning failed')
    } finally {
      setLoading(false)
    }
  }

  const provision = async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await createEnvironment(plan, name)
      setProvisioningId(id)
      setActive(3)
    } catch (e) {
      setError(e?.message || 'Provisioning failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4">Create Sandbox</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Describe what you need — CortexIE resolves dependencies, sizes infrastructure, and provisions a ready-to-use sandbox.
      </Typography>

      <Stepper activeStep={active} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((s) => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* STEP 0 — Describe */}
      {active === 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AutoAwesomeRoundedIcon color="secondary" />
              <Typography variant="h6">Describe your sandbox</Typography>
              <Chip size="small" label={settings.aiMode === 'claude' ? 'Claude API' : 'Rule-based AI'}
                color={settings.aiMode === 'claude' ? 'secondary' : 'default'} variant="outlined" />
            </Stack>
            <TextField
              fullWidth multiline minRows={3}
              placeholder="e.g. Full production-like OneSite sandbox with billing for a hotfix test in East US"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              Try one of these:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              {SAMPLE_PROMPTS.map((p) => (
                <Chip key={p} label={p} variant="outlined" onClick={() => setPrompt(p)} sx={{ maxWidth: '100%' }} />
              ))}
            </Stack>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="contained" onClick={() => setActive(1)} disabled={!prompt.trim()}>
                Next: Configure
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* STEP 1 — Configure */}
      {active === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Configuration & dependencies</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Blueprint (optional)" value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}>
                  <MenuItem value=""><em>Best match</em></MenuItem>
                  {availableTemplates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name} · {t.tier}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
                  {REGIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Sandbox name (optional)" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="auto-generated" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Product" value={loftProduct}
                  onChange={(e) => setLoftProduct(e.target.value)}>
                  {LOFT_PRODUCTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Storage class" value={storageClass}
                  onChange={(e) => setStorageClass(e.target.value)}>
                  {STORAGE_CLASSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ mb: 1 }}><Chip size="small" label="Pipeline branch" /></Divider>
                <ToggleButtonGroup exclusive size="small" value={branchMode}
                  onChange={(e, v) => v && setBranchMode(v)} sx={{ mb: 1.5 }}>
                  <ToggleButton value="global">Use global tag · {GLOBAL_PIPELINE_VERSION}</ToggleButton>
                  <ToggleButton value="custom">Name a branch</ToggleButton>
                </ToggleButtonGroup>
                {branchMode === 'custom' ? (
                  <TextField fullWidth label="Pipeline branch name" value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. feature/billing-hotfix"
                    helperText="Leave blank to fall back to the global pipeline version tag." />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    The sandbox will build from the global pipeline version tag <strong>{GLOBAL_PIPELINE_VERSION}</strong>.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ mb: 1 }}><Chip size="small" label="Add-ons" /></Divider>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  <FormControlLabel control={<Switch checked={options.seedData}
                    onChange={(e) => setOptions({ ...options, seedData: e.target.checked })} />} label="Seed sample data" />
                  <FormControlLabel control={<Switch checked={options.observability}
                    onChange={(e) => setOptions({ ...options, observability: e.target.checked })} />} label="Observability stack" />
                  <FormControlLabel control={<Switch checked={options.piiMasking}
                    onChange={(e) => setOptions({ ...options, piiMasking: e.target.checked })} />} label="PII masking / hardened" />
                </Stack>
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
              <Button onClick={() => setActive(0)}>Back</Button>
              <Button variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                onClick={runPlanner} disabled={loading}>
                {loading ? 'Analyzing…' : 'Generate AI Plan'}
              </Button>
            </Stack>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — AI Plan */}
      {active === 2 && plan && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <AutoAwesomeRoundedIcon color="secondary" />
                  <Typography variant="h6">AI-generated provisioning plan</Typography>
                </Stack>
                <Chip size="small" label={plan.source} variant="outlined" sx={{ mb: 2 }} />
                <Alert severity="info" icon={<MemoryRoundedIcon />} sx={{ mb: 2 }}>{plan.rationale}</Alert>

                <Typography variant="subtitle2" color="text.secondary">Services</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2, mt: 0.5 }}>
                  {plan.services.map((s) => <Chip key={s} size="small" label={s} color="primary" variant="outlined" />)}
                </Stack>

                <Typography variant="subtitle2" color="text.secondary">Resolved dependencies</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2, mt: 0.5 }}>
                  {plan.dependencies.map((d) => <Chip key={d} size="small" label={d} color="secondary" variant="outlined" />)}
                </Stack>

                {plan.securityNotes?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Security & compliance</Typography>
                    <List dense>
                      {plan.securityNotes.map((n) => (
                        <ListItem key={n} disableGutters>
                          <ListItemIcon sx={{ minWidth: 30 }}><CheckCircleRoundedIcon color="success" fontSize="small" /></ListItemIcon>
                          <ListItemText primary={n} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ mb: 2.5 }}>
              <CardContent>
                <Typography variant="h6">Resource footprint</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  {[
                    ['vCPU', plan.cpu], ['Memory', `${plan.memoryGb} GB`],
                    ['Storage', `${plan.storageGb} GB`], ['Tier', plan.tier],
                  ].map(([k, v]) => (
                    <Grid item xs={6} key={k}>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                        <Typography variant="caption" color="text.secondary">{k}</Typography>
                        <Typography variant="h6">{v}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Product</Typography>
                    <Typography>{plan.loftProduct}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Storage class</Typography>
                    <Chip size="small" label={plan.storageClass} variant="outlined" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Pipeline branch</Typography>
                    <Chip size="small" label={plan.pipelineBranch} color="secondary" variant="outlined" />
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Estimated cost</Typography>
                  <Typography variant="h6" color="warning.main">${plan.estCostPerDay}/day</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">Region: {plan.region}</Typography>
              </CardContent>
            </Card>
            <Stack direction="row" spacing={1.5}>
              <Button fullWidth onClick={() => setActive(1)}>Adjust</Button>
              <Button fullWidth variant="contained" startIcon={<RocketLaunchRoundedIcon />} onClick={provision}>
                Provision
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* STEP 3 — Provision */}
      {active === 3 && plan && (() => {
        const currentEnv = environments.find((e) => e.id === provisioningId)
        const isReady = currentEnv?.status === 'running'
        return (
          <Card>
            <CardContent>
              <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
                <RocketLaunchRoundedIcon color={isReady ? 'success' : 'primary'} sx={{ fontSize: 56, animation: isReady ? 'none' : 'pulse 2s infinite' }} />
                <Typography variant="h5">
                  {isReady ? `“${name || currentEnv?.name}” is Ready!` : `Provisioning “${name || currentEnv?.name}”`}
                </Typography>
                <Typography color="text.secondary" align="center" sx={{ maxW: 560 }}>
                  {isReady
                    ? 'CortexIE has successfully provisioned all containerized microservices and verification health checks have passed.'
                    : 'CortexIE is orchestrating your sandbox. This continues in the background.'}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
                  <Chip size="small" label={plan.loftProduct} variant="outlined" />
                  <Chip size="small" label={`storage: ${plan.storageClass}`} variant="outlined" />
                  <Chip size="small" color="secondary" label={`branch: ${plan.pipelineBranch}`} variant="outlined" />
                </Stack>
                <Box sx={{ width: '100%', maxWidth: 520, mt: 1 }}>
                  <List>
                    {PROVISION_STEPS.map((s, i) => {
                      const stepStatus = currentEnv
                        ? i < currentEnv.provisionStep
                          ? 'completed'
                          : i === currentEnv.provisionStep
                            ? 'active'
                            : 'pending'
                        : 'pending'
                      return (
                        <ListItem key={s} disableGutters sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 34 }}>
                            {stepStatus === 'completed' ? (
                              <CheckCircleRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
                            ) : stepStatus === 'active' ? (
                              <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                            ) : (
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(148, 160, 189, 0.3)', ml: 0.25 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={s}
                            primaryTypographyProps={{
                              fontWeight: stepStatus === 'active' ? 700 : 500,
                              color: stepStatus === 'pending' ? 'text.secondary' : 'text.primary',
                              fontSize: 14,
                            }}
                          />
                        </ListItem>
                      )
                    })}
                  </List>
                  {isReady ? (
                    <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                      <strong>Real-time deployment verified:</strong> 100% services online and routing.
                    </Alert>
                  ) : (
                    <LinearProgress sx={{ borderRadius: 3, height: 8, mt: 2 }} />
                  )}
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  {isReady && currentEnv && (
                    <Button variant="contained" color="success" onClick={() => navigate(`/environments/${currentEnv.id}`)}>
                      Launch Sandbox Detail
                    </Button>
                  )}
                  <Button variant="outlined" onClick={() => navigate('/environments')}>View sandboxes</Button>
                  <Button variant="contained" onClick={() => navigate('/monitoring')}>Open monitoring</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )
      })()}
    </Box>
  )
}
