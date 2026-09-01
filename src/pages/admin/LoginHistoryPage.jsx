import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import {
  fetchAllUsers,
  fetchLoginHistoryByUser,
  updateLoginHistory,
  deleteLoginHistory,
  deleteAllLoginHistory,
} from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { dayjs } from '../../utils/helpers';
import { getDaysSinceLogin } from '../../utils/loginGapHelpers';

const getUserLabel = (user) =>
  user.fullName?.trim() ||
  user.username ||
  user.email?.split('@')[0] ||
  `User #${user.id}`;

const toInputDateTime = (value) =>
  value ? dayjs(value).format('YYYY-MM-DDTHH:mm') : '';

const toApiDateTime = (value) => (value ? dayjs(value).toISOString() : null);

const EditDialog = ({ open, onClose, entry, onSave, saving }) => {
  const [loginAt, setLoginAt] = useState('');

  useEffect(() => {
    setLoginAt(toInputDateTime(entry?.loginAt));
  }, [entry]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Edit Login Time</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Record #{entry?.id}
        </Typography>
        <TextField
          label="Login At"
          type="datetime-local"
          value={loginAt}
          onChange={(e) => setLoginAt(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          helperText="Used for inactivity reminders on next login"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!loginAt || saving}
          onClick={() => onSave(toApiDateTime(loginAt))}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteAllDialog = ({ open, onClose, userLabel, onConfirm, deleting }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle fontWeight={600} color="error">
      Delete All Login History
    </DialogTitle>
    <DialogContent>
      <Typography>
        Delete all login records for <strong>{userLabel}</strong>? This cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={deleting}>
        Cancel
      </Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={deleting}>
        {deleting ? 'Deleting…' : 'Delete All'}
      </Button>
    </DialogActions>
  </Dialog>
);

const LoginHistoryPage = () => {
  const { user: adminUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, entry: null });
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAllUsers(adminUser.token);
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Failed to load users.');
    }
  }, [adminUser.token]);

  const loadHistory = useCallback(async () => {
    if (!selectedUserId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await fetchLoginHistoryByUser(adminUser.token, selectedUserId);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      showSnack('Failed to load login history.', 'error');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [adminUser.token, selectedUserId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadUsers();
      setLoading(false);
    };
    init();
  }, [loadUsers]);

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) setSelectedUserId(userId);
  }, [searchParams]);

  useEffect(() => {
    if (!loading) loadHistory();
  }, [loading, loadHistory]);

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) => dayjs(b.loginAt).valueOf() - dayjs(a.loginAt).valueOf()
      ),
    [history]
  );

  const stats = useMemo(() => {
    if (sortedHistory.length === 0) {
      return { total: 0, lastLogin: null, daysSince: null, previousLogin: null };
    }
    const sorted = sortedHistory;
    const lastLogin = sorted[0]?.loginAt;
    const previousLogin = sorted[1]?.loginAt ?? null;
    return {
      total: sortedHistory.length,
      lastLogin,
      previousLogin,
      daysSince: getDaysSinceLogin(previousLogin || lastLogin),
    };
  }, [sortedHistory]);

  const handleSave = async (loginAt) => {
    const entry = editDialog.entry;
    setSaving(true);
    try {
      await updateLoginHistory(adminUser.token, entry.id, loginAt);
      await loadHistory();
      showSnack('Login time updated.');
      setEditDialog({ open: false, entry: null });
    } catch {
      showSnack('Failed to update login time.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    try {
      await deleteLoginHistory(adminUser.token, entry.id);
      setHistory((prev) => prev.filter((h) => h.id !== entry.id));
      showSnack('Login record deleted.');
    } catch {
      showSnack('Failed to delete record.', 'error');
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await deleteAllLoginHistory(adminUser.token, selectedUserId);
      setHistory([]);
      showSnack('All login history deleted.');
      setDeleteAllOpen(false);
    } catch {
      showSnack('Failed to delete history.', 'error');
    } finally {
      setDeletingAll(false);
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Login History
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          View and edit user login timestamps — affects inactivity reminders on next sign-in
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <TextField
            select
            label="Select User"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            size="small"
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="">
              <em>Choose a user…</em>
            </MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {getUserLabel(u)} ({u.email})
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      {selectedUser && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card elevation={1} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Selected User
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {getUserLabel(selectedUser)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card elevation={1} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981' }}>
                  <LoginIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Logins
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {stats.total}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card elevation={1} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#f59e0b20', color: '#f59e0b' }}>
                  <HistoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Login
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.lastLogin
                      ? dayjs(stats.lastLogin).format('MMM D, YYYY HH:mm')
                      : '—'}
                  </Typography>
                  {stats.previousLogin && (
                    <Typography variant="caption" color="text.secondary">
                      Previous gap: {getDaysSinceLogin(stats.previousLogin) ?? '—'} days
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Login Records
            </Typography>
            {selectedUserId && history.length > 0 && (
              <Button
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setDeleteAllOpen(true)}
              >
                Delete All
              </Button>
            )}
          </Box>

          {!selectedUserId ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">Select a user to view login history</Typography>
            </Box>
          ) : historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#f8fafc' } }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Login At</TableCell>
                    <TableCell>Days Ago</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography color="text.disabled">No login records for this user</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedHistory.map((entry, idx) => {
                    const daysAgo = dayjs().startOf('day').diff(dayjs(entry.loginAt).startOf('day'), 'day');
                    const isLatest = idx === 0;
                    return (
                      <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            #{entry.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {dayjs(entry.loginAt).format('ddd, MMM D, YYYY · HH:mm:ss')}
                            </Typography>
                            {isLatest && (
                              <Chip label="Latest" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}
                            size="small"
                            variant="outlined"
                            color={daysAgo > 20 ? 'error' : daysAgo > 2 ? 'warning' : 'default'}
                            sx={{ fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit login time">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setEditDialog({ open: true, entry })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete record">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(entry)}
                            >
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

          {selectedUserId && history.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              On next login, the user sees the <strong>previous</strong> record as{' '}
              <code>lastLoginAt</code>. Edit the second-newest entry to test inactivity snackbars.
            </Alert>
          )}
        </CardContent>
      </Card>

      <EditDialog
        open={editDialog.open}
        onClose={() => !saving && setEditDialog({ open: false, entry: null })}
        entry={editDialog.entry}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteAllDialog
        open={deleteAllOpen}
        onClose={() => !deletingAll && setDeleteAllOpen(false)}
        userLabel={selectedUser ? getUserLabel(selectedUser) : ''}
        onConfirm={handleDeleteAll}
        deleting={deletingAll}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginHistoryPage;
