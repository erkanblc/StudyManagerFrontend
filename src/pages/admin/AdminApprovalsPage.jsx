import { useCallback, useEffect, useState } from 'react';
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
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  Chip,
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import {
  fetchPendingAdmins,
  approveAdminRegistration,
  rejectAdminRegistration,
} from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { dayjs } from '../../utils/helpers';

const AdminApprovalsPage = () => {
  const { user: adminUser } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchPendingAdmins(adminUser.token);
      setPending(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Failed to load pending admin registrations.');
    } finally {
      setLoading(false);
    }
  }, [adminUser.token]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async (userId) => {
    setActionId(userId);
    try {
      await approveAdminRegistration(adminUser.token, userId);
      setPending((prev) => prev.filter((p) => String(p.id) !== String(userId)));
      window.dispatchEvent(new CustomEvent('pending-admins-changed'));
      setSnack({ open: true, msg: 'Admin registration approved.', severity: 'success' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to approve registration.';
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (userId) => {
    setActionId(userId);
    try {
      await rejectAdminRegistration(adminUser.token, userId);
      setPending((prev) => prev.filter((p) => String(p.id) !== String(userId)));
      window.dispatchEvent(new CustomEvent('pending-admins-changed'));
      setSnack({ open: true, msg: 'Admin registration rejected.', severity: 'info' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to reject registration.';
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setActionId(null);
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
          Admin Approvals
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Review and approve users who registered as administrators
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#f59e0b20', color: '#f59e0b', width: 52, height: 52 }}>
            <HowToRegIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Pending Approvals
            </Typography>
            <Typography variant="h4" fontWeight={700} color="#d97706">
              {pending.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          {pending.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="body1" fontWeight={600}>
                No pending admin registrations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New admin requests will appear here for your review.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: '#f8fafc' } }}>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Registered</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pending.map((item) => {
                    const busy = actionId === item.id;
                    return (
                      <TableRow key={item.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f120', color: '#6366f1' }}>
                              {item.fullName?.[0]?.toUpperCase() || <PersonIcon fontSize="small" />}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {item.fullName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {item.username}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.registeredAt
                              ? dayjs(item.registeredAt).format('MMM D, YYYY HH:mm')
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label="Pending" size="small" color="warning" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
                              disabled={busy}
                              onClick={() => handleApprove(item.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CancelIcon />}
                              disabled={busy}
                              onClick={() => handleReject(item.id)}
                            >
                              Reject
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminApprovalsPage;
