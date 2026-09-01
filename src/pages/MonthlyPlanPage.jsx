import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Divider,
  Paper,
  LinearProgress,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMilestones } from '../hooks/useMilestones';
import { useStudySessions } from '../hooks/useStudySessions';
import { usePlanSessions } from '../hooks/usePlanSessions';
import CalendarDayCell from '../components/CalendarDayCell';
import DayDetailDialog from '../components/DayDetailDialog';
import { dayjs } from '../utils/helpers';
import {
  groupSessionsByDate,
  getDayTotalSeconds,
  DAY_STUDY_STYLES,
  formatStudyMinutes,
  getCompletedSessions,
  getSessionDateKey,
  getSessionDurationSec,
} from '../utils/studyCalendar';
import { groupPlansByDate } from '../utils/planHelpers';
import {
  STANDALONE_GOAL_FILTER,
  ALL_GOALS_FILTER,
  MILESTONE_TYPES,
  MAX_MILESTONES_PER_GOAL,
  isStandaloneMilestone,
  matchesGoalFilter,
  milestoneMatchesGoalFilter,
  getMilestoneGoalLabel,
  getMilestoneTypeLabel,
  wouldExceedGoalMilestoneLimit,
} from '../utils/milestoneHelpers';

const EMPTY_MILESTONE = {
  title: '',
  description: '',
  dueDate: '',
  goalId: '',
  type: 'module_completion',
};

