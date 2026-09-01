import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShieldIcon from '@mui/icons-material/Shield';
import FlagIcon from '@mui/icons-material/Flag';
import HistoryIcon from '@mui/icons-material/History';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AppLogo from './AppLogo';
import AdminPendingSnackbar from './AdminPendingSnackbar';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 250;

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Roles', path: '/admin/roles', icon: <ShieldIcon /> },
  { label: 'User Goals', path: '/admin/goals', icon: <FlagIcon /> },
  { label: 'Login History', path: '/admin/login-history', icon: <HistoryIcon /> },
  { label: 'Admin Approvals', path: '/admin/approvals', icon: <HowToRegIcon /> },
  { label: 'Platform Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

const AdminLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  const currentPage = navItems.find((n) => n.path === location.pathname)?.label || 'Admin';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        onClick={() => handleNavigation('/admin')}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNavigation('/admin');
          }
        }}
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <AppLogo size={36} sx={{ borderRadius: 1 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
            Admin Panel
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Study Manager
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: active ? '#1e293b' : 'transparent',
                  color: active ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: active ? '#0f172a' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: active ? '#f59e0b' : 'text.secondary',
                    minWidth: 40,
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { style: { fontSize: 14, fontWeight: active ? 600 : 400 } } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Signed in as
        </Typography>
        <Typography variant="body2" fontWeight={500} noWrap>
          {user?.email}
        </Typography>
        <Chip label="Administrator" size="small" color="warning" sx={{ mt: 0.5, fontSize: 10 }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {currentPage}
              </Typography>
            </Box>
            <Chip
              label="Admin Mode"
              size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, mr: 1 }}
            />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: '#1e293b',
                  fontSize: 14,
                }}
              >
                {user?.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  logout();
                  navigate('/login');
                  setAnchorEl(null);
                }}
              >
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
        <AdminPendingSnackbar />
      </Box>
    </Box>
  );
};

export default AdminLayout;
