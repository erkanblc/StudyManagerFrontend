import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TimerIcon from '@mui/icons-material/Timer';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useStudySessions } from '../hooks/useStudySessions';
import { usePlanSessions } from '../hooks/usePlanSessions';
import { useMilestones } from '../hooks/useMilestones';
import CalendarDayCell from '../components/CalendarDayCell';
import DayDetailDialog from '../components/DayDetailDialog';
import PlanSessionDialog from '../components/PlanSessionDialog';
import { createPlanSession } from '../api/planSessionsApi';
import { dayjs } from '../utils/helpers';
import {
  groupSessionsByDate,
  DAY_STUDY_STYLES,
  formatStudyMinutes,
  getCompletedSessions,
  getSessionDateKey,
  getSessionDurationSec,
} from '../utils/studyCalendar';
import {
  getMilestoneProgress,
  getGoalStudyProgressPct,
  formatGoalPeriod,
  getGoalStatusMeta,
  isDateInGoalRange,
} from '../utils/goalHelpers';
import {
  ALL_GOALS_FILTER,
  STANDALONE_GOAL_FILTER,
  matchesGoalFilter,
  milestoneMatchesGoalFilter,
  isStandaloneMilestone,
} from '../utils/milestoneHelpers';
import {
  groupPlansByDate,
  getPlanTypeLabel,
  getPlanStatusDisplay,
  formToPlanRequest,
  planToTimerState,
} from '../utils/planHelpers';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const buildMonthKeys = (start, endExclusive) => {
  const keys = [];
  let cursor = start.startOf('month');
  const end = endExclusive.startOf('month');
  while (cursor.isBefore(end, 'month') && keys.length < 12) {
    keys.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }
  return keys.length ? keys : [dayjs().format('YYYY-MM')];
};

