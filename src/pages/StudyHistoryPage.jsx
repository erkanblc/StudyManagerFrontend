import { useMemo, useState } from 'react';
import {
  Box,
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
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { useStudySessions } from '../hooks/useStudySessions';
import SessionEditDialog from '../components/SessionEditDialog';
import ManualSessionDialog from '../components/ManualSessionDialog';
import { updateSession, deleteSession, createManualSession } from '../api/sessionsApi';
import { dayjs, formatDuration, formatHours, getApiErrorMessage } from '../utils/helpers';
import {
  getCompletedSessions,
  getSessionDateKey,
  getSessionDurationSec,
  formatStudyMinutes,
} from '../utils/studyCalendar';

const DeleteSessionDialog = ({ open, session, goals = [], onClose, onConfirm, deleting }) => {
  if (!session) return null;

  const goal = goals.find((g) => String(g.id) === String(session.goalId));
  const dateKey = getSessionDateKey(session);
  const duration = formatDuration(getSessionDurationSec(session));
  const dateLabel = dateKey
    ? dayjs(session.startTime || dateKey).format('ddd, MMM D, YYYY · HH:mm')
    : 'Unknown date';

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Delete study session?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This will permanently remove the session from your study history. This action cannot be undone.
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" fontWeight={600}>
            {duration}
            {session.subject ? ` · ${session.subject}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {dateLabel}
          </Typography>
          {goal && (
            <Typography variant="caption" color="primary.main" display="block">
              Goal: {goal.title}
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
          Delete session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const StudyHistoryPage = () => {
  const { sessions, goals, loading, error, refresh } = useStudySessions();
  const [search, setSearch] = useState('');
  const [filterGoal, setFilterGoal] = useState('');
  const [editSession, setEditSession] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const completed = useMemo(() => getCompletedSessions(sessions), [sessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return completed
      .filter((s) => {
        if (filterGoal && String(s.goalId) !== String(filterGoal)) return false;
        const goal = goals.find((g) => String(g.id) === String(s.goalId));
        return (
          s.subject?.toLowerCase().includes(q) ||
          s.notes?.toLowerCase().includes(q) ||
          goal?.title?.toLowerCase().includes(q) ||
          getSessionDateKey(s)?.includes(q)
        );
      })
      .sort((a, b) => {
        const aAdded = dayjs(a.createdAt || a.date || 0).valueOf() || Number(a.id) || 0;
        const bAdded = dayjs(b.createdAt || b.date || 0).valueOf() || Number(b.id) || 0;
        if (bAdded !== aAdded) return bAdded - aAdded;
        return Number(b.id) - Number(a.id);
      });
  }, [completed, search, filterGoal, goals]);

  const totalSeconds = filtered.reduce((sum, s) => sum + getSessionDurationSec(s), 0);

  const handleSave = async (data) => {
    if (!editSession) return;
    setSaving(true);
    try {
      await updateSession(editSession.id, data);
      setSnack({ open: true, message: 'Session updated.', severity: 'success' });
      setEditSession(null);
      await refresh();
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSession(deleteTarget.id);
      setSnack({ open: true, message: 'Study session deleted.', severity: 'success' });
      setDeleteTarget(null);
      await refresh();
    } catch {
      setSnack({ open: true, message: 'Failed to delete session.', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleManualAdd = async (data) => {
    setSaving(true);
    try {
      await createManualSession(data);
      setSnack({ open: true, message: 'Study time added.', severity: 'success' });
      setManualOpen(false);
      await refresh();
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Failed to add session.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Study History
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            All your recorded study sessions — add offline time or edit details anytime
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setManualOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Add Study Time
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Sessions', value: filtered.length, sub: 'recorded' },
          { label: 'Total Time', value: formatStudyMinutes(totalSeconds), sub: `${formatHours(totalSeconds)} hours` },
          { label: 'This Month', value: completed.filter((s) => getSessionDateKey(s)?.startsWith(dayjs().format('YYYY-MM'))).length, sub: 'sessions' },
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h4" fontWeight={700} color="primary">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search subject, notes, date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Goal"
          value={filterGoal}
          onChange={(e) => setFilterGoal(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All Goals</MenuItem>
          {goals.map((g) => (
            <MenuItem key={g.id} value={String(g.id)}>{g.title}</MenuItem>
          ))}
        </TextField>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No study sessions found
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setManualOpen(true)}
            sx={{ mt: 2 }}
          >
            Add Study Time
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'action.hover' } }}>
                <TableCell>Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Goal</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((session) => {
                const goal = goals.find((g) => String(g.id) === String(session.goalId));
                const dateKey = getSessionDateKey(session);
                const dur = getSessionDurationSec(session);

                return (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {dayjs(dateKey).format('ddd, MMM D, YYYY')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.startTime ? dayjs(session.startTime).format('HH:mm') : ''}
                        {session.status === 'MANUAL' ? ' · Manual' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatDuration(dur)}
                        size="small"
                        color="primary"
                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{session.subject || '—'}</TableCell>
                    <TableCell>{goal?.title || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                        {session.notes || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditSession(session)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(session)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ManualSessionDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        goals={goals}
        onSave={handleManualAdd}
        saving={saving}
      />

      <SessionEditDialog
        open={Boolean(editSession)}
        onClose={() => setEditSession(null)}
        session={editSession}
        goals={goals}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteSessionDialog
        open={Boolean(deleteTarget)}
        session={deleteTarget}
        goals={goals}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
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
    </Box>
  );
};

export default StudyHistoryPage;
