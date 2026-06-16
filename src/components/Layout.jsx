import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Avatar, Chip, Tooltip, Badge, Divider, useMediaQuery,
} from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import AddToQueueRoundedIcon from '@mui/icons-material/AddToQueueRounded'
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'
import LayersRoundedIcon from '@mui/icons-material/LayersRounded'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { useApp } from '../context/AppContext.jsx'

const DRAWER_WIDTH = 248

const NAV = [
  { to: '/', label: 'Dashboard', icon: <DashboardRoundedIcon /> },
  { to: '/create', label: 'Create Sandbox', icon: <AddToQueueRoundedIcon /> },
  { to: '/environments', label: 'Environments', icon: <DnsRoundedIcon /> },
  { to: '/templates', label: 'Blueprints', icon: <LayersRoundedIcon /> },
  { to: '/monitoring', label: 'Monitoring', icon: <MonitorHeartRoundedIcon /> },
  { to: '/cost', label: 'Cost Optimization', icon: <SavingsRoundedIcon /> },
  { to: '/access', label: 'Access Control', icon: <GroupRoundedIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
]

function Brand() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 2.5 }}>
      <Box
        sx={{
          width: 38, height: 38, borderRadius: 2,
          background: 'linear-gradient(135deg,#7c5cff,#19d3c5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 20, color: '#fff',
        }}
      >
        C
      </Box>
      <Box>
        <Typography variant="h6" sx={{ lineHeight: 1 }}>
          CortexIE
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sandbox Orchestration
        </Typography>
      </Box>
    </Box>
  )
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width:900px)')
  const navigate = useNavigate()
  const { environments, activities, settings } = useApp()
  const running = environments.filter((e) => e.status === 'running').length

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Brand />
      <Divider />
      <List sx={{ px: 1.5, py: 1, flex: 1 }}>
        {NAV.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 2, mb: 0.5,
              '&.active': {
                bgcolor: 'primary.main',
                color: '#fff',
                '& .MuiListItemIcon-root': { color: '#fff' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}>{item.label}</ListItemText>
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Chip
          size="small"
          label={settings.aiMode === 'claude' ? 'AI: Claude API' : 'AI: Rule-based'}
          color={settings.aiMode === 'claude' ? 'secondary' : 'default'}
          variant={settings.aiMode === 'claude' ? 'filled' : 'outlined'}
          sx={{ width: '100%', justifyContent: 'flex-start' }}
        />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'rgba(11,14,26,0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(148,160,189,0.12)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Chip size="small" color="success" variant="outlined" label={`${running} running`} />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Provision a new sandbox">
            <IconButton color="primary" onClick={() => navigate('/create')}>
              <AddRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Activity">
            <IconButton color="inherit">
              <Badge badgeContent={activities.length} color="error">
                <NotificationsNoneRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 14 }}>AR</Avatar>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid rgba(148,160,189,0.12)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  )
}
