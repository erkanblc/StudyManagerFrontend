import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Alert,
  Tooltip,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import SaveIcon from '@mui/icons-material/Save';
import {
  fetchActiveSession,
  startSession,
  createManualSession,
  updateSession,
  deleteSession,
  heartbeatSession,
  resolveSession,
} from '../api/sessionsApi';
import { fetchActiveGoals } from '../api/goalsApi';
import { completePlanSession } from '../api/planSessionsApi';
import InterruptedSessionDialog from '../components/InterruptedSessionDialog';
import { useStudySessions } from '../hooks/useStudySessions';
import { formatDuration, dayjs, getApiErrorMessage, toUtcIso } from '../utils/helpers';
import {
  loadTimerState,
  saveTimerState,
  clearTimerState,
  resolveElapsedFromSaved,
  getElapsedSinceStart,
} from '../utils/timerStorage';
import {
  DEFAULT_MAX_SESSION_HOURS,
  fetchMaxSessionHours,
} from '../api/settingsApi';
import {
  getCompletedSessions,
  getSessionDateKey,
  getSessionDurationSec,
} from '../utils/studyCalendar';

const MIN_SAVE_SECONDS = 3;
const HEARTBEAT_INTERVAL_MS = 30_000;

const StudyTimerPage = () => {
  const location = useLocation();
  const {
    sessions,
    goals: allGoals,
    refresh: refreshSessions,
  } = useStudySessions();
  const [activeGoals, setActiveGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxHours, setMaxHours] = useState(DEFAULT_MAX_SESSION_HOURS);
  const [maxSeconds, setMaxSeconds] = useState(DEFAULT_MAX_SESSION_HOURS * 3600);

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [goalId, setGoalId] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [timerFinished, setTimerFinished] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [interruptedSession, setInterruptedSession] = useState(null);

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedElapsedRef = useRef(0);
  const elapsedRef = useRef(0);
  const isRunningRef = useRef(false);
  const activeSessionRef = useRef(null);
  const goalIdRef = useRef('');
  const subjectRef = useRef('');
  const notesRef = useRef('');
  const timerFinishedRef = useRef(false);
  const hydratedRef = useRef(false);
  const planSessionIdRef = useRef(null);
  const maxSecondsRef = useRef(DEFAULT_MAX_SESSION_HOURS * 3600);

  elapsedRef.current = elapsed;
  isRunningRef.current = isRunning;
  activeSessionRef.current = activeSession;
  goalIdRef.current = goalId;
  subjectRef.current = subject;
  notesRef.current = notes;
  timerFinishedRef.current = timerFinished;
  maxSecondsRef.current = maxSeconds;

  const persistTimer = useCallback((overrides = {}) => {
    if (!hydratedRef.current) return;
    const running = overrides.isRunning ?? isRunningRef.current;
    const currentElapsed = overrides.elapsed ?? elapsedRef.current;
    saveTimerState({
      sessionId: overrides.sessionId ?? activeSessionRef.current?.id ?? null,
      elapsed: currentElapsed,
      isRunning: running,
      lastTickAt: running ? Date.now() : null,
      goalId: overrides.goalId ?? goalIdRef.current,
      subject: overrides.subject ?? subjectRef.current,
      notes: overrides.notes ?? notesRef.current,
      timerFinished: overrides.timerFinished ?? timerFinishedRef.current,
    });
  }, []);

  const sendHeartbeat = useCallback(async () => {
    const session = activeSessionRef.current;
    if (!session?.id) return;
    try {
      await heartbeatSession(session.id, {
        duration: elapsedRef.current,
        goalId: goalIdRef.current ? Number(goalIdRef.current) : null,
        subject: subjectRef.current.trim() || null,
        notes: notesRef.current.trim() || null,
        isRunning: isRunningRef.current,
      });
    } catch {
      // Heartbeat failures are non-blocking
    }
  }, []);

  const refreshGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const active = await fetchActiveGoals();
      setActiveGoals(Array.isArray(active) ? active : []);
    } catch {
      setActiveGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    const sessionsData = await refreshSessions();
    return Array.isArray(sessionsData) ? sessionsData : [];
  }, [refreshSessions]);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        try {
          const limits = await fetchMaxSessionHours();
          setMaxHours(limits.maxHours);
          setMaxSeconds(limits.maxSeconds);
          maxSecondsRef.current = limits.maxSeconds;
        } catch {
          // keep defaults
        }

        const sessionsData = await refreshData();
        await refreshGoals();

        const resume = location.state?.resumeTimer;
        if (resume?.session) {
          const elapsedSec = Math.min(
            getElapsedSinceStart(resume.session),
            maxSecondsRef.current
          );
          setActiveSession(resume.session);
          pausedElapsedRef.current = elapsedSec;
          setElapsed(elapsedSec);
          setGoalId(resume.session.goalId ? String(resume.session.goalId) : '');
          setSubject(resume.session.subject || '');
          setNotes(resume.session.notes || '');
          if (resume.autoStart) {
            setIsRunning(true);
            persistTimer({
              sessionId: resume.session.id,
              elapsed: elapsedSec,
              isRunning: true,
            });
          } else {
            setIsRunning(false);
            persistTimer({
              sessionId: resume.session.id,
              elapsed: elapsedSec,
              isRunning: false,
            });
          }
          hydratedRef.current = true;
          setLoading(false);
          return;
        }

        let backendActive = sessionsData.find((s) => s.status === 'ACTIVE');
        if (!backendActive) {
          backendActive = await fetchActiveSession();
        }

        if (backendActive) {
          const elapsedSec = getElapsedSinceStart(backendActive);
          setActiveSession(backendActive);
          setElapsed(Math.min(elapsedSec, maxSecondsRef.current));
          pausedElapsedRef.current = Math.min(elapsedSec, maxSecondsRef.current);
          setIsRunning(false);
          setGoalId(backendActive.goalId ? String(backendActive.goalId) : '');
          setSubject(backendActive.subject || '');
          setNotes(backendActive.notes || '');
          setInterruptedSession(backendActive);
          hydratedRef.current = true;
          setLoading(false);
          return;
        }

        // Timer UI only (elapsed/running) — not the Recent Sessions list
        const saved = loadTimerState();

        if (saved) {
          const restoredElapsed = Math.min(
            resolveElapsedFromSaved(saved),
            maxSecondsRef.current
          );
          pausedElapsedRef.current = restoredElapsed;
          setElapsed(restoredElapsed);
          setIsRunning(Boolean(saved.isRunning));
          setGoalId(saved.goalId ?? '');
          setSubject(saved.subject ?? '');
          setNotes(saved.notes ?? '');
          setTimerFinished(Boolean(saved.timerFinished));
        } else {
          clearTimerState();
        }

        const fromPlan = location.state;
        if (fromPlan?.planSessionId && !saved) {
          if (fromPlan.planSessionId) planSessionIdRef.current = fromPlan.planSessionId;
          if (fromPlan.goalId) setGoalId(String(fromPlan.goalId));
          if (fromPlan.subject) setSubject(fromPlan.subject);
          if (fromPlan.notes) setNotes(fromPlan.notes);
        }
      } catch {
        setSnack({ open: true, message: 'Failed to load sessions.', severity: 'error' });
      } finally {
        hydratedRef.current = true;
        setLoading(false);
      }
    };
    loadInitial();
  }, [refreshData, refreshGoals, persistTimer, location.state]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000;
    intervalRef.current = setInterval(() => {
      let newElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const limit = maxSecondsRef.current;

      if (newElapsed >= limit) {
        newElapsed = limit;
        elapsedRef.current = newElapsed;
        setElapsed(newElapsed);
        setIsRunning(false);
        setTimerFinished(true);
        pausedElapsedRef.current = newElapsed;
        persistTimer({ elapsed: newElapsed, isRunning: false, timerFinished: true });
        setSnack({
          open: true,
          message: `Maximum study duration of ${Math.floor(limit / 3600)} hour(s) reached. Please save your session.`,
          severity: 'warning',
        });
        return;
      }

      elapsedRef.current = newElapsed;
      setElapsed(newElapsed);
      persistTimer({ elapsed: newElapsed, isRunning: true });
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, persistTimer]);

  useEffect(() => {
    if (!isRunning || !activeSession?.id) return undefined;

    const tick = () => sendHeartbeat();
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRunning, activeSession?.id, sendHeartbeat]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistTimer();
        return;
      }
      if (isRunningRef.current) {
        const saved = loadTimerState();
        if (saved?.isRunning) {
          const restored = resolveElapsedFromSaved(saved);
          pausedElapsedRef.current = restored;
          elapsedRef.current = restored;
          setElapsed(restored);
          startTimeRef.current = Date.now() - restored * 1000;
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [persistTimer]);

  useEffect(() => {
    persistTimer();
  }, [goalId, subject, notes, persistTimer]);

  const selectedGoal = activeGoals.find((g) => String(g.id) === String(goalId));

  const handleStart = async () => {
    if (timerFinished) return;
    try {
      if (!activeSession) {
        const session = await startSession({
          goalId: goalId ? Number(goalId) : null,
          subject: subject.trim() || null,
          notes: notes.trim() || null,
        });
        setActiveSession(session);
        pausedElapsedRef.current = 0;
        setElapsed(0);
        persistTimer({ sessionId: session.id, elapsed: 0, isRunning: true, timerFinished: false });
      } else {
        persistTimer({ isRunning: true, timerFinished: false });
      }
      setTimerFinished(false);
      setIsRunning(true);
      sendHeartbeat();
    } catch {
      setSnack({
        open: true,
        message: 'Could not start session. You may already have an active session.',
        severity: 'error',
      });
    }
  };

  const handlePause = () => {
    pausedElapsedRef.current = elapsedRef.current;
    setIsRunning(false);
    persistTimer({ elapsed: elapsedRef.current, isRunning: false });
    sendHeartbeat();
  };

  const handleReset = async () => {
    setIsRunning(false);
    setElapsed(0);
    pausedElapsedRef.current = 0;
    setTimerFinished(false);
    clearTimerState();

    const session = activeSessionRef.current;
    if (session?.id) {
      try {
        await deleteSession(session.id);
        setActiveSession(null);
        await refreshData();
      } catch {
        setSnack({ open: true, message: 'Could not reset active session.', severity: 'warning' });
      }
    }
  };

  const handleSave = async () => {
    let duration = elapsedRef.current;
    if (duration > maxSecondsRef.current) {
      duration = maxSecondsRef.current;
      setElapsed(duration);
      elapsedRef.current = duration;
    }
    if (duration < MIN_SAVE_SECONDS) {
      setSnack({
        open: true,
        message: `Save requires at least ${MIN_SAVE_SECONDS} seconds of study time.`,
        severity: 'warning',
      });
      return;
    }

    setIsRunning(false);
    setSaving(true);
    pausedElapsedRef.current = duration;

    const metadata = {
      goalId: goalId ? Number(goalId) : null,
      subject: subject.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (activeSession) {
        const start = dayjs(activeSession.startTime);
        const end = start.add(duration, 'second');
        await resolveSession(activeSession.id, {
          action: 'MANUAL',
          startTime: toUtcIso(start),
          endTime: toUtcIso(end),
        });
        await updateSession(activeSession.id, metadata);
        setActiveSession(null);
      } else {
        await createManualSession({
          duration,
          ...metadata,
        });
      }

      if (planSessionIdRef.current) {
        try {
          await completePlanSession(planSessionIdRef.current);
        } catch {
          // Plan completion is best-effort after study save
        }
        planSessionIdRef.current = null;
      }

      clearTimerState();
      setSnack({ open: true, message: 'Saved!', severity: 'success' });
      await refreshData();
      setElapsed(0);
      pausedElapsedRef.current = 0;
      setTimerFinished(false);
      setNotes('');
      setSubject('');
      setGoalId('');
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to save session.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudySession = async (id) => {
    try {
      await deleteSession(id);
      await refreshData();
      setSnack({ open: true, message: 'Session deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to delete session.', severity: 'error' });
    }
  };

  const displayTime = formatDuration(elapsed);

  const completedSessions = getCompletedSessions(sessions);
  const totalSeconds = completedSessions.reduce(
    (sum, s) => sum + getSessionDurationSec(s),
    0
  );
  const recentSessions = [...completedSessions]
    .sort((a, b) => dayjs(getSessionDateKey(b)).diff(dayjs(getSessionDateKey(a))))
    .slice(0, 7);

  const canSave = elapsed >= MIN_SAVE_SECONDS && !saving;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Study Timer
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Track your focused study time (max {maxHours}h per session)
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              {timerFinished && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Maximum duration reached. Please save your session.
                </Alert>
              )}

              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                <svg width={220} height={220}>
                  <circle cx={110} cy={110} r={90} fill="none" stroke="#e0e0e0" strokeWidth={8} />
                  {isRunning && (
                    <circle cx={110} cy={20} r={6} fill="#6366f1">
                      <animate
                        attributeName="opacity"
                        values="1;0.3;1"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </svg>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={700}
                    sx={{ fontFamily: 'monospace', letterSpacing: 2 }}
                    color={timerFinished ? 'warning.main' : isRunning ? 'primary.main' : 'text.primary'}
                  >
                    {displayTime}
                  </Typography>
                  {isRunning && (
                    <Typography variant="caption" color="primary.main" fontWeight={500}>
                      Recording…
                    </Typography>
                  )}
                  {!isRunning && elapsed > 0 && !timerFinished && (
                    <Typography variant="caption" color="text.secondary">
                      Paused
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
                {!isRunning ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleStart}
                    disabled={timerFinished || saving}
                    sx={{ px: 4, py: 1.5, borderRadius: 3, fontSize: 16 }}
                  >
                    {elapsed > 0 ? 'Resume' : 'Start'}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PauseIcon />}
                    onClick={handlePause}
                    sx={{ px: 4, py: 1.5, borderRadius: 3, fontSize: 16 }}
                  >
                    Pause
                  </Button>
                )}
                <Tooltip title="Reset timer">
                  <IconButton onClick={handleReset} size="large" color="default" disabled={saving}>
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={1} sx={{ borderRadius: 3, mt: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Session Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Related Goal (optional)"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={goalsLoading || saving}
                  helperText={
                    goalsLoading
                      ? 'Loading goals...'
                      : selectedGoal?.description || (
                          activeGoals.length === 0
                            ? 'No active goals yet. Ask an admin to add goals.'
                            : 'Link this session to one of your learning goals.'
                        )
                  }
                >
                  <MenuItem value="">No specific goal</MenuItem>
                  {activeGoals.map((g) => (
                    <MenuItem key={g.id} value={String(g.id)}>
                      {g.title}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Subject / Topic"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={saving}
                  placeholder="e.g. Linear Algebra Chapter 3"
                />
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  disabled={saving}
                  placeholder="What did you study? How did it go?"
                />
                {!canSave && elapsed > 0 && elapsed < MIN_SAVE_SECONDS && (
                  <Typography variant="caption" color="text.secondary">
                    Study at least {MIN_SAVE_SECONDS} seconds before saving.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  color="success"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={!canSave}
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  Save Session ({formatDuration(elapsed)})
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Total Study Time</Typography>
                  <Typography variant="h5" fontWeight={700} color="primary">
                    {formatDuration(totalSeconds)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Logged sessions</Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary">
                    {completedSessions.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Recent Sessions
              </Typography>
              {recentSessions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <TimerIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No sessions recorded yet. Start your first session!
                  </Typography>
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  <List disablePadding>
                    {recentSessions.map((session, idx) => {
                      const goal = allGoals.find(
                        (g) => g.id === session.goalId || String(g.id) === String(session.goalId)
                      );
                      const durationSec = getSessionDurationSec(session);
                      const dateKey = getSessionDateKey(session);
                      return (
                        <Box key={session.id}>
                          {idx > 0 && <Divider />}
                          <ListItem sx={{ py: 1.25 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={600} color="primary">
                                    {formatDuration(durationSec)}
                                  </Typography>
                                  {session.subject && (
                                    <Typography variant="body2" noWrap>
                                      {session.subject}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {dayjs(session.startTime || dateKey || session.createdAt).format('ddd, MMM D · HH:mm')}
                                  </Typography>
                                  {goal && (
                                    <Typography variant="caption" color="primary.main" display="block">
                                      {goal.title}
                                    </Typography>
                                  )}
                                  {session.notes && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                                      "{session.notes}"
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Delete session">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteStudySession(session.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Box>
                      );
                    })}
                  </List>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <InterruptedSessionDialog
        open={Boolean(interruptedSession)}
        session={interruptedSession}
        onClose={() => setInterruptedSession(null)}
        onResolved={async (message) => {
          setInterruptedSession(null);
          setActiveSession(null);
          clearTimerState();
          setElapsed(0);
          pausedElapsedRef.current = 0;
          setIsRunning(false);
          setSnack({ open: true, message, severity: 'success' });
          await refreshData();
        }}
        onContinue={(updated, elapsedFromStart) => {
          const elapsedSec = elapsedFromStart ?? getElapsedSinceStart(updated);
          setActiveSession(updated);
          setElapsed(elapsedSec);
          pausedElapsedRef.current = elapsedSec;
          setIsRunning(true);
          setInterruptedSession(null);
          persistTimer({
            sessionId: updated.id,
            elapsed: elapsedSec,
            isRunning: true,
          });
          sendHeartbeat();
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudyTimerPage;
