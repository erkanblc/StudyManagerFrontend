import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Snackbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  LinearProgress,
  Divider,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  toggleMilestone,
  deleteMilestone,
} from '../api/goalsApi';
import { dayjs, getApiErrorMessage } from '../utils/helpers';
import {
  getDefaultGoalDates,
  getEndDateFromStart,
  isGoalDateRangeValid,
  getMilestoneProgress,
  formatGoalPeriod,
  GOAL_STATUSES,
  getGoalStatusMeta,
  normalizeGoalStatus,
  getGoalStatusTabIndex,
  isGoalCompletedStatus,
  isGoalInProgressStatus,
  isGoalOverdueStatus,
  isGoalOngoingStatus,
  isGoalCancelledOrArchivedStatus,
} from '../utils/goalHelpers';
import {
  MAX_MILESTONES_PER_GOAL,
  isGoalMilestoneLimitReached,
} from '../utils/milestoneHelpers';

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  targetHours: '',
};

const GoalDialog = ({ open, onClose, onSave, initial, saving }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      const defaults = getDefaultGoalDates();
      setForm(
        initial
          ? {
              title: initial.title || '',
              description: initial.description || '',
              status: normalizeGoalStatus(initial.status),
              startDate: initial.startDate || '',
              endDate: initial.endDate || '',
              targetHours:
                initial.targetHours != null && Number(initial.targetHours) >= 0
                  ? String(initial.targetHours)
                  : '',
            }
          : { ...EMPTY_FORM, ...defaults }
      );
    }
  }, [open, initial]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleTargetHoursChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setForm((f) => ({ ...f, targetHours: '' }));
      return;
    }
    // Block minus / scientific notation leftovers that yield negatives
    const cleaned = String(raw).replace(/-/g, '');
    if (cleaned === '') {
      setForm((f) => ({ ...f, targetHours: '' }));
      return;
    }
    const n = Number(cleaned);
    if (Number.isNaN(n) || n < 0) return;
    setForm((f) => ({ ...f, targetHours: cleaned }));
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleStartDateChange = (e) => {
    const startDate = e.target.value;
    setForm((f) => ({
      ...f,
      startDate,
      endDate: startDate ? getEndDateFromStart(startDate) : f.endDate,
    }));
  };

  const handleEndDateChange = (e) => {
    const endDate = e.target.value;
    setForm((f) => {
      if (f.startDate && endDate && dayjs(endDate).isBefore(dayjs(f.startDate), 'day')) {
        return { ...f, endDate: f.startDate };
      }
      return { ...f, endDate };
    });
  };

  const datesInvalid = !isGoalDateRangeValid(form.startDate, form.endDate);
  const targetHoursNum = form.targetHours === '' ? null : Number(form.targetHours);
  const targetHoursInvalid =
    form.targetHours !== '' && (Number.isNaN(targetHoursNum) || targetHoursNum < 0);

  const handleSubmit = () => {
    if (!form.title.trim() || datesInvalid || targetHoursInvalid) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      targetHours:
        form.targetHours !== '' && !Number.isNaN(targetHoursNum) && targetHoursNum >= 0
          ? targetHoursNum
          : null,
    };
    if (initial) {
      payload.status = normalizeGoalStatus(form.status);
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>{initial ? 'Edit Goal' : 'New Learning Goal'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="info">
            Set a 6-month period and target hours. Active goals appear in Study Timer.
          </Alert>
          <TextField
            label="Goal Title *"
            value={form.title}
            onChange={handleChange('title')}
            fullWidth
            placeholder="e.g. Learn React"
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={3}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={handleStartDateChange}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                inputProps={{ max: form.endDate || undefined }}
                error={datesInvalid}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={handleEndDateChange}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                inputProps={{ min: form.startDate || undefined }}
                error={datesInvalid}
                helperText={datesInvalid ? 'End date must be on or after start date' : 'Auto-set to 6 months after start'}
              />
            </Grid>
          </Grid>
          <TextField
            label="Target Hours"
            type="number"
            value={form.targetHours}
            onChange={handleTargetHoursChange}
            onKeyDown={blockNegativeKeys}
            fullWidth
            inputProps={{ min: 0, step: 0.5 }}
            placeholder="e.g. 120"
            error={targetHoursInvalid}
            helperText={targetHoursInvalid ? 'Target hours cannot be negative' : undefined}
          />
          {initial && (
            <TextField
              select
              label="Status"
              value={normalizeGoalStatus(form.status)}
              onChange={handleChange('status')}
              fullWidth
            >
              {GOAL_STATUSES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!form.title.trim() || saving || datesInvalid || targetHoursInvalid}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {initial ? 'Save Changes' : 'Create Goal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const GoalCard = ({
  goal,
  onEdit,
  onDelete,
  onComplete,
  onAddMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  milestoneBusy,
}) => {
  const statusMeta = getGoalStatusMeta(goal.status);
  const { completed, total } = getMilestoneProgress(goal);
  const period = formatGoalPeriod(goal);
  const [newMilestone, setNewMilestone] = useState('');
  const atMilestoneLimit = isGoalMilestoneLimitReached(goal);

  const handleAddMilestone = async () => {
    if (!newMilestone.trim() || atMilestoneLimit) return;
    await onAddMilestone(goal.id, newMilestone.trim());
    setNewMilestone('');
  };

  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isGoalCompletedStatus(goal.status) ? 'success.light' : 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ p: 2.5, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Chip label="Learning Goal" size="small" variant="outlined" color="primary" sx={{ fontSize: 11 }} />
          <Chip label={statusMeta.label} size="small" color={statusMeta.color} sx={{ fontSize: 11 }} />
        </Box>

        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
          {goal.title}
        </Typography>

        {goal.description && (
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            {goal.description}
          </Typography>
        )}

        {period && (
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {period}
          </Typography>
        )}
        {goal.targetHours != null && (
          <Typography variant="caption" color="primary.main" display="block" mb={1}>
            Target: {goal.targetHours}h
          </Typography>
        )}

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Milestones
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {completed}/{total}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={total ? (completed / total) * 100 : 0}
            sx={{ height: 6, borderRadius: 3 }}
            color="secondary"
          />
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
          Interim goals
        </Typography>

        <List dense disablePadding sx={{ mb: 1 }}>
          {(goal.milestones || []).map((m) => (
            <ListItem
              key={m.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  color="error"
                  disabled={milestoneBusy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteMilestone(goal, m);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                dense
                disabled={milestoneBusy}
                onClick={() => onToggleMilestone(goal.id, m.id)}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox edge="start" checked={Boolean(m.completed)} disableRipple tabIndex={-1} />
                </ListItemIcon>
                <ListItemText
                  primary={m.title}
                  primaryTypographyProps={{
                    variant: 'body2',
                    sx: { textDecoration: m.completed ? 'line-through' : 'none' },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {(goal.milestones || []).length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
              No milestones yet
            </Typography>
          )}
        </List>

        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder={
                atMilestoneLimit
                  ? `Limit reached (${MAX_MILESTONES_PER_GOAL} max)`
                  : 'Add milestone...'
              }
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              fullWidth
              disabled={milestoneBusy || atMilestoneLimit}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleAddMilestone}
              disabled={!newMilestone.trim() || milestoneBusy || atMilestoneLimit}
            >
              Add
            </Button>
          </Box>
          {atMilestoneLimit && (
            <Typography variant="caption" color="warning.main">
              Maximum {MAX_MILESTONES_PER_GOAL} milestones per goal.
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
        {isGoalOngoingStatus(goal.status) && (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => onComplete(goal)}
            sx={{ flex: 1 }}
          >
            Mark Done
          </Button>
        )}
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(goal)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(goal)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

const DeleteGoalDialog = ({ open, goal, onClose, onConfirm, deleting }) => {
  if (!goal) return null;

  const milestoneCount = goal.milestoneCount ?? goal.milestones?.length ?? 0;
  const period = formatGoalPeriod(goal);
  const statusMeta = getGoalStatusMeta(goal.status);

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Delete learning goal?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This will permanently remove the goal
          {milestoneCount > 0
            ? ` and its ${milestoneCount} linked milestone${milestoneCount === 1 ? '' : 's'}`
            : ''}
          . This action cannot be undone.
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" fontWeight={600}>
            {goal.title}
          </Typography>
          {period && (
            <Typography variant="caption" color="text.secondary" display="block">
              {period}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            Status: {statusMeta.label}
            {goal.targetHours != null ? ` · Target: ${goal.targetHours}h` : ''}
            {milestoneCount > 0 ? ` · ${milestoneCount} milestone${milestoneCount === 1 ? '' : 's'}` : ''}
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
        >
          Delete goal
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteMilestoneDialog = ({ open, goalTitle, milestone, onClose, onConfirm, deleting }) => {
  if (!milestone) return null;

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Delete interim goal?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This will permanently remove this interim goal. This action cannot be undone.
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" fontWeight={600}>
            {milestone.title}
          </Typography>
          {goalTitle && (
            <Typography variant="caption" color="primary.main" display="block">
              Goal: {goalTitle}
            </Typography>
          )}
          {milestone.completed && (
            <Typography variant="caption" color="text.secondary" display="block">
              Status: Completed
            </Typography>
          )}
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
        >
          Delete interim goal
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [milestoneBusy, setMilestoneBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMilestoneTarget, setDeleteMilestoneTarget] = useState(null);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const loadGoals = useCallback(async () => {
    try {
      const data = await fetchGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch {
      setSnack({ open: true, message: 'Failed to load goals.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const replaceGoalInList = (updatedGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editGoal) {
        await updateGoal(editGoal.id, form);
        const statusMeta = getGoalStatusMeta(form.status);
        setSnack({
          open: true,
          message: `Goal updated · Status: ${statusMeta.label}`,
          severity: 'success',
        });
        if (form.status) {
          setTab(getGoalStatusTabIndex(form.status));
        }
      } else {
        await createGoal(form);
        setSnack({ open: true, message: 'Goal created.', severity: 'success' });
      }
      await loadGoals();
      setEditGoal(null);
      setDialogOpen(false);
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to save goal.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (goal) => {
    try {
      await updateGoal(goal.id, { status: 'COMPLETED' });
      await loadGoals();
      setSnack({ open: true, message: 'Goal marked as completed.', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to update goal.', severity: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGoal(deleteTarget.id);
      setDeleteTarget(null);
      await loadGoals();
      setSnack({ open: true, message: 'Learning goal deleted.', severity: 'success' });
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to delete goal.'),
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMilestone = async (goalId, title) => {
    const goal = goals.find((g) => String(g.id) === String(goalId));
    if (goal && isGoalMilestoneLimitReached(goal)) {
      setSnack({
        open: true,
        message: `A goal can have at most ${MAX_MILESTONES_PER_GOAL} milestones.`,
        severity: 'warning',
      });
      return;
    }
    setMilestoneBusy(true);
    try {
      const updated = await createMilestone(goalId, { title });
      replaceGoalInList(updated);
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to add milestone.'),
        severity: 'error',
      });
    } finally {
      setMilestoneBusy(false);
    }
  };

  const handleToggleMilestone = async (goalId, milestoneId) => {
    setMilestoneBusy(true);
    try {
      const updated = await toggleMilestone(goalId, milestoneId);
      replaceGoalInList(updated);
    } catch {
      setSnack({ open: true, message: 'Failed to update milestone.', severity: 'error' });
    } finally {
      setMilestoneBusy(false);
    }
  };

  const handleConfirmDeleteMilestone = async () => {
    if (!deleteMilestoneTarget) return;
    const { goalId, milestone } = deleteMilestoneTarget;
    setMilestoneBusy(true);
    try {
      const updated = await deleteMilestone(goalId, milestone.id);
      replaceGoalInList(updated);
      setDeleteMilestoneTarget(null);
      setSnack({ open: true, message: 'Interim goal deleted.', severity: 'success' });
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to delete interim goal.'),
        severity: 'error',
      });
    } finally {
      setMilestoneBusy(false);
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (tab === 0) return isGoalInProgressStatus(g.status);
    if (tab === 1) return isGoalOverdueStatus(g.status);
    if (tab === 2) return isGoalCompletedStatus(g.status);
    if (tab === 3) return isGoalCancelledOrArchivedStatus(g.status);
    return true;
  });

  const emptyMessage =
    tab === 0
      ? 'No in-progress goals yet'
      : tab === 1
        ? 'No overdue goals'
        : tab === 2
          ? 'No completed goals yet'
          : tab === 3
            ? 'No cancelled or archived goals'
            : 'No goals defined yet';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Learning Goals
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            6-month goals with target hours and interim milestones
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
          New Goal
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`In Progress (${goals.filter((g) => isGoalInProgressStatus(g.status)).length})`} />
        <Tab label={`Overdue (${goals.filter((g) => isGoalOverdueStatus(g.status)).length})`} />
        <Tab label={`Completed (${goals.filter((g) => isGoalCompletedStatus(g.status)).length})`} />
        <Tab label={`Closed (${goals.filter((g) => isGoalCancelledOrArchivedStatus(g.status)).length})`} />
        <Tab label={`All (${goals.length})`} />
      </Tabs>

      {filteredGoals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FlagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={1}>
            {emptyMessage}
          </Typography>
          {tab === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ mt: 2 }}>
              Add Your First Goal
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filteredGoals.map((goal) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={goal.id}>
              <GoalCard
                goal={goal}
                onEdit={(g) => { setEditGoal(g); setDialogOpen(true); }}
                onDelete={setDeleteTarget}
                onComplete={handleComplete}
                onAddMilestone={handleAddMilestone}
                onToggleMilestone={handleToggleMilestone}
                onDeleteMilestone={(goal, milestone) =>
                  setDeleteMilestoneTarget({ goalId: goal.id, goalTitle: goal.title, milestone })
                }
                milestoneBusy={milestoneBusy}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <GoalDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditGoal(null); }}
        onSave={handleSave}
        initial={editGoal}
        saving={saving}
      />

      <DeleteGoalDialog
        open={Boolean(deleteTarget)}
        goal={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />

      <DeleteMilestoneDialog
        open={Boolean(deleteMilestoneTarget)}
        goalTitle={deleteMilestoneTarget?.goalTitle}
        milestone={deleteMilestoneTarget?.milestone}
        onClose={() => setDeleteMilestoneTarget(null)}
        onConfirm={handleConfirmDeleteMilestone}
        deleting={milestoneBusy}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GoalsPage;
