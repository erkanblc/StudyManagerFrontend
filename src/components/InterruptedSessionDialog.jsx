import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  Grid,
  CircularProgress,
  Divider,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { deleteSession, resolveSession } from '../api/sessionsApi';
import { getElapsedSinceStart } from '../utils/timerStorage';
import { dayjs, formatDuration, getApiErrorMessage, toLocalInputDateTime, toUtcIso } from '../utils/helpers';
import {
  DEFAULT_MAX_SESSION_HOURS,
  fetchMaxSessionHours,
  MANUAL_MAX_DURATION_HOURS,
  MANUAL_MAX_DURATION_SECONDS,
  MANUAL_MIN_DURATION_SECONDS,
} from '../api/settingsApi';

const InterruptedSessionDialog = ({ open, session, onClose, onResolved, onContinue }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [maxHours, setMaxHours] = useState(DEFAULT_MAX_SESSION_HOURS);
  const [maxSeconds, setMaxSeconds] = useState(DEFAULT_MAX_SESSION_HOURS * 3600);

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchMaxSessionHours()
      .then((data) => {
        setMaxHours(data.maxHours);
        setMaxSeconds(data.maxSeconds);
      })
      .catch(() => {
        setMaxHours(DEFAULT_MAX_SESSION_HOURS);
        setMaxSeconds(DEFAULT_MAX_SESSION_HOURS * 3600);
      });
  }, [open]);

  if (!session) return null;

  const lastUpdate = session.lastHeartbeatAt || session.startTime;
  const savedDuration = Number(session.duration ?? session.durationSeconds ?? 0);
  const continueElapsed = getElapsedSinceStart(session);
  const overMax = continueElapsed > maxSeconds;
  const heartbeatOverMax = savedDuration > maxSeconds;

  const resetManual = () => {
    const capped = Math.min(
      savedDuration || Math.min(continueElapsed, MANUAL_MAX_DURATION_SECONDS),
      MANUAL_MAX_DURATION_SECONDS
    );
    setHours(Math.floor(capped / 3600));
    setMinutes(Math.floor((capped % 3600) / 60));
    setSeconds(capped % 60);
    setStartTime(session.startTime ? toLocalInputDateTime(session.startTime, 'YYYY-MM-DDTHH:mm:ss') : '');
    setEndTime(lastUpdate ? toLocalInputDateTime(lastUpdate, 'YYYY-MM-DDTHH:mm:ss') : '');
  };

  const handleSaveAtHeartbeat = async () => {
    if (heartbeatOverMax) {
      setError(
        `Last recorded duration exceeds the ${maxHours}h limit. Save at maximum allowed time instead, or cancel.`
      );
      return;
    }
    setSaving(true);
    setError('');
    try {
      await resolveSession(session.id, { action: 'SAVE_AT_HEARTBEAT' });
      onResolved?.('Session saved at last update time.');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save session.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAtMax = async () => {
    setSaving(true);
    setError('');
    try {
      await resolveSession(session.id, {
        action: 'MANUAL',
        duration: maxSeconds,
      });
      onResolved?.(`Session saved at the maximum allowed duration (${maxHours}h).`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save session at max duration.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm('Cancel and delete this interrupted session? This cannot be undone.')) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await deleteSession(session.id);
      onResolved?.('Interrupted session cancelled.');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to cancel session.'));
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (overMax) {
      setError(
        `Elapsed time (${formatDuration(continueElapsed)}) exceeds the maximum of ${maxHours} hour(s). Continue is not allowed — save at max, save at last update, or cancel.`
      );
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await resolveSession(session.id, { action: 'CONTINUE' });
      onClose();
      if (onContinue) {
        onContinue(updated, Math.min(continueElapsed, maxSeconds));
      } else {
        navigate('/timer', {
          state: {
            resumeTimer: {
              session: updated,
              autoStart: true,
            },
          },
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to resume session.'));
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    setError('');
    try {
      const durationTotal = hours * 3600 + minutes * 60 + seconds;
      if (durationTotal < MANUAL_MIN_DURATION_SECONDS) {
        setError(`Duration must be at least ${MANUAL_MIN_DURATION_SECONDS} second(s).`);
        setSaving(false);
        return;
      }
      if (durationTotal > MANUAL_MAX_DURATION_SECONDS) {
        setError(`Duration cannot exceed ${MANUAL_MAX_DURATION_HOURS} hour(s).`);
        setSaving(false);
        return;
      }

      const payload = { action: 'MANUAL' };

      if (startTime && endTime) {
        const start = dayjs(startTime);
        const end = dayjs(endTime);
        const span = end.diff(start, 'second');
        if (span < MANUAL_MIN_DURATION_SECONDS) {
          setError(`Start/end range must be at least ${MANUAL_MIN_DURATION_SECONDS} second(s).`);
          setSaving(false);
          return;
        }
        if (span > MANUAL_MAX_DURATION_SECONDS) {
          setError(`Start/end range cannot exceed ${MANUAL_MAX_DURATION_HOURS} hour(s).`);
          setSaving(false);
          return;
        }
        payload.startTime = toUtcIso(start);
        payload.endTime = toUtcIso(end);
      } else if (durationTotal >= MANUAL_MIN_DURATION_SECONDS) {
        payload.duration = durationTotal;
      } else {
        setError('Enter a valid duration or start/end time.');
        setSaving(false);
        return;
      }

      await resolveSession(session.id, payload);
      onResolved?.('Session saved with your custom time.');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save session.'));
    } finally {
      setSaving(false);
    }
  };

  const openManual = () => {
    resetManual();
    setMode('manual');
    setError('');
  };

  const handleClose = () => {
    if (saving) return;
    setMode(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimerIcon color="warning" />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Interrupted Study Session
          </Typography>
          <Typography variant="caption" color="text.secondary">
            An active timer was found on your account
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Started: {dayjs(session.startTime).format('MMM D, YYYY · HH:mm:ss')}
          {lastUpdate && (
            <> · Last saved: {dayjs(lastUpdate).format('MMM D, YYYY · HH:mm:ss')}</>
          )}
          {savedDuration > 0 && <> · Recorded: {formatDuration(savedDuration)}</>}
          <> · Elapsed until now: {formatDuration(continueElapsed)}</>
        </Alert>

        {overMax && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This session has been running longer than the maximum allowed duration of{' '}
            <strong>{maxHours} hour(s)</strong>. You cannot continue — choose one of the options below.
          </Alert>
        )}

        {session.subject && (
          <Typography variant="body2" mb={1}>
            <strong>Subject:</strong> {session.subject}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {mode !== 'manual' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {!heartbeatOverMax && (
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveAtHeartbeat}
                disabled={saving}
                sx={{ justifyContent: 'flex-start', py: 1.5, textAlign: 'left' }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Save at last update time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    End session at {dayjs(lastUpdate).format('HH:mm:ss')} ({formatDuration(savedDuration)})
                  </Typography>
                </Box>
              </Button>
            )}

            {overMax && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<SaveIcon />}
                onClick={handleSaveAtMax}
                disabled={saving}
                sx={{ justifyContent: 'flex-start', py: 1.5, textAlign: 'left' }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Save at maximum allowed time
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Record {formatDuration(maxSeconds)} ({maxHours}h) and close the session
                  </Typography>
                </Box>
              </Button>
            )}

            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleContinue}
              disabled={saving || overMax}
              sx={{ justifyContent: 'flex-start', py: 1.5, textAlign: 'left' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Continue studying
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: overMax ? 'text.secondary' : 'rgba(255,255,255,0.85)' }}
                >
                  {overMax
                    ? `Disabled — elapsed exceeds ${maxHours}h limit`
                    : `Resume from start time — ${formatDuration(continueElapsed)} elapsed until now`}
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              startIcon={<EditIcon />}
              onClick={openManual}
              disabled={saving}
              sx={{ justifyContent: 'flex-start', py: 1.5, textAlign: 'left' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Enter time manually
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Set custom date, hours, minutes and seconds (min {MANUAL_MIN_DURATION_SECONDS}s · max{' '}
                  {MANUAL_MAX_DURATION_HOURS}h)
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancelSession}
              disabled={saving}
              sx={{ justifyContent: 'flex-start', py: 1.5, textAlign: 'left' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Cancel this session
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Delete the interrupted timer without saving study time
                </Typography>
              </Box>
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Manual entry (min {MANUAL_MIN_DURATION_SECONDS}s · max {MANUAL_MAX_DURATION_HOURS}h)
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Duration (hours · minutes · seconds)
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={4}>
                <TextField
                  label="Hours"
                  type="number"
                  value={hours}
                  onChange={(e) =>
                    setHours(Math.min(MANUAL_MAX_DURATION_HOURS, Math.max(0, Number(e.target.value) || 0)))
                  }
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, max: MANUAL_MAX_DURATION_HOURS }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Minutes"
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Seconds"
                  type="number"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
            </Grid>

            <Divider>or start / end time</Divider>

            <TextField
              label="Start time"
              type="datetime-local"
              value={startTime ? dayjs(startTime).format('YYYY-MM-DDTHH:mm') : ''}
              onChange={(e) =>
                setStartTime(e.target.value ? dayjs(e.target.value).format('YYYY-MM-DDTHH:mm:ss') : '')
              }
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End time"
              type="datetime-local"
              value={endTime ? dayjs(endTime).format('YYYY-MM-DDTHH:mm') : ''}
              onChange={(e) =>
                setEndTime(e.target.value ? dayjs(e.target.value).format('YYYY-MM-DDTHH:mm:ss') : '')
              }
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Button variant="text" onClick={() => setMode(null)} disabled={saving}>
              Back to options
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Later
        </Button>
        {mode === 'manual' && (
          <Button
            variant="contained"
            onClick={handleManualSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InterruptedSessionDialog;
