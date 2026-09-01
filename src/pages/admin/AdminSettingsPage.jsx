import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  InputAdornment,
  Tooltip,
  IconButton,
} from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { fetchSettingByKey, updateSetting } from '../../api/adminApi';
import {
  clampMaxSessionHours,
  DEFAULT_MAX_SESSION_HOURS,
  MAX_MAX_SESSION_HOURS,
  MAX_SESSION_HOURS_KEY,
  MIN_MAX_SESSION_HOURS,
} from '../../api/settingsApi';
import { useAuth } from '../../context/AuthContext';
import { dayjs, getApiErrorMessage } from '../../utils/helpers';

const DURATION_LIMIT_HINT = `Integer between ${MIN_MAX_SESSION_HOURS} and ${MAX_MAX_SESSION_HOURS}. Manual study entries remain limited to 3 seconds–24 hours separately.`;

const formatAuditLine = (updatedBy, updatedAt) => {
  if (!updatedAt) return null;
  const when = dayjs(updatedAt).format('MMM D, YYYY · HH:mm');
  const who = typeof updatedBy === 'string' ? updatedBy.trim() : '';
  if (who) return `Last updated by ${who} · ${when}`;
  return `Last updated · ${when}`;
};

const AdminSettingsPage = () => {
  const { user } = useAuth();
  const [value, setValue] = useState(String(DEFAULT_MAX_SESSION_HOURS));
  const [description, setDescription] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const applySetting = (data, fallbackDescription = '') => {
    setValue(String(clampMaxSessionHours(data?.value)));
    setDescription(data?.description || fallbackDescription);
    setUpdatedAt(data?.updatedAt || null);
    setUpdatedBy(data?.updatedBy ?? null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSettingByKey(user.token, MAX_SESSION_HOURS_KEY);
      applySetting(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load platform settings.'));
      setValue(String(DEFAULT_MAX_SESSION_HOURS));
      setUpdatedAt(null);
      setUpdatedBy(null);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const hours = clampMaxSessionHours(value);
    setSaving(true);
    try {
      const updated = await updateSetting(user.token, MAX_SESSION_HOURS_KEY, hours);
      applySetting(updated, description);
      setSnack({
        open: true,
        message: `Live session limit updated to ${hours} hour${hours === 1 ? '' : 's'}.`,
        severity: 'success',
      });
    } catch (err) {
      setSnack({
        open: true,
        message: getApiErrorMessage(err, 'Unable to save setting.'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const auditLine = formatAuditLine(updatedBy, updatedAt);

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
          Platform Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          System-wide policies that apply to all study sessions
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card elevation={1} sx={{ borderRadius: 3, maxWidth: 640 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TimerOutlinedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Live session duration limit
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {description ||
                  `Caps how long an active timer may run before it must stop. Allowed range: ${MIN_MAX_SESSION_HOURS}–${MAX_MAX_SESSION_HOURS} hours.`}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
            <TextField
              label="Maximum hours"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setValue(String(clampMaxSessionHours(value)))}
              size="small"
              sx={{ maxWidth: 240 }}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                },
                htmlInput: {
                  min: MIN_MAX_SESSION_HOURS,
                  max: MAX_MAX_SESSION_HOURS,
                  step: 1,
                },
              }}
            />
            <Tooltip title={DURATION_LIMIT_HINT} arrow placement="right">
              <IconButton size="small" aria-label="Duration limit information" sx={{ mt: 0.5 }}>
                <InfoOutlinedIcon fontSize="small" color="action" />
              </IconButton>
            </Tooltip>
          </Box>

          {auditLine && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 2, mb: 2.5 }}>
              <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {auditLine}
              </Typography>
            </Box>
          )}

          {!auditLine && <Box sx={{ mb: 2 }} />}

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
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

export default AdminSettingsPage;