const SixMonthPlanPage = () => {
  const navigate = useNavigate();
  const { sessions, goals, loading: studyLoading, error: studyError, refresh } = useStudySessions();
  const { plans, loading: planLoading, error: planError, refresh: refreshPlans } = usePlanSessions();
  const { milestones, loading: milestonesLoading, error: milestonesError } = useMilestones();

  const [tab, setTab] = useState(0);
  const [goalFilter, setGoalFilter] = useState(ALL_GOALS_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailDialog, setDetailDialog] = useState({ open: false, day: null, sessions: [], plans: [] });
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  const completedSessions = useMemo(() => getCompletedSessions(sessions), [sessions]);

  const selectedGoal = useMemo(() => {
    if (!goalFilter || goalFilter === ALL_GOALS_FILTER || goalFilter === STANDALONE_GOAL_FILTER) {
      return null;
    }
    return goals.find((g) => String(g.id) === String(goalFilter)) || null;
  }, [goals, goalFilter]);

  /** Same source as Monthly Plan / Planning — no date clamp. */
  const filteredPlans = useMemo(
    () =>
      plans
        .filter((p) => matchesGoalFilter(p, goalFilter))
        .sort((a, b) => dayjs(a.plannedDate).diff(dayjs(b.plannedDate))),
    [plans, goalFilter]
  );

  const { startOfPlan, endOfPlan, months } = useMemo(() => {
    let start = dayjs().startOf('month');
    let end = start.add(6, 'month');

    if (selectedGoal) {
      if (selectedGoal.startDate) start = dayjs(selectedGoal.startDate).startOf('month');
      end = selectedGoal.endDate
        ? dayjs(selectedGoal.endDate).startOf('month').add(1, 'month')
        : start.add(6, 'month');
      if (!end.isAfter(start, 'month')) end = start.add(1, 'month');
      if (end.diff(start, 'month') > 12) end = start.add(12, 'month');
    }

    return {
      startOfPlan: start,
      endOfPlan: end,
      months: buildMonthKeys(start, end),
    };
  }, [selectedGoal]);

  useEffect(() => {
    const key = currentMonth.format('YYYY-MM');
    if (!months.includes(key)) {
      setCurrentMonth(dayjs(`${months[0]}-01`));
    }
  }, [months, currentMonth]);

  const filteredSessions = useMemo(
    () =>
      completedSessions.filter((s) => {
        if (!matchesGoalFilter(s, goalFilter)) return false;
        const key = getSessionDateKey(s);
        if (!key) return false;
        const d = dayjs(key);
        return !d.isBefore(startOfPlan, 'day') && d.isBefore(endOfPlan, 'day');
      }),
    [completedSessions, goalFilter, startOfPlan, endOfPlan]
  );

  /** Calendar uses all goal-filtered data (same as Monthly Plan). */
  const calendarSessions = useMemo(
    () => completedSessions.filter((s) => matchesGoalFilter(s, goalFilter)),
    [completedSessions, goalFilter]
  );

  const sessionsByDate = useMemo(() => groupSessionsByDate(calendarSessions), [calendarSessions]);
  /** Identical to Monthly Plan: all goal-filtered plans keyed by local date. */
  const plansByDate = useMemo(() => groupPlansByDate(filteredPlans), [filteredPlans]);

  const monthKey = currentMonth.format('YYYY-MM');
  const monthSessions = useMemo(
    () =>
      calendarSessions.filter((s) => {
        const key = getSessionDateKey(s);
        return key?.startsWith(monthKey);
      }),
    [calendarSessions, monthKey]
  );
  const monthPlans = useMemo(
    () =>
      filteredPlans.filter((p) => {
        const d = dayjs(p.plannedDate);
        return d.isValid() && d.format('YYYY-MM') === monthKey;
      }),
    [filteredPlans, monthKey]
  );

  const monthMilestones = useMemo(
    () =>
      milestones.filter((m) => {
        if (!m.dueDate) return false;
        if (dayjs(m.dueDate).format('YYYY-MM') !== monthKey) return false;
        return milestoneMatchesGoalFilter(m, goalFilter);
      }),
    [milestones, monthKey, goalFilter]
  );

  const monthTotalSec = monthSessions.reduce((sum, s) => sum + getSessionDurationSec(s), 0);
  const planDays = useMemo(() => {
    const keys = new Set();
    monthPlans.forEach((p) => {
      const key = dayjs(p.plannedDate).format('YYYY-MM-DD');
      if (key) keys.add(key);
    });
    return keys.size;
  }, [monthPlans]);

  const studyInRange = useMemo(
    () =>
      [...filteredSessions].sort((a, b) =>
        dayjs(getSessionDateKey(b)).diff(dayjs(getSessionDateKey(a)))
      ),
    [filteredSessions]
  );

  const standaloneCount = useMemo(
    () =>
      [...filteredSessions, ...filteredPlans].filter(
        (item) => item?.goalId == null || item?.goalId === ''
      ).length,
    [filteredSessions, filteredPlans]
  );

  const studiedSecondsForGoal = (goalId) =>
    completedSessions
      .filter((s) => String(s.goalId) === String(goalId))
      .reduce((sum, s) => sum + getSessionDurationSec(s), 0);

  const selectedGoalStudyPct = selectedGoal
    ? getGoalStudyProgressPct(selectedGoal, studiedSecondsForGoal(selectedGoal.id))
    : 0;
  const selectedGoalMilestones = selectedGoal
    ? getMilestoneProgress(selectedGoal)
    : { completed: 0, total: 0 };
  const selectedGoalStatusMeta = selectedGoal ? getGoalStatusMeta(selectedGoal.status) : null;
  const selectedGoalStudiedSec = selectedGoal ? studiedSecondsForGoal(selectedGoal.id) : 0;

  const firstDay = currentMonth.startOf('month');
  const lastDay = currentMonth.endOf('month');
  const startPad = firstDay.day();
  const calDays = [];
  for (let i = 0; i < startPad; i++) calDays.push(null);
  for (let d = 0; d < lastDay.date(); d++) calDays.push(firstDay.add(d, 'day'));

  const monthIndex = months.indexOf(monthKey);
  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex >= 0 && monthIndex < months.length - 1;

  const handleCreatePlan = async (form) => {
    setSaving(true);
    try {
      await createPlanSession(formToPlanRequest(form, goals));
      await refreshPlans();
      setDialogOpen(false);
      const planMonth = dayjs(form.plannedDate).startOf('month');
      if (planMonth.isValid()) setCurrentMonth(planMonth);
    } finally {
      setSaving(false);
    }
  };

  const handleDayClick = (day, daySessions, dayPlans) => {
    const key = day.format('YYYY-MM-DD');
    setDetailDialog({
      open: true,
      day,
      sessions: daySessions,
      plans: plansByDate[key] || dayPlans,
    });
  };

  const handleSessionsUpdated = async () => {
    const updated = await refresh();
    if (detailDialog.day) {
      const key = detailDialog.day.format('YYYY-MM-DD');
      const filtered = getCompletedSessions(updated).filter((s) => matchesGoalFilter(s, goalFilter));
      const byDate = groupSessionsByDate(filtered);
      setDetailDialog((prev) => ({ ...prev, sessions: byDate[key] || [] }));
    }
  };

  const handlePlansUpdated = async () => {
    const updated = await refreshPlans();
    if (detailDialog.day) {
      const key = detailDialog.day.format('YYYY-MM-DD');
      const filtered = (Array.isArray(updated) ? updated : []).filter((p) =>
        matchesGoalFilter(p, goalFilter)
      );
      const byDate = groupPlansByDate(filtered);
      setDetailDialog((prev) => ({ ...prev, plans: byDate[key] || [] }));
    }
  };

  if (studyLoading || planLoading || milestonesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>6-Month Study Plan</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {months.length > 0
              ? `${dayjs(`${months[0]}-01`).format('MMMM YYYY')} – ${dayjs(`${months[months.length - 1]}-01`).format('MMMM YYYY')}`
              : ''}
            · purple = planned · green = actual study
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
          New Plan
        </Button>
      </Box>

      {(studyError || planError || milestonesError) && (
        <Alert severity="warning" sx={{ mb: 2 }}>{studyError || planError || milestonesError}</Alert>
      )}

      <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5, overflow: 'visible' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Goals Progress
            </Typography>

            <TextField
              select
              label="Filter by Goal"
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              fullWidth
              size="small"
              sx={{ maxWidth: 360 }}
            >
              <MenuItem value={ALL_GOALS_FILTER}>All goals</MenuItem>
              <MenuItem value={STANDALONE_GOAL_FILTER}>
                Standalone ({standaloneCount})
              </MenuItem>
              {goals.map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>
                  {g.title}
                </MenuItem>
              ))}
            </TextField>

            {goals.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No goals yet. Create one on the Goals page.
              </Typography>
            )}

            {selectedGoal && (
              <Card variant="outlined" sx={{ borderRadius: 2, maxWidth: 480 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Typography variant="body1" fontWeight={700}>
                      {selectedGoal.title}
                    </Typography>
                    <Chip label={selectedGoalStatusMeta.label} size="small" color={selectedGoalStatusMeta.color} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {formatGoalPeriod(selectedGoal) || 'No period set'}
                    {' · '}
                    Study {selectedGoalStudyPct}%
                    {selectedGoal.targetHours != null && ` · ${(selectedGoalStudiedSec / 3600).toFixed(1)}h / ${selectedGoal.targetHours}h`}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={selectedGoalStudyPct}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      mb: selectedGoalMilestones.total > 0 ? 1.5 : 0,
                      bgcolor: 'rgba(63, 81, 181, 0.15)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#3F51B5' },
                    }}
                  />
                  {selectedGoalMilestones.total > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        Milestones {selectedGoalMilestones.completed}/{selectedGoalMilestones.total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(selectedGoalMilestones.completed / selectedGoalMilestones.total) * 100}
                        color="secondary"
                        sx={{ height: 4, borderRadius: 1 }}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <IconButton
          disabled={!canGoPrev}
          onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 180, textAlign: 'center' }}>
          {currentMonth.format('MMMM YYYY')}
        </Typography>
        <IconButton
          disabled={!canGoNext}
          onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}
        >
          <ChevronRightIcon />
        </IconButton>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setCurrentMonth(dayjs().startOf('month'))}
        >
          Today
        </Button>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', ml: { sm: 'auto' } }}>
          {months.map((m) => (
            <Chip
              key={m}
              label={dayjs(`${m}-01`).format('MMM YY')}
              size="small"
              color={m === monthKey ? 'primary' : 'default'}
              variant={m === monthKey ? 'filled' : 'outlined'}
              onClick={() => setCurrentMonth(dayjs(`${m}-01`))}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Study Sessions',
            value: monthSessions.length,
            sub: formatStudyMinutes(monthTotalSec) + ' total',
            color: 'primary',
          },
          {
            label: 'Planned Sessions',
            value: monthPlans.length,
            sub: `${planDays} days with plans`,
            color: 'secondary',
          },
          {
            label: 'Milestones',
            value: monthMilestones.length,
            sub: `${monthMilestones.filter((m) => m.status === 'completed').length} completed`,
            color: 'warning',
          },
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h4" fontWeight={700} color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {monthMilestones.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            Milestones this month
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {monthMilestones.map((m) => (
              <Chip
                key={m.id}
                icon={<EmojiEventsIcon />}
                label={`${m.title}${m.dueDate ? ` · ${dayjs(m.dueDate).format('MMM D')}` : ''}`}
                color={isStandaloneMilestone(m) ? 'warning' : 'default'}
                variant={m.status === 'completed' ? 'outlined' : 'filled'}
              />
            ))}
          </Box>
        </Paper>
      )}

      <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Study Calendar
          </Typography>
          <Grid container columns={7} sx={{ mb: 1 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <Grid size={1} key={d}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textAlign="center" display="block">
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Grid container columns={7} spacing={0.75} sx={{ alignItems: 'stretch' }}>
            {calDays.map((day, idx) => {
              if (!day) {
                return (
                  <Grid size={1} key={`pad-${idx}`} sx={{ display: 'flex' }}>
                    <Box sx={{ minHeight: 108, flex: 1, bgcolor: 'action.hover', borderRadius: 1.5, opacity: 0.25 }} />
                  </Grid>
                );
              }
              const dayStr = day.format('YYYY-MM-DD');
              const daySessions = sessionsByDate[dayStr] || [];
              const dayPlans = plansByDate[dayStr] || [];
              const dayMilestones = milestones.filter(
                (m) =>
                  m.dueDate === dayStr &&
                  milestoneMatchesGoalFilter(m, goalFilter)
              );
              const inGoalRange = isDateInGoalRange(dayStr, selectedGoal);
              return (
                <Grid size={1} key={dayStr} sx={{ display: 'flex' }}>
                  <Box sx={{ flex: 1, width: '100%', display: 'flex', '& > *': { flex: 1, width: '100%' } }}>
                    <CalendarDayCell
                      day={day}
                      daySessions={daySessions}
                      dayPlans={dayPlans}
                      milestones={dayMilestones}
                      onDayClick={handleDayClick}
                      size="md"
                      inGoalRange={inGoalRange}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {selectedGoal && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: 'rgba(63, 81, 181, 0.22)', border: '2px solid #3F51B5' }} />
                <Typography variant="caption" color="text.secondary">Selected goal period</Typography>
              </Box>
            )}
            {['low', 'medium', 'high'].map((level) => (
              <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: DAY_STUDY_STYLES[level].bgcolor,
                    border: '1px solid',
                    borderColor: DAY_STUDY_STYLES[level].borderColor,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {DAY_STUDY_STYLES[level].label}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: '#ede9fe', border: '2px solid #6366f1' }} />
              <Typography variant="caption" color="text.secondary">Planned</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 22,
                  height: 18,
                  borderRadius: 0.75,
                  bgcolor: 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                }}
              >
                🏆
              </Box>
              <Typography variant="caption" color="text.secondary">Milestone</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Plans (${filteredPlans.length})`} icon={<EventNoteIcon />} iconPosition="start" />
          <Tab label={`My Study (${studyInRange.length})`} icon={<TimerIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        filteredPlans.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <EventNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={2}>
              {goalFilter === ALL_GOALS_FILTER
                ? 'No plans yet — create one on Planning or here'
                : 'No plans match this goal filter'}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Create Plan</Button>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'action.hover' } }}>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Goal</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlans.map((plan) => {
                  const status = getPlanStatusDisplay(plan);
                  return (
                    <TableRow key={plan.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={500}>{plan.title}</Typography></TableCell>
                      <TableCell><Chip label={getPlanTypeLabel(plan.type)} size="small" variant="outlined" /></TableCell>
                      <TableCell>{dayjs(plan.plannedDate).format('ddd, MMM D HH:mm')}</TableCell>
                      <TableCell>{plan.plannedDurationMinutes} min</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {plan.goalTitle || 'No goal'}
                        </Typography>
                      </TableCell>
                      <TableCell><Chip label={status.label} size="small" color={status.color} /></TableCell>
                      <TableCell align="right">
                        {plan.status === 'PLANNED' && (
                          <IconButton size="small" color="primary" onClick={() => navigate('/timer', { state: planToTimerState(plan) })}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {tab === 1 && (
        studyInRange.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <TimerIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              {goalFilter === ALL_GOALS_FILTER
                ? 'No study sessions in this period.'
                : 'No study sessions match this goal filter.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'action.hover' } }}>
                  <TableCell>Subject</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studyInRange.map((session) => {
                  const dateKey = getSessionDateKey(session);
                  return (
                    <TableRow
                      key={session.id}
                      hover
                      onClick={() => {
                        handleDayClick(
                          dayjs(dateKey),
                          sessionsByDate[dateKey] || [session],
                          plansByDate[dateKey] || []
                        );
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{session.subject || 'Study session'}</TableCell>
                      <TableCell>{dayjs(dateKey).format('ddd, MMM D')}</TableCell>
                      <TableCell>{formatStudyMinutes(Number(session.duration ?? 0))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <PlanSessionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleCreatePlan} goals={goals} saving={saving} />

      <DayDetailDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, day: null, sessions: [], plans: [] })}
        day={detailDialog.day}
        plans={detailDialog.plans}
        sessions={detailDialog.sessions}
        goals={goals}
        onPlansUpdated={handlePlansUpdated}
        onSessionsUpdated={handleSessionsUpdated}
      />
    </Box>
  );
};

export default SixMonthPlanPage;
