import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShieldIcon from '@mui/icons-material/Shield';
import { fetchAllRoles, createRole, deleteRole } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../utils/roles';

const PROTECTED_ROLES = ['ADMIN', 'STUDENT'];

const RolesPage = () => {
  const { user: adminUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const loadData = useCallback(async () => {
    try {
      const r = await fetchAllRoles(adminUser.token);
      setRoles(Array.isArray(r) ? r : []);
    } catch {
      setError('Failed to load roles. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [adminUser.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    const name = newRoleName.trim().toUpperCase().replace(/^ROLE_/, '');
    if (!name) return;
    setCreating(true);
    try {
      await createRole(adminUser.token, name);
      await loadData();
      setNewRoleName('');
      showSnack(`Role "${name}" created.`);
    } catch {
      showSnack('Failed to create role.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (role) => {
    try {
      await deleteRole(adminUser.token, role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      showSnack(`Role "${role.name}" deleted.`);
    } catch {
      showSnack('Failed to delete role. It may be in use.', 'error');
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
          Role Management
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Create and manage user roles
        </Typography>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Create New Role
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Role Name"
              placeholder="e.g. MODERATOR"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 220 }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              helperText="Use uppercase names like ADMIN, STUDENT"
            />
            <Button
              variant="contained"
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              onClick={handleCreate}
              disabled={!newRoleName.trim() || creating}
              sx={{ mt: 0.5 }}
            >
              Create Role
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#f8fafc' } }}>
                  <TableCell>Role</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <ShieldIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.disabled" display="block">
                        No roles defined yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {roles.map((role) => {
                  const label = getRoleLabel(role.name);
                  const isProtected = PROTECTED_ROLES.includes(role.name);
                  const isActive = role.active !== false;

                  return (
                    <TableRow key={role.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ShieldIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                            {role.name}
                          </Typography>
                          {isProtected && (
                            <Chip label="System" size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={label}
                          size="small"
                          sx={{
                            bgcolor: '#6366f120',
                            color: '#6366f1',
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={isActive ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={isProtected ? 'System roles cannot be deleted' : 'Delete role'}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={isProtected}
                              onClick={() => handleDelete(role)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

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

export default RolesPage;
