import { useEffect, useState, useCallback } from 'react';
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
  Avatar,
  Switch,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllUsers,
  fetchAllRoles,
  createUser,
  updateUserStatus,
  updateUserRoles,
  deleteUser,
} from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import {
  getRoleName,
  getRoleLabel,
  getRoleColor,
  isAdminRole,
  filterAssignableRoles,
} from '../../utils/roles';

const EMPTY_USER_FORM = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  active: true,
  roleNames: ['STUDENT'],
};

const CreateUserDialog = ({ open, onClose, onSave, allRoles, saving }) => {
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const assignableRoles = filterAssignableRoles(allRoles);

  useEffect(() => {
    if (open) setForm(EMPTY_USER_FORM);
  }, [open]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleRole = (name) =>
    setForm((f) => {
      const selected = f.roleNames.includes(name)
        ? f.roleNames.filter((n) => n !== name)
        : [...f.roleNames, name];
      return { ...f, roleNames: selected.length ? selected : f.roleNames };
    });

  const isValid =
    form.fullName.trim() &&
    form.username.trim() &&
    form.email.trim() &&
    form.password.trim().length >= 4 &&
    form.roleNames.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>Add New User</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Full Name *"
                value={form.fullName}
                onChange={handleChange('fullName')}
                fullWidth
                placeholder="John Doe"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Username *"
                value={form.username}
                onChange={handleChange('username')}
                fullWidth
                placeholder="johndoe"
              />
            </Grid>
          </Grid>
          <TextField
            label="Email *"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            fullWidth
            placeholder="john@example.com"
          />
          <TextField
            label="Password *"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            fullWidth
            helperText="Minimum 4 characters"
          />
          <FormControlLabel
            control={
              <Switch checked={form.active} onChange={handleChange('active')} color="success" />
            }
            label="Active account"
          />
          <Box>
            <Typography variant="body2" fontWeight={600} mb={1}>
              Roles *
            </Typography>
            <FormGroup>
              {assignableRoles.map((role) => {
                const name = getRoleName(role);
                const label = getRoleLabel(name);
                const color = getRoleColor(name);
                return (
                  <FormControlLabel
                    key={name}
                    control={
                      <Checkbox
                        checked={form.roleNames.includes(name)}
                        onChange={() => toggleRole(name)}
                        sx={{ '&.Mui-checked': { color } }}
                      />
                    }
                    label={
                      <Chip
                        label={label}
                        size="small"
                        sx={{ bgcolor: color + '20', color, fontSize: 11, fontWeight: 600 }}
                      />
                    }
                  />
                );
              })}
            </FormGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || saving}>
          {saving ? 'Creating…' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RolesDialog = ({ open, onClose, targetUser, allRoles, onSave }) => {
  const currentRoleNames = targetUser?.roles?.map(getRoleName) || [];
  const [selected, setSelected] = useState(currentRoleNames);
  const assignableRoles = filterAssignableRoles(allRoles);

  useEffect(() => {
    setSelected(targetUser?.roles?.map(getRoleName) || []);
  }, [targetUser]);

  const toggle = (name) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Edit Roles</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          User: <strong>{targetUser?.email}</strong>
        </Typography>
        <FormGroup>
          {assignableRoles.map((role) => {
            const name = getRoleName(role);
            const label = getRoleLabel(name);
            const color = getRoleColor(name);
            return (
              <FormControlLabel
                key={name}
                control={
                  <Checkbox
                    checked={selected.includes(name)}
                    onChange={() => toggle(name)}
                    sx={{ '&.Mui-checked': { color } }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={label}
                      size="small"
                      sx={{ bgcolor: color + '20', color, fontSize: 11, fontWeight: 600 }}
                    />
                  </Box>
                }
              />
            );
          })}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(selected)} disabled={selected.length === 0}>
          Save Roles
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteDialog = ({ open, onClose, targetUser, onConfirm }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle fontWeight={600} color="error">
      Delete User
    </DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete <strong>{targetUser?.email}</strong>? This action cannot
        be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" color="error" onClick={onConfirm}>
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

const UsersPage = () => {
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [togglingId, setTogglingId] = useState(null);
  const [rolesDialog, setRolesDialog] = useState({ open: false, user: null });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') =>
    setSnack({ open: true, msg, severity });

  const loadData = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        fetchAllUsers(adminUser.token),
        fetchAllRoles(adminUser.token),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch {
      setError('Failed to load users. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [adminUser.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleStatus = async (u) => {
    setTogglingId(u.id);
    try {
      const newActive = u.active === false ? true : false;
      await updateUserStatus(adminUser.token, u.id, newActive);
      setUsers((prev) =>
        prev.map((usr) => (usr.id === u.id ? { ...usr, active: newActive } : usr))
      );
      showSnack(`${u.email} is now ${newActive ? 'active' : 'inactive'}.`);
    } catch {
      showSnack('Failed to update user status.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveRoles = async (roleNames) => {
    const target = rolesDialog.user;
    try {
      await updateUserRoles(adminUser.token, target.id, roleNames);
      await loadData();
      showSnack(`Roles updated for ${target.email}.`);
    } catch {
      showSnack('Failed to update roles.', 'error');
    }
    setRolesDialog({ open: false, user: null });
  };

  const handleCreateUser = async (form) => {
    setCreating(true);
    try {
      await createUser(adminUser.token, {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        roleNames: form.roleNames,
        active: form.active,
      });
      await loadData();
      setCreateDialogOpen(false);
      showSnack(`User "${form.email}" created successfully.`);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Failed to create user. Check that username and email are unique.';
      showSnack(typeof msg === 'string' ? msg : 'Failed to create user.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteDialog.user;
    try {
      await deleteUser(adminUser.token, target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      showSnack(`${target.email} has been deleted.`);
    } catch {
      showSnack('Failed to delete user.', 'error');
    }
    setDeleteDialog({ open: false, user: null });
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const isActive = u.active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = users.filter((u) => u.active !== false).length;
  const passiveCount = users.filter((u) => u.active === false).length;

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
          <Typography variant="h5" fontWeight={700}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage platform users, roles and account status
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Add User
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          icon={<CheckCircleIcon />}
          label={`${activeCount} Active`}
          color="success"
          variant={statusFilter === 'active' ? 'filled' : 'outlined'}
          onClick={() => setStatusFilter('active')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<PersonOffIcon />}
          label={`${passiveCount} Inactive`}
          color="error"
          variant={statusFilter === 'inactive' ? 'filled' : 'outlined'}
          onClick={() => setStatusFilter('inactive')}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label={`${users.length} Total`}
          variant={statusFilter === 'all' ? 'filled' : 'outlined'}
          color={statusFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setStatusFilter('all')}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          {/* Search */}
          <TextField
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ mb: 2.5, maxWidth: 360 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#f8fafc' } }}>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Active / Passive</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.disabled">No users found</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => {
                  const isActive = u.active !== false;
                  const toggling = togglingId === u.id;
                  const isSelf = u.email === adminUser.email;
                  const isAdminUser = isAdminRole(u.roles);

                  return (
                    <TableRow
                      key={u.id}
                      sx={{
                        opacity: isActive ? 1 : 0.6,
                        '&:hover': { bgcolor: '#f8fafc' },
                        bgcolor: isActive ? 'inherit' : '#fff5f5',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: '#6366f120',
                              color: '#6366f1',
                              fontSize: 14,
                            }}
                          >
                            {(u.fullName || u.username || u.email)?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {u.fullName || u.username || '—'}
                            </Typography>
                            {isSelf && (
                              <Typography variant="caption" color="primary.main">
                                (you)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{u.email}</Typography>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {u.roles?.length > 0 ? (
                            u.roles.map((r, i) => {
                              const name = getRoleName(r);
                              const label = getRoleLabel(r);
                              const color = getRoleColor(r);
                              return (
                                <Chip
                                  key={i}
                                  label={label}
                                  size="small"
                                  sx={{
                                    bgcolor: color + '20',
                                    color,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    height: 20,
                                  }}
                                />
                              );
                            })
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              No role
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={isActive ? 'success' : 'error'}
                          sx={{ fontSize: 11, fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip
                          title={
                            isAdminUser
                              ? 'Admin accounts cannot be deactivated'
                              : isActive
                              ? 'Click to deactivate'
                              : 'Click to activate'
                          }
                        >
                          <span>
                            {toggling ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Switch
                                checked={isActive}
                                onChange={() => handleToggleStatus(u)}
                                disabled={isAdminUser || toggling}
                                color="success"
                                size="small"
                              />
                            )}
                          </span>
                        </Tooltip>
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="Login history">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/admin/login-history?userId=${u.id}`)}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit roles">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setRolesDialog({ open: true, user: u })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isAdminUser ? 'Admin accounts cannot be deleted' : 'Delete user'}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isAdminUser}
                                onClick={() => setDeleteDialog({ open: true, user: u })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        onSave={handleCreateUser}
        allRoles={roles}
        saving={creating}
      />

      <RolesDialog
        open={rolesDialog.open}
        onClose={() => setRolesDialog({ open: false, user: null })}
        targetUser={rolesDialog.user}
        allRoles={roles}
        onSave={handleSaveRoles}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        targetUser={deleteDialog.user}
        onConfirm={handleDelete}
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
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
