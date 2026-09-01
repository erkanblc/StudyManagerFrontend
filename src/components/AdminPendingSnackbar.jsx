import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert, Button } from '@mui/material';
import { fetchPendingAdminCount } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';

const AUTO_HIDE_MS = 10000;

const AdminPendingSnackbar = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.token || !isAdmin) return;

    const load = async () => {
      try {
        const pendingCount = await fetchPendingAdminCount(user.token);
        setCount(pendingCount);
        setOpen(pendingCount > 0);
      } catch {
        // ignore
      }
    };

    load();
    window.addEventListener('pending-admins-changed', load);
    return () => window.removeEventListener('pending-admins-changed', load);
  }, [user?.token, isAdmin]);

  if (!open || count === 0) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={AUTO_HIDE_MS}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 7 }}
    >
      <Alert
        severity="warning"
        onClose={() => setOpen(false)}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              setOpen(false);
              navigate('/admin/approvals');
            }}
          >
            Review
          </Button>
        }
        sx={{ width: '100%', boxShadow: 4 }}
      >
        <strong>{count} admin registration{count === 1 ? '' : 's'}</strong> waiting for your approval.
      </Alert>
    </Snackbar>
  );
};

export default AdminPendingSnackbar;
