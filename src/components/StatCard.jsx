import { Card, CardContent, Box, Typography, Avatar } from '@mui/material'

export default function StatCard({ icon, label, value, sub, color = 'primary', trend }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: (t) => `${t.palette[color].main}22`,
              color: (t) => t.palette[color].main,
              width: 44,
              height: 44,
            }}
          >
            {icon}
          </Avatar>
          {trend != null && (
            <Typography variant="caption" sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </Typography>
          )}
        </Box>
        <Typography variant="h4" sx={{ mt: 2 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
