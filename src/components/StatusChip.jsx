import { Chip } from '@mui/material'

const MAP = {
  running: { color: 'success', label: 'Running' },
  healthy: { color: 'success', label: 'Healthy' },
  provisioning: { color: 'info', label: 'Provisioning' },
  pending: { color: 'default', label: 'Pending' },
  idle: { color: 'warning', label: 'Idle' },
  degraded: { color: 'warning', label: 'Degraded' },
  error: { color: 'error', label: 'Error' },
  unhealthy: { color: 'error', label: 'Unhealthy' },
}

export default function StatusChip({ status, size = 'small' }) {
  const cfg = MAP[status] || { color: 'default', label: status }
  return (
    <Chip
      size={size}
      color={cfg.color}
      variant={cfg.color === 'default' ? 'outlined' : 'filled'}
      label={cfg.label}
      sx={{ borderRadius: 1.5 }}
    />
  )
}
