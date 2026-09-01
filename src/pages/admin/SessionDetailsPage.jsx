import { useCallback, useEffect, useMemo, useState } from 'react';
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
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Tabs,
  Tab,
  Avatar,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FlagIcon from '@mui/icons-material/Flag';
import TimerIcon from '@mui/icons-material/Timer';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import { fetchAllUsers, fetchAllGoalsAdmin } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { dayjs } from '../../utils/helpers';
import {
  getGoalStatusMeta,
  isGoalActiveStatus,
  isGoalCompletedStatus,
  isGoalInProgressStatus,
  isGoalOverdueStatus,
  isGoalCancelledOrArchivedStatus,
} from '../../utils/goalHelpers';

const isGoalCancelledOrArchived = isGoalCancelledOrArchivedStatus;

const ROWS_PER_PAGE = 5;

const getUserLabel = (user) =>
  user.fullName?.trim() ||
  user.username ||
  user.email?.split('@')[0] ||
  `User #${user.id}`;

const SessionDetailsPage = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [page, setPage] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'error' });

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAllUsers(adminUser.token);
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Failed to load users. Make sure the backend is running.');
    }
  }, [adminUser.token]);

  const loadGoals = useCallback(
    async (userId) => {
      setGoalsLoading(true);
      try {
        const data = await fetchAllGoalsAdmin(
          adminUser.token,
          userId ? Number(userId) : null
        );
        setGoals(Array.isArray(data) ? data : []);
      } catch {
        setSnack({ open: true, msg: 'Failed to load goals.', severity: 'error' });
        setGoals([]);
      } finally {
        setGoalsLoading(false);
      }
    },
    [adminUser.token]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadUsers();
      setLoading(false);
    };
    init();
  }, [loadUsers]);

  useEffect(() => {
    if (!loading) {
      loadGoals(selectedUserId);
    }
  }, [loading, selectedUserId, loadGoals]);

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  const filteredByTab = goals.filter((g) => {
    if (tab === 1) return isGoalInProgressStatus(g.status);
    if (tab === 2) return isGoalOverdueStatus(g.status);
    if (tab === 3) return isGoalCompletedStatus(g.status);
    if (tab === 4) return isGoalCancelledOrArchived(g.status);
    return true;
  });

  const filtered = filteredByTab.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.title?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.userEmail?.toLowerCase().includes(q) ||
      g.userFullName?.toLowerCase().includes(q) ||
      g.createdByUsername?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(0);
  }, [tab, search, selectedUserId]);

  const activeCount = goals.filter((g) => isGoalActiveStatus(g.status)).length;
  const usersWithGoals = useMemo(
    () => new Set(goals.map((g) => g.userId)).size,
    [goals]
  );

  const paginated = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return filtered.slice(start, start + ROWS_PER_PAGE);
  }, [filtered, page]);

  const showPagination = filtered.length > ROWS_PER_PAGE;

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
          User Goals
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          View goals across all users. Select a user to filter their goals.
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {selectedUserId ? 'Selected User Goals' : 'Total Goals'}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {goals.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <TimerIcon color="success" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Active (in dropdown)
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {activeCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FlagIcon color="secondary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Users with Goals
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {selectedUserId ? 1 : usersWithGoals}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={1} sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                select
                label="Select User"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">
                  <em>All users</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>
                    {getUserLabel(u)} — {u.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {selectedUser && (
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                    {getUserLabel(selectedUser)[0]?.toUpperCase() || <PersonIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {getUserLabel(selectedUser)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedUser.email}
                      {selectedUser.username ? ` · @${selectedUser.username}` : ''}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label={`All (${goals.length})`} />
              <Tab label={`In Progress (${goals.filter((g) => isGoalInProgressStatus(g.status)).length})`} />
              <Tab label={`Overdue (${goals.filter((g) => isGoalOverdueStatus(g.status)).length})`} />
              <Tab label={`Completed (${goals.filter((g) => isGoalCompletedStatus(g.status)).length})`} />
              <Tab label={`Closed (${goals.filter((g) => isGoalCancelledOrArchived(g.status)).length})`} />
            </Tabs>
            <TextField
              placeholder="Search title, description, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
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
          </Box>

          {goalsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    {!selectedUserId && <TableCell>User</TableCell>}
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={selectedUserId ? 5 : 6}
                        align="center"
                        sx={{ py: 6 }}
                      >
                        <FlagIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">
                          {selectedUserId
                            ? `${getUserLabel(selectedUser)} has no goals yet.`
                            : goals.length === 0
                              ? 'No goals found across all users.'
                              : 'No goals match your search.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((goal) => {
                      const statusMeta = getGoalStatusMeta(goal.status);
                      return (
                        <TableRow key={goal.id} hover>
                          {!selectedUserId && (
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {goal.userFullName || goal.createdByUsername || '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {goal.userEmail || '—'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {goal.title}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {goal.description || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusMeta.label}
                              size="small"
                              color={statusMeta.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {goal.createdAt
                                ? dayjs(goal.createdAt).format('MMM D, YYYY HH:mm')
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {goal.updatedAt
                                ? dayjs(goal.updatedAt).format('MMM D, YYYY HH:mm')
                                : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {showPagination && (
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[ROWS_PER_PAGE]}
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} of ${count}`
                  }
                />
              )}
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionDetailsPage;
