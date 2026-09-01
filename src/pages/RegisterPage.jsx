import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AppLogo from '../components/AppLogo';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import BadgeIcon from '@mui/icons-material/Badge';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  registerAsAdmin: false,
};

const RegisterPage = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await register({
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      registerAsAdmin: form.registerAsAdmin,
    });
    setLoading(false);

    if (result.success) {
      setForm(EMPTY_FORM);
      navigate('/login', { state: { registerMessage: result.message } });
    } else {
      setError(result.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AppLogo size={80} sx={{ mx: 'auto', mb: 2, borderRadius: 2 }} />
          <Typography variant="h4" fontWeight={700} color="white">
            Create Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            Join Study Manager as a student or request admin access
          </Typography>
        </Box>

        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Full Name"
                value={form.fullName}
                onChange={handleChange('fullName')}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                fullWidth
                label="Username"
                value={form.username}
                onChange={handleChange('username')}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: form.registerAsAdmin ? '#fef3c7' : 'action.hover',
                  border: '1px solid',
                  borderColor: form.registerAsAdmin ? '#fcd34d' : 'divider',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.registerAsAdmin}
                      onChange={handleChange('registerAsAdmin')}
                      color="warning"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdminPanelSettingsIcon fontSize="small" color="warning" />
                      <Typography variant="body2" fontWeight={600}>
                        Register as Administrator
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {form.registerAsAdmin
                    ? 'An existing admin must approve your account before you can sign in.'
                    : 'Student accounts are activated immediately after registration.'}
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {loading ? 'Creating account…' : 'Register'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" textAlign="center" color="text.secondary">
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default RegisterPage;
