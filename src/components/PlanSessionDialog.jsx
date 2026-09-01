import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { dayjs } from '../utils/helpers';
import { PLAN_TYPES, planToForm } from '../utils/planHelpers';
import { isGoalActiveStatus } from '../utils/goalHelpers';
import {
  DEFAULT_MAX_SESSION_HOURS,
  fetchMaxSessionHours,
} from '../api/settingsApi';

const EMPTY_FORM = {
  title: '',
  goalId: '',
  type: 'STUDY',
  plannedDate: dayjs().format('YYYY-MM-DDTHH:mm'),
  plannedDurationMinutes: 60,
  notes: '',
};

const PlanSessionDialog = ({ open, onClose, onSave, initial, goals = [], saving }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [maxHours, setMaxHours] = useState(DEFAULT_MAX_SESSION_HOURS);
  const [maxMinutes, setMaxMinutes] = useState(DEFAULT_MAX_SESSION_HOURS * 60);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? planToForm(initial)
        : { ...EMPTY_FORM, plannedDate: dayjs().format('YYYY-MM-DDTHH:mm') }
    );
    fetchMaxSessionHours()
      .then((data) => {
        setMaxHours(data.maxHours);
        setMaxMinutes(data.maxMinutes);
      })
      .catch(() => {
        setMaxHours(DEFAULT_MAX_SESSION_HOURS);
        setMaxMinutes(DEFAULT_MAX_SESSION_HOURS * 60);
      });
  }, [open, initial]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleDurationChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setForm((f) => ({ ...f, plannedDurationMinutes: '' }));
      return;
    }
    const cleaned = String(raw).replace(/-/g, '');
    if (cleaned === '') {
      setForm((f) => ({ ...f, plannedDurationMinutes: '' }));
      return;
    }
    const n = Number(cleaned);
    if (Number.isNaN(n) || n < 0) return;
    setForm((f) => ({ ...f, plannedDurationMinutes: cleaned }));
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const plannedMinutes = Number(form.plannedDurationMinutes) || 0;
  const overLimit = plannedMinutes > maxMinutes;
  const negativeOrZero = form.plannedDurationMinutes !== '' && plannedMinutes < 15;
  const isValid = Boolean(form.title.trim()) && plannedMinutes >= 15 && !overLimit;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      ...form,
      plannedDurationMinutes: Math.min(plannedMinutes, maxMinutes),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>
        {initial ? 'Edit Plan' : 'New Study Plan'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title *"
            value={form.title}
            onChange={handleChange('title')}
            fullWidth
            placeholder="e.g. Mathematics Review"
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Type" value={form.type} onChange={handleChange('type')} fullWidth>
                {PLAN_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Related Goal" value={form.goalId} onChange={handleChange('goalId')} fullWidth>
                <MenuItem value="">None</MenuItem>
                {goals.filter((g) => isGoalActiveStatus(g.status)).map((g) => (
                  <MenuItem key={g.id} value={String(g.id)}>{g.title}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Planned Date & Time"
                type="datetime-local"
                value={form.plannedDate}
                onChange={handleChange('plannedDate')}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Duration (min)"
                type="number"
                value={form.plannedDurationMinutes}
                onChange={handleDurationChange}
                onKeyDown={blockNegativeKeys}
                fullWidth
                inputProps={{ min: 15, max: maxMinutes, step: 15 }}
                error={negativeOrZero || overLimit}
                helperText={
                  overLimit
                    ? `Max ${maxMinutes} min (${maxHours}h)`
                    : negativeOrZero
                      ? 'Duration must be at least 15 minutes'
                      : `Max ${maxMinutes} min (${maxHours}h)`
                }
              />
            </Grid>
          </Grid>
          {overLimit && (
            <Alert severity="warning">
              Planned duration cannot exceed {maxHours} hour(s) ({maxMinutes} minutes).
            </Alert>
          )}
          <TextField
            label="Notes"
            value={form.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isValid || saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {initial ? 'Save Changes' : 'Create Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanSessionDialog;
