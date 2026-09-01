import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Popover,
  Typography,
  IconButton,
  Badge,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FlagIcon from '@mui/icons-material/Flag';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNotificationCenter } from '../context/NotificationContext';
import { dayjs } from '../utils/helpers';

const TYPE_META = {
  plan: { label: 'Plan', icon: <EventNoteIcon fontSize="small" />, color: '#6366f1' },
  goal: { label: 'Goal', icon: <FlagIcon fontSize="small" />, color: '#8b5cf6' },
  inactivity: { label: 'Activity', icon: <HourglassEmptyIcon fontSize="small" />, color: '#f59e0b' },
};

const SEVERITY_COLOR = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    permission,
    panelOpen,
    setPanelOpen,
    toast,
    setToast,
    dismiss,
    dismissAll,
    requestPermission,
    handleAction,
  } = useNotificationCenter();

  const [anchorEl, setAnchorEl] = useState(null);
  const [tab, setTab] = useState('all');
  const buttonRef = useRef(null);

  useEffect(() => {
    if (panelOpen && buttonRef.current) {
      setAnchorEl(buttonRef.current);
    }
  }, [panelOpen]);

  const open = Boolean(anchorEl);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setPanelOpen(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPanelOpen(false);
  };

  const filtered =
    tab === 'all' ? notifications : notifications.filter((n) => n.type === tab);

  return (
    <>
      <Tooltip title={unreadCount ? `${unreadCount} reminder${unreadCount === 1 ? '' : 's'}` : 'Reminders'}>
        <IconButton ref={buttonRef} onClick={handleOpen} color={unreadCount ? 'primary' : 'default'}>
          <Badge badgeContent={unreadCount} color="error" max={9}>
            {permission === 'granted' ? <NotificationsActiveIcon /> : <NotificationsIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 380, maxWidth: '95vw', borderRadius: 3, mt: 1 },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Reminders
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Planned sessions, goals & inactivity alerts
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Tooltip title="Dismiss all">
              <IconButton size="small" onClick={dismissAll}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {permission !== 'granted' && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert
              severity="info"
              action={
                permission !== 'denied' ? (
                  <Button size="small" onClick={requestPermission}>
                    Enable
                  </Button>
                ) : null
              }
              sx={{ py: 0.5 }}
            >
              {permission === 'denied'
                ? 'Browser notifications are blocked. Reminders still appear here.'
                : 'Enable browser notifications for automatic alerts.'}
            </Alert>
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="all" label={`All (${notifications.length})`} sx={{ minHeight: 40, py: 0 }} />
          <Tab value="plan" label="Plans" sx={{ minHeight: 40, py: 0 }} />
          <Tab value="goal" label="Goals" sx={{ minHeight: 40, py: 0 }} />
          <Tab value="inactivity" label="Activity" sx={{ minHeight: 40, py: 0 }} />
        </Tabs>

        {filtered.length === 0 ? (
          <Box sx={{ py: 5, px: 3, textAlign: 'center' }}>
            <NotificationsActiveIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="body2" fontWeight={600}>
              You're all caught up!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              We'll remind you about planned times, goals, and inactivity.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {filtered.map((item, idx) => {
              const meta = TYPE_META[item.type] || TYPE_META.plan;
              return (
                <Box key={item.id}>
                  {idx > 0 && <Divider />}
                  <ListItemButton
                    alignItems="flex-start"
                    onClick={() => handleAction(item)}
                    sx={{ py: 1.5, pr: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5, color: meta.color }}>
                      {meta.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {item.title}
                          </Typography>
                          <Chip
                            label={meta.label}
                            size="small"
                            color={SEVERITY_COLOR[item.severity] || 'default'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {item.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {dayjs(item.timestamp).format('HH:mm')}
                            {item.actionLabel ? ` · ${item.actionLabel}` : ''}
                          </Typography>
                        </>
                      }
                    />
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(item.id);
                      }}
                      sx={{ mt: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </Box>
              );
            })}
          </List>
        )}
      </Popover>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={8000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            severity={toast.severity || 'warning'}
            onClose={() => setToast(null)}
            action={
              toast.actionPath ? (
                <Button color="inherit" size="small" onClick={() => handleAction(toast)}>
                  {toast.actionLabel || 'Open'}
                </Button>
              ) : null
            }
            sx={{ width: '100%', boxShadow: 4 }}
          >
            <strong>{toast.title}</strong> — {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
};

export default NotificationCenter;