const MilestoneListItem = ({ milestone, goals, onToggle, onEdit, onDelete }) => {
  const isOverdue =
    milestone.dueDate &&
    dayjs(milestone.dueDate).isBefore(dayjs(), 'day') &&
    milestone.status !== 'completed';
  const standalone = isStandaloneMilestone(milestone);
  const goalLabel = getMilestoneGoalLabel(milestone, goals);
  const typeLabel = getMilestoneTypeLabel(milestone.type);

  return (
    <ListItem
      sx={{
        py: 1.5,
        opacity: milestone.status === 'completed' ? 0.7 : 1,
        bgcolor: isOverdue ? 'error.50' : 'inherit',
      }}
    >
      <Checkbox
        checked={milestone.status === 'completed'}
        onChange={() => onToggle(milestone)}
        color="success"
        sx={{ mr: 1 }}
      />
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant="body1"
              fontWeight={500}
              sx={{ textDecoration: milestone.status === 'completed' ? 'line-through' : 'none' }}
            >
              {milestone.title}
            </Typography>
            <Chip label={typeLabel} size="small" variant="outlined" sx={{ fontSize: 10 }} />
            <Chip
              label={goalLabel}
              size="small"
              color={standalone ? 'warning' : 'primary'}
              variant={standalone ? 'filled' : 'outlined'}
              sx={{ fontSize: 10 }}
            />
            {isOverdue && <Chip label="Overdue" size="small" color="error" sx={{ fontSize: 10 }} />}
          </Box>
        }
        secondary={
          <Box>
            {milestone.description && (
              <Typography variant="caption" color="text.secondary" display="block">
                {milestone.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {milestone.dueDate
                ? `Due: ${dayjs(milestone.dueDate).format('ddd, MMM D, YYYY')}`
                : 'No due date'}
            </Typography>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(milestone)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(milestone.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const MilestoneDialog = ({ open, onClose, onSave, initial, goals, milestones = [] }) => {
  const [form, setForm] = useState({ ...EMPTY_MILESTONE, dueDate: dayjs().format('YYYY-MM-DD') });
  const [limitError, setLimitError] = useState('');

  useEffect(() => {
    if (!open) return;
    const today = dayjs().format('YYYY-MM-DD');
    setLimitError('');
    setForm(
      initial
        ? {
            title: initial.title || '',
            description: initial.description || '',
            dueDate: initial.dueDate || today,
            goalId: initial.goalId ? String(initial.goalId) : '',
            type: initial.type || 'module_completion',
          }
        : { ...EMPTY_MILESTONE, dueDate: today }
    );
  }, [open, initial]);

  const handleChange = (field) => (e) => {
    setLimitError('');
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const exceedsLimit = wouldExceedGoalMilestoneLimit(milestones, form.goalId, {
    excludeId: initial?.id,
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (exceedsLimit) {
      setLimitError(`A goal can have at most ${MAX_MILESTONES_PER_GOAL} milestones.`);
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>{initial ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {(limitError || exceedsLimit) && (
            <Alert severity="warning">
              {limitError || `This goal already has ${MAX_MILESTONES_PER_GOAL} milestones.`}
            </Alert>
          )}
          <TextField
            label="Milestone Title *"
            value={form.title}
            onChange={handleChange('title')}
            fullWidth
            placeholder="e.g. Pass Statistics Midterm"
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={2}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Type"
                value={form.type}
                onChange={handleChange('type')}
                fullWidth
              >
                {MILESTONE_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Due Date"
                type="date"
                value={form.dueDate}
                onChange={handleChange('dueDate')}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
          <TextField
            select
            label="Related Goal"
            value={form.goalId}
            onChange={handleChange('goalId')}
            fullWidth
            error={exceedsLimit}
            helperText={
              exceedsLimit
                ? `Maximum ${MAX_MILESTONES_PER_GOAL} milestones per goal`
                : 'Choose Standalone for milestones not tied to a 6-month goal. You can link or unlink anytime.'
            }
          >
            <MenuItem value="">
              <em>Standalone — not linked to a goal</em>
            </MenuItem>
            {goals.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!form.title.trim() || exceedsLimit}
        >
          {initial ? 'Save Changes' : 'Add Milestone'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MonthlyPlanPage = () => {
  const {
    milestones,
    loading: milestonesLoading,
    error: milestonesError,
    addMilestone,
    updateMilestone,
    toggleMilestone,
    deleteMilestone,
  } = useMilestones();
  const { sessions, goals, loading, error, refresh } = useStudySessions();
  const { plans, loading: plansLoading, refresh: refreshPlans } = usePlanSessions();

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [tab, setTab] = useState(0);
  const [goalFilter, setGoalFilter] = useState(ALL_GOALS_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [detailDialog, setDetailDialog] = useState({ open: false, day: null, sessions: [], plans: [] });

  const monthKey = currentMonth.format('YYYY-MM');
  const completedSessions = useMemo(() => getCompletedSessions(sessions), [sessions]);

  const filteredSessions = useMemo(
    () => completedSessions.filter((s) => matchesGoalFilter(s, goalFilter)),
    [completedSessions, goalFilter]
  );
  const filteredPlans = useMemo(
    () => plans.filter((p) => matchesGoalFilter(p, goalFilter)),
    [plans, goalFilter]
  );

  const sessionsByDate = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions]);
  const plansByDate = useMemo(() => groupPlansByDate(filteredPlans), [filteredPlans]);

  const monthSessions = useMemo(
    () =>
      filteredSessions.filter((s) => {
        const key = getSessionDateKey(s);
        return key?.startsWith(monthKey);
      }),
    [filteredSessions, monthKey]
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

  const allMilestones = useMemo(
    () => [...milestones].sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate))),
    [milestones]
  );

  const standaloneCount = useMemo(
    () => milestones.filter(isStandaloneMilestone).length,
    [milestones]
  );

  const scopedMilestones = useMemo(() => {
    const base = allMilestones.filter(
      (m) => m.dueDate && dayjs(m.dueDate).format('YYYY-MM') === monthKey
    );
    return base.filter((m) => milestoneMatchesGoalFilter(m, goalFilter));
  }, [allMilestones, monthKey, goalFilter]);

  const groupedMilestones = useMemo(() => {
    if (goalFilter && goalFilter !== ALL_GOALS_FILTER) return null;
    const standalone = scopedMilestones.filter(isStandaloneMilestone);
    const linked = scopedMilestones.filter((m) => !isStandaloneMilestone(m));
    return { standalone, linked };
  }, [scopedMilestones, goalFilter]);

  const monthPlans = useMemo(
    () => filteredPlans.filter((p) => dayjs(p.plannedDate).format('YYYY-MM') === monthKey),
    [filteredPlans, monthKey]
  );

  const firstDay = currentMonth.startOf('month');
  const lastDay = currentMonth.endOf('month');
  const startPad = firstDay.day();
  const calDays = [];
  for (let i = 0; i < startPad; i++) calDays.push(null);
  for (let d = 0; d < lastDay.date(); d++) calDays.push(firstDay.add(d, 'day'));

  const monthTotalSec = monthSessions.reduce((sum, s) => sum + getSessionDurationSec(s), 0);
  const studyDays = Object.keys(sessionsByDate).filter((k) => k.startsWith(monthKey)).length;
  const planDays = Object.keys(plansByDate).filter((k) => k.startsWith(monthKey)).length;
  const completedMilestones = monthMilestones.filter((m) => m.status === 'completed').length;

  const handleSave = async (form) => {
    const payload = { ...form, goalId: form.goalId || '' };
    if (
      wouldExceedGoalMilestoneLimit(milestones, payload.goalId, {
        excludeId: editMilestone?.id,
      })
    ) {
      return;
    }
    try {
      if (editMilestone) {
        await updateMilestone(editMilestone.id, payload);
      } else {
        await addMilestone(payload);
      }
      setEditMilestone(null);
      setTab(1);
      setGoalFilter(payload.goalId ? String(payload.goalId) : STANDALONE_GOAL_FILTER);
    } catch {
      // Dialog already closed; list refresh shows current state
    }
  };

  const openEditMilestone = (milestone) => {
    setEditMilestone(milestone);
    setDialogOpen(true);
  };

  const handleToggleMilestone = async (m) => {
    try {
      await toggleMilestone(m);
    } catch {
      // ignore transient errors
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

  if (loading || plansLoading || milestonesLoading) {
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
          <Typography variant="h5" fontWeight={700}>
            Monthly Detail Plan
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Your actual study activity for {currentMonth.format('MMMM YYYY')} — click a day for details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Add Milestone
        </Button>
      </Box>

      {(error || milestonesError) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error || milestonesError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 180, textAlign: 'center' }}>
          {currentMonth.format('MMMM YYYY')}
        </Typography>
        <IconButton onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}>
          <ChevronRightIcon />
        </IconButton>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setCurrentMonth(dayjs().startOf('month'))}
        >
          Today
        </Button>
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
            sub: `${completedMilestones} completed`,
            color: 'warning',
          },
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                cursor: stat.label === 'Milestones' ? 'pointer' : 'default',
                transition: 'box-shadow 0.15s',
                '&:hover': stat.label === 'Milestones' ? { boxShadow: 2 } : {},
              }}
              onClick={stat.label === 'Milestones' ? () => setTab(1) : undefined}
            >
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

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          label="Filter by Goal"
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 260 }}
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
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Study Calendar" />
        <Tab label={`Milestones (${scopedMilestones.length})`} />
      </Tabs>

      {tab === 0 && monthMilestones.length > 0 && (
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
                  onClick={() => openEditMilestone(m)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
          </Box>
        </Paper>
      )}

      {tab === 0 && (
        <Card elevation={1} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
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
                const dayMilestones = milestones.filter(
                  (m) =>
                    m.dueDate === dayStr &&
                    milestoneMatchesGoalFilter(m, goalFilter)
                );
                const dayPlans = plansByDate[dayStr] || [];
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
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Box>
          {scopedMilestones.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EmojiEventsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>
                {goalFilter === STANDALONE_GOAL_FILTER
                  ? 'No standalone milestones'
                  : goalFilter !== ALL_GOALS_FILTER
                    ? 'No milestones for this goal'
                    : 'No milestones this month'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2} maxWidth={420} mx="auto">
                {goalFilter === STANDALONE_GOAL_FILTER
                  ? 'Standalone milestones are personal checkpoints not linked to a 6-month goal. Add one and pick "Standalone" in Related Goal.'
                  : 'Add a milestone or change the filter above.'}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                Add Milestone
              </Button>
            </Box>
          ) : groupedMilestones ? (
            <Paper elevation={1} sx={{ borderRadius: 3 }}>
              {groupedMilestones.standalone.length > 0 && (
                <>
                  <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                      Standalone — not linked to a goal ({groupedMilestones.standalone.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Personal monthly checkpoints. Link to a goal anytime via Edit.
                    </Typography>
                  </Box>
                  <List>
                    {groupedMilestones.standalone.map((m, idx) => (
                      <Box key={m.id}>
                        {idx > 0 && <Divider />}
                        <MilestoneListItem
                          milestone={m}
                          goals={goals}
                          onToggle={handleToggleMilestone}
                          onEdit={openEditMilestone}
                          onDelete={deleteMilestone}
                        />
                      </Box>
                    ))}
                  </List>
                </>
              )}
              {groupedMilestones.linked.length > 0 && (
                <>
                  {groupedMilestones.standalone.length > 0 && <Divider />}
                  <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      Linked to goals ({groupedMilestones.linked.length})
                    </Typography>
                  </Box>
                  <List>
                    {groupedMilestones.linked.map((m, idx) => (
                      <Box key={m.id}>
                        {idx > 0 && <Divider />}
                        <MilestoneListItem
                          milestone={m}
                          goals={goals}
                          onToggle={handleToggleMilestone}
                          onEdit={openEditMilestone}
                          onDelete={deleteMilestone}
                        />
                      </Box>
                    ))}
                  </List>
                </>
              )}
            </Paper>
          ) : (
            <Paper elevation={1} sx={{ borderRadius: 3 }}>
              <List>
                {scopedMilestones.map((m, idx) => (
                  <Box key={m.id}>
                    {idx > 0 && <Divider />}
                    <MilestoneListItem
                      milestone={m}
                      goals={goals}
                      onToggle={handleToggleMilestone}
                      onEdit={openEditMilestone}
                      onDelete={deleteMilestone}
                    />
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {scopedMilestones.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={
                  (scopedMilestones.filter((m) => m.status === 'completed').length / scopedMilestones.length) * 100
                }
                sx={{ height: 8, borderRadius: 4 }}
                color="success"
              />
            </Box>
          )}
        </Box>
      )}

      <MilestoneDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditMilestone(null);
        }}
        onSave={handleSave}
        initial={editMilestone}
        goals={goals}
        milestones={milestones}
      />

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

export default MonthlyPlanPage;
