import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FlagIcon from '@mui/icons-material/Flag';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useNotificationCenter } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const AUTO_HIDE_MS = 5000;

const TYPE_ICON = {
  plan: EventNoteIcon,
  goal: FlagIcon,
  inactivity: HourglassEmptyIcon,
};

const SEVERITY_STYLE = {
  error: { border: '#fecaca', bg: '#fef2f2', color: '#dc2626' },
  warning: { border: '#fde68a', bg: '#fffbeb', color: '#d97706' },
  info: { border: '#c7d2fe', bg: '#eef2ff', color: '#4f46e5' },
};

const RemindersCard = () => {
  const { showRemindersBriefly, clearRemindersBriefly } = useAuth();
  const {
    notifications,
    unreadCount,
    daysSinceStudy,
    todayStudyMinutes,
    upcomingPlans,
    setPanelOpen,
    handleAction,
    dismiss,
    permission,
    requestPermission,
  } = useNotificationCenter();

  const [expanded, setExpanded] = useState(false);
  const hideTimerRef = useRef(null);

  const hideCard = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setExpanded(false);
    clearRemindersBriefly();
  }, [clearRemindersBriefly]);

  useEffect(() => {
    if (!showRemindersBriefly || unreadCount === 0) return;

    setExpanded(true);
    hideTimerRef.current = setTimeout(hideCard, AUTO_HIDE_MS);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [showRemindersBriefly, unreadCount, hideCard]);

  useEffect(() => {
    if (!showRemindersBriefly || unreadCount > 0) return;
    const timer = setTimeout(clearRemindersBriefly, 3000);
    return () => clearTimeout(timer);
  }, [showRemindersBriefly, unreadCount, clearRemindersBriefly]);

  const topReminders = notifications.slice(0, 3);

  if (!expanded || unreadCount === 0) return null;

  return (
    <Collapse in={expanded} timeout={400} unmountOnExit>
      <Card elevation={1} sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderBottom: '1px solid #fcd34d',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <NotificationsActiveIcon sx={{ color: '#b45309' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#92400e">
              Smart Reminders
            </Typography>
            <Typography variant="caption" color="#a16207">
              Planned sessions · Goals · Inactivity alerts
            </Typography>
          </Box>
          <Chip label={`${unreadCount} active`} size="small" color="warning" sx={{ fontWeight: 600 }} />
          <Button size="small" onClick={() => setPanelOpen(true)} sx={{ color: '#92400e' }}>
            View all
          </Button>
          <Tooltip title="Dismiss (reminders stay in the bell icon)">
            <IconButton size="small" onClick={hideCard} sx={{ color: '#92400e' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <CardContent sx={{ p: 2.5 }}>
          {permission !== 'granted' && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Enable browser notifications for automatic push alerts.
              </Typography>
              {permission !== 'denied' && (
                <Button size="small" variant="outlined" onClick={requestPermission}>
                  Enable
                </Button>
              )}
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
            <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary">
                Last study
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {daysSinceStudy === null
                  ? 'No sessions yet'
                  : daysSinceStudy === 0
                  ? 'Today'
                  : `${daysSinceStudy} day${daysSinceStudy === 1 ? '' : 's'} ago`}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary">
                Today logged
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {todayStudyMinutes} min
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary">
                Upcoming (7d)
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {upcomingPlans} session{upcomingPlans === 1 ? '' : 's'}
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            {topReminders.map((item) => {
              const Icon = TYPE_ICON[item.type] || EventNoteIcon;
              const style = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.info;
              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${style.border}`,
                    bgcolor: style.bg,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Icon sx={{ color: style.color, mt: 0.25 }} fontSize="small" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color={style.color}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {item.message}
                    </Typography>
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleAction(item)}
                      sx={{ mt: 0.5, p: 0, minWidth: 0 }}
                    >
                      {item.actionLabel || 'Open'}
                    </Button>
                  </Box>
                  <IconButton size="small" onClick={() => dismiss(item.id)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>

          {unreadCount > 3 && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (3 / unreadCount) * 100)}
              sx={{ mt: 2, borderRadius: 1, height: 4, bgcolor: '#e2e8f0' }}
            />
          )}
        </CardContent>
      </Card>
    </Collapse>
  );
};

export default RemindersCard;
