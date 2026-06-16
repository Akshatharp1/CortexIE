import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Avatar, Switch, Button, Tooltip,
} from '@mui/material'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import { useApp } from '../context/AppContext.jsx'

const PERMS = [
  ['create', 'Create env'],
  ['deleteEnv', 'Delete env'],
  ['manageUsers', 'Manage users'],
  ['viewCost', 'View cost'],
  ['approve', 'Approve requests'],
]

const ROLE_COLORS = { 'Platform Admin': 'secondary', Engineer: 'primary', QA: 'info', Viewer: 'default' }

export default function AccessControl() {
  const { users, roles, toggleUserStatus } = useApp()

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <GroupRoundedIcon color="primary" />
        <Typography variant="h4">Access Control</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Role-based access control governs who can create, manage, and approve sandbox environments.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card><CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Team members</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="center">Envs</TableCell>
                  <TableCell align="center">Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={u.role} color={ROLE_COLORS[u.role] || 'default'} variant={u.role === 'Viewer' ? 'outlined' : 'filled'} /></TableCell>
                    <TableCell><Typography variant="caption">{u.team}</Typography></TableCell>
                    <TableCell align="center">{u.envs}</TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={u.status === 'active'} onChange={() => toggleUserStatus(u.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card><CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <ShieldRoundedIcon color="secondary" fontSize="small" />
              <Typography variant="h6">Role permission matrix</Typography>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Permission</TableCell>
                  {roles.map((r) => (
                    <Tooltip key={r.name} title={r.name}>
                      <TableCell align="center" sx={{ px: 0.5 }}>
                        <Typography variant="caption" fontWeight={700}>{r.name.split(' ').map((w) => w[0]).join('')}</Typography>
                      </TableCell>
                    </Tooltip>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {PERMS.map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell><Typography variant="body2">{label}</Typography></TableCell>
                    {roles.map((r) => (
                      <TableCell key={r.name} align="center">
                        {r[key]
                          ? <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
                          : <CloseRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 2 }}>
              {roles.map((r) => (
                <Chip key={r.name} size="small" label={`${r.name.split(' ').map((w) => w[0]).join('')} = ${r.name}`} variant="outlined" />
              ))}
            </Stack>
            <Button fullWidth variant="outlined" sx={{ mt: 2 }}>Configure roles</Button>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  )
}
