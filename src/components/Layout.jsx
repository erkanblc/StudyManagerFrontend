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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TimerIcon from '@mui/icons-material/Timer';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AppLogo from './AppLogo';
import NotificationCenter from './NotificationCenter';
import LoginGapSnackbar from './LoginGapSnackbar';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../utils/roles';

const DRAWER_WIDTH = 240;

const roleLabel = (role) => getRoleLabel(role) || 'User';

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Goals', path: '/goals', icon: <FlagIcon /> },
  { label: '6-Month Plan', path: '/six-month-plan', icon: <CalendarMonthIcon /> },
  { label: 'Monthly Plan', path: '/monthly-plan', icon: <ViewWeekIcon /> },
  { label: 'Planning', path: '/planning', icon: <EventNoteIcon /> },
  { label: 'Study Timer', path: '/timer', icon: <TimerIcon /> },
  { label: 'Study History', path: '/study-history', icon: <HistoryIcon /> },
  { label: 'Progress', path: '/progress', icon: <BarChartIcon /> },
];

const Layout = ({ children }) => {
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

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        onClick={() => handleNavigation('/')}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNavigation('/');
          }
        }}
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <AppLogo size={36} sx={{ borderRadius: 1 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
            Study Manager
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Learning Time Tracker
          </Typography>
        </Box>
      </Box>

      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: active ? 'primary.main' : 'transparent',
                  color: active ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: active ? 'primary.dark' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: active ? 'white' : 'text.secondary',
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
        <Typography variant="caption" color="text.secondary">
          {roleLabel(user?.roles?.[0])}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
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
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
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
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
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
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
              {navItems.find((n) => n.path === location.pathname)?.label || 'Study Manager'}
            </Typography>

            <NotificationCenter />

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
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
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Box>

        <LoginGapSnackbar />
      </Box>
    </Box>
  );
};

export default Layout;
