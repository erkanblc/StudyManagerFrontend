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
  Button,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimerIcon from '@mui/icons-material/Timer';
import { useNavigate } from 'react-router-dom';
import { dayjs, formatDuration, formatHours, getApiErrorMessage } from '../utils/helpers';
import {
  getPlanTypeLabel,
  getPlanStatusDisplay,
  planToTimerState,
  formToPlanRequest,
} from '../utils/planHelpers';
import { formatStudyMinutes, getDayTotalSeconds, getSessionDurationSec } from '../utils/studyCalendar';
import { updatePlanSession, deletePlanSession } from '../api/planSessionsApi';
import { updateSession, deleteSession } from '../api/sessionsApi';
import PlanSessionDialog from './PlanSessionDialog';
import SessionEditDialog from './SessionEditDialog';

const DayDetailDialog = ({
  open,
  onClose,
  day,
  plans = [],
  sessions = [],
  goals = [],
  onPlansUpdated,
  onSessionsUpdated,
}) => {
  const navigate = useNavigate();
  const [editPlan, setEditPlan] = useState(null);
  const [editSession, setEditSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  if (!day) return null;

  const totalSec = getDayTotalSeconds(sessions);
  const goalMap = Object.fromEntries(goals.map((g) => [String(g.id), g]));

  const handleStartPlan = (plan) => {
    navigate('/timer', { state: planToTimerState(plan) });
    onClose();
  };

  const handleSavePlan = async (form) => {
    if (!editPlan) return;
    setSaving(true);
    try {
      await updatePlanSession(editPlan.id, formToPlanRequest(form, goals));
      setSnack({ open: true, message: 'Plan updated.', severity: 'success' });
      setEditPlan(null);
      onPlansUpdated?.();
    } catch {
      setSnack({ open: true, message: 'Failed to update plan.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.title}"?`)) return;
    try {
      await deletePlanSession(plan.id);
      setSnack({ open: true, message: 'Plan deleted.', severity: 'success' });
      onPlansUpdated?.();
    } catch {
      setSnack({ open: true, message: 'Failed to delete plan.', severity: 'error' });
    }
  };

  const handleSaveSession = async (data) => {
    if (!editSession) return;
    setSaving(true);
    try {
      await updateSession(editSession.id, data);
      setSnack({ open: true, message: 'Session updated.', severity: 'success' });
      setEditSession(null);
      onSessionsUpdated?.();
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

  const handleDeleteSession = async (session) => {
    if (!window.confirm('Delete this study session?')) return;
    try {
      await deleteSession(session.id);
      setSnack({ open: true, message: 'Session deleted.', severity: 'success' });
      onSessionsUpdated?.();
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
              {plans.length} plan{plans.length !== 1 ? 's' : ''} · {sessions.length} study session{sessions.length !== 1 ? 's' : ''}
              {sessions.length > 0 && ` · ${formatStudyMinutes(totalSec)} total`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {/* Plans section */}
          <Box sx={{ px: 3, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <EventNoteIcon fontSize="small" color="secondary" />
              <Typography variant="subtitle2" fontWeight={700}>
                Plans
              </Typography>
              <Chip label={plans.length} size="small" color="secondary" sx={{ height: 20, fontSize: 11 }} />
            </Box>

            {plans.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No plans for this day.
              </Typography>
            ) : (
              <List disablePadding>
                {plans.map((plan, idx) => {
                  const status = getPlanStatusDisplay(plan);
                  return (
                    <Box key={plan.id}>
                      {idx > 0 && <Divider sx={{ my: 1 }} />}
                      <ListItem disablePadding sx={{ py: 1.25, alignItems: 'flex-start' }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
                              <Typography variant="body2" fontWeight={600}>{plan.title}</Typography>
                              <Chip label={getPlanTypeLabel(plan.type)} size="small" variant="outlined" />
                              <Chip label={status.label} size="small" color={status.color} />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {dayjs(plan.plannedDate).format('HH:mm')} · {plan.plannedDurationMinutes} min
                              </Typography>
                              {plan.goalTitle && (
                                <Typography variant="caption" color="primary.main" display="block">
                                  Goal: {plan.goalTitle}
                                </Typography>
                              )}
                              {plan.notes && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                                  {plan.notes}
                                </Typography>
                              )}
                              {plan.status === 'PLANNED' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<PlayArrowIcon />}
                                  onClick={() => handleStartPlan(plan)}
                                  sx={{ mt: 1 }}
                                >
                                  Start Timer
                                </Button>
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setEditPlan(plan)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeletePlan(plan)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>

          <Divider />

          {/* Study sessions section */}
          <Box sx={{ px: 3, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TimerIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={700}>
                Study Sessions
              </Typography>
              <Chip label={sessions.length} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />
            </Box>

            {sessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No study recorded on this day.
              </Typography>
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
                      <ListItem disablePadding sx={{ py: 1.25, alignItems: 'flex-start' }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
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
                            <Box sx={{ mt: 0.75 }}>
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
                        <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                          <Tooltip title="Edit duration">
                            <IconButton size="small" onClick={() => setEditSession(session)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteSession(session)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <PlanSessionDialog
        open={Boolean(editPlan)}
        onClose={() => setEditPlan(null)}
        onSave={handleSavePlan}
        initial={editPlan}
        goals={goals}
        saving={saving}
      />

      <SessionEditDialog
        open={Boolean(editSession)}
        onClose={() => setEditSession(null)}
        session={editSession}
        goals={goals}
        onSave={handleSaveSession}
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

export default DayDetailDialog;
