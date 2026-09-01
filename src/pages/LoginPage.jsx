import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  Divider,
  Chip,
  Snackbar,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import AppLogo from '../components/AppLogo';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = [
  { email: 'student1@example.com', password: 'student1', label: 'Student' },
  { email: 'admin@example.com', password: 'admin', label: 'Admin' },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerNotice, setRegisterNotice] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const message = location.state?.registerMessage;
    if (message) {
      setRegisterNotice(message);
      navigate('/login', { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Redirect admin to admin panel, others to student app
      navigate(result.isAdmin ? '/admin' : '/');
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
  };

  const fillDemo = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
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
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AppLogo size={80} sx={{ mx: 'auto', mb: 2, borderRadius: 2 }} />
          <Typography variant="h4" fontWeight={700} color="white">
            Study Manager
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            Your personal learning time tracker
          </Typography>
        </Box>

        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Sign In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }}
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
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: 16,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)',
                  },
                }}
              >
                {loading ? 'Signing In…' : 'Sign In'}
              </Button>
            </form>

            <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 2 }}>
              Don&apos;t have an account?{' '}
              <Link to="/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                Register
              </Link>
            </Typography>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Demo Accounts
              </Typography>
            </Divider>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {DEMO_CREDENTIALS.map((cred) => (
                <Chip
                  key={cred.email}
                  label={cred.label}
                  onClick={() => fillDemo(cred)}
                  clickable
                  variant="outlined"
                  color="primary"
                  size="small"
                />
              ))}
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TimerIcon fontSize="small" color="primary" />
                <Typography variant="caption" fontWeight={600} color="primary">
                  About Study Manager
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Track your study goals, plan learning sessions over 6 months, use a stopwatch to
                measure focused study time, and visualize your progress.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={Boolean(registerNotice)}
        autoHideDuration={10000}
        onClose={() => setRegisterNotice('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setRegisterNotice('')}
          sx={{ width: '100%', boxShadow: 4 }}
        >
          {registerNotice}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
