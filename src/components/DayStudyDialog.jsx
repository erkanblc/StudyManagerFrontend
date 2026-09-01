import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import { dayjs, formatDuration, formatHours, getApiErrorMessage } from '../utils/helpers';
import { formatStudyMinutes, getDayTotalSeconds, getSessionDurationSec } from '../utils/studyCalendar';
import { updateSession, deleteSession } from '../api/sessionsApi';
import SessionEditDialog from './SessionEditDialog';

const DayStudyDialog = ({ open, onClose, day, sessions = [], goals = [], onUpdated }) => {
  const [editSession, setEditSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  if (!day) return null;

  const totalSec = getDayTotalSeconds(sessions);
  const goalMap = Object.fromEntries(goals.map((g) => [String(g.id), g]));

  const handleSave = async (data) => {
    if (!editSession) return;
    setSaving(true);
    try {
      await updateSession(editSession.id, data);
      setSnack({ open: true, message: 'Session updated.', severity: 'success' });
      setEditSession(null);
      onUpdated?.();
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to update session.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (session) => {
    if (!window.confirm('Delete this study session?')) return;
    try {
      await deleteSession(session.id);
      setSnack({ open: true, message: 'Session deleted.', severity: 'success' });
      onUpdated?.();
    } catch {
      setSnack({ open: true, message: 'Failed to delete session.', severity: 'error' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {day.format('dddd, MMMM D')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {formatStudyMinutes(totalSec)} total
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {sessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TimerIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No study recorded on this day.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {sessions.map((session, idx) => {
                const goal = goalMap[String(session.goalId)];
                const dur = getSessionDurationSec(session);
                const timeLabel = session.startTime
                  ? dayjs(session.startTime).format('HH:mm')
                  : session.date
                    ? dayjs(session.date).format('HH:mm')
                    : '—';

                return (
                  <Box key={session.id}>
                    {idx > 0 && <Divider sx={{ my: 1 }} />}
                    <ListItem
                      disablePadding
                      sx={{ py: 1.25, alignItems: 'flex-start' }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          <Tooltip title="Edit duration">
                            <IconButton size="small" onClick={() => setEditSession(session)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(session)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 6 }}>
                            <Chip
                              label={formatDuration(dur)}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                              {session.subject || goal?.title || 'Study session'}
                            </Typography>
                            <Chip label={`${formatHours(dur)}h`} size="small" variant="outlined" />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.75, pr: 6 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {timeLabel}
                            </Typography>
                            {goal && (
                              <Typography variant="caption" color="primary.main" display="block">
                                Goal: {goal.title}
                              </Typography>
                            )}
                            {session.notes && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                {session.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      <SessionEditDialog
        open={Boolean(editSession)}
        onClose={() => setEditSession(null)}
        session={editSession}
        goals={goals}
        onSave={handleSave}
        saving={saving}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DayStudyDialog;
