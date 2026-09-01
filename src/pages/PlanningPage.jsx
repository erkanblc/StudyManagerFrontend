import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SearchIcon from '@mui/icons-material/Search';
import { usePlanSessions } from '../hooks/usePlanSessions';
import { fetchGoals } from '../api/goalsApi';
import {
  createPlanSession,
  updatePlanSession,
  deletePlanSession,
  completePlanSession,
} from '../api/planSessionsApi';
import PlanSessionDialog from '../components/PlanSessionDialog';
import { dayjs, getApiErrorMessage } from '../utils/helpers';
import { ALL_GOALS_FILTER, STANDALONE_GOAL_FILTER, matchesGoalFilter } from '../utils/milestoneHelpers';
import {
  formToPlanRequest,
  getPlanTypeLabel,
  getPlanStatusDisplay,
  isPlanMissed,
  planToTimerState,
} from '../utils/planHelpers';
import { useEffect } from 'react';

const PlanningPage = () => {
  const navigate = useNavigate();
  const { plans, loading, error, refresh } = usePlanSessions();
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [filterGoal, setFilterGoal] = useState(ALL_GOALS_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchGoals().then((g) => setGoals(Array.isArray(g) ? g : [])).catch(() => setGoals([]));
  }, []);

  const upcoming = useMemo(
    () => plans.filter((p) => p.status === 'PLANNED').sort((a, b) => dayjs(a.plannedDate).diff(dayjs(b.plannedDate))),
    [plans]
  );

  const history = useMemo(
    () =>
      plans
        .filter((p) => p.status === 'COMPLETED' || p.status === 'MISSED' || isPlanMissed(p))
        .sort((a, b) => dayjs(b.plannedDate).diff(dayjs(a.plannedDate))),
    [plans]
  );

  const list = tab === 0 ? upcoming : history;

  const noGoalCount = useMemo(
    () => list.filter((p) => p?.goalId == null || p?.goalId === '').length,
    [list]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter((p) => {
      if (!matchesGoalFilter(p, filterGoal)) return false;
      return (
        p.title?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.goalTitle?.toLowerCase().includes(q)
      );
    });
  }, [list, search, filterGoal]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = formToPlanRequest(form, goals);
      if (editPlan) {
        await updatePlanSession(editPlan.id, payload);
        setSnack({ open: true, message: 'Plan updated.', severity: 'success' });
      } else {
        await createPlanSession(payload);
        setSnack({ open: true, message: 'Plan created.', severity: 'success' });
      }
      await refresh();
      setDialogOpen(false);
      setEditPlan(null);
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to save plan.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.title}"?`)) return;
    try {
      await deletePlanSession(plan.id);
      await refresh();
      setSnack({ open: true, message: 'Plan deleted.', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to delete plan.', severity: 'error' });
    }
  };

  const handleComplete = async (plan) => {
    try {
      await completePlanSession(plan.id);
      await refresh();
      setSnack({ open: true, message: 'Plan marked completed.', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to complete plan.', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Planning</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Create and manage your study plans — start timer directly from a plan
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New Plan
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'primary' },
          { label: 'Completed', value: plans.filter((p) => p.status === 'COMPLETED').length, color: 'success' },
          { label: 'Total Plans', value: plans.length, color: 'secondary' },
        ].map((s) => (
          <Grid size={{ xs: 12, sm: 4 }} key={s.label}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight={700} color={`${s.color}.main`}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Plan History (${history.length})`} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField select label="Goal" value={filterGoal} onChange={(e) => setFilterGoal(e.target.value)} size="small" sx={{ minWidth: 180 }}>
          <MenuItem value={ALL_GOALS_FILTER}>All Goals</MenuItem>
          <MenuItem value={STANDALONE_GOAL_FILTER}>No goal ({noGoalCount})</MenuItem>
          {goals.map((g) => (
            <MenuItem key={g.id} value={String(g.id)}>
              {g.title}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EventNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={2}>
            {tab === 0 ? 'No upcoming plans' : 'No plan history yet'}
          </Typography>
          {tab === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Create First Plan
            </Button>
          )}
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
              {filtered.map((plan) => {
                const status = getPlanStatusDisplay(plan);
                return (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{plan.title}</Typography>
                      {plan.notes && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                          {plan.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell><Chip label={getPlanTypeLabel(plan.type)} size="small" variant="outlined" /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{dayjs(plan.plannedDate).format('ddd, MMM D, YYYY')}</Typography>
                      <Typography variant="caption" color="text.secondary">{dayjs(plan.plannedDate).format('HH:mm')}</Typography>
                    </TableCell>
                    <TableCell>{plan.plannedDurationMinutes} min</TableCell>
                    <TableCell>{plan.goalTitle || 'No goal'}</TableCell>
                    <TableCell><Chip label={status.label} size="small" color={status.color} /></TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                        {plan.status === 'PLANNED' && (
                          <>
                            <Tooltip title="Start Timer">
                              <IconButton size="small" color="primary" onClick={() => navigate('/timer', { state: planToTimerState(plan) })}>
                                <PlayArrowIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark completed">
                              <IconButton size="small" color="success" onClick={() => handleComplete(plan)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditPlan(plan); setDialogOpen(true); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(plan)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PlanSessionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditPlan(null); }}
        onSave={handleSave}
        initial={editPlan}
        goals={goals}
        saving={saving}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PlanningPage;
