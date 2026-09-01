import { Snackbar, Alert, Typography, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../context/AuthContext';
import { buildLoginGapMessage, getLoginGapColors } from '../utils/loginGapHelpers';

const LoginGapSnackbar = () => {
  const { loginGapAlert, clearLoginGapAlert } = useAuth();

  if (!loginGapAlert) return null;

  const colors = getLoginGapColors(loginGapAlert.days);
  const message = buildLoginGapMessage(loginGapAlert.name, loginGapAlert.days);

  return (
    <Snackbar
      open
      autoHideDuration={10000}
      onClose={clearLoginGapAlert}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 7 }}
    >
      <Alert
        icon={<WarningAmberIcon sx={{ color: colors.accent }} />}
        onClose={clearLoginGapAlert}
        sx={{
          width: '100%',
          maxWidth: 520,
          bgcolor: colors.bg,
          border: `2px solid ${colors.border}`,
          color: colors.text,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ color: colors.accent, mb: 0.25 }}>
            You've been away for a while
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text }}>
            {message}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default LoginGapSnackbar;
