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
  Typography,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { dayjs, formatDuration, toUtcIso } from '../utils/helpers';
import { getGoalDateViolation } from '../utils/goalHelpers';
import {
  MANUAL_MAX_DURATION_HOURS,
  MANUAL_MAX_DURATION_SECONDS,
  MANUAL_MIN_DURATION_SECONDS,
} from '../api/settingsApi';

const EMPTY_FORM = {
  date: '',
  time: '',
  hours: 0,
  minutes: 30,
  seconds: 0,
  goalId: '',
  subject: '',
  notes: '',
};

const ManualSessionDialog = ({ open, onClose, goals = [], onSave, saving }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [ignoreGoalDate, setIgnoreGoalDate] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = dayjs();
    setIgnoreGoalDate(false);
    setForm({
      ...EMPTY_FORM,
      date: now.format('YYYY-MM-DD'),
      time: now.format('HH:mm'),
    });
  }, [open]);

  const selectedGoal = goals.find((g) => String(g.id) === String(form.goalId)) || null;
  const goalDateError = form.goalId ? getGoalDateViolation(form.date, selectedGoal) : null;
  const goalDateBlocks = Boolean(goalDateError) && !ignoreGoalDate;

  const totalSeconds = form.hours * 3600 + form.minutes * 60 + form.seconds;
  const underMin = totalSeconds > 0 && totalSeconds < MANUAL_MIN_DURATION_SECONDS;
  const overMax = totalSeconds > MANUAL_MAX_DURATION_SECONDS;
  const baseValid =
    Boolean(form.date && form.time) &&
    totalSeconds >= MANUAL_MIN_DURATION_SECONDS &&
    totalSeconds <= MANUAL_MAX_DURATION_SECONDS;
  const isValid = baseValid && !goalDateBlocks;

  const handleChange = (field) => (e) => {
    if (field === 'date' || field === 'goalId') setIgnoreGoalDate(false);
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleNumberChange = (field, min, max) => (e) => {
    const value = Math.min(max, Math.max(min, Number(e.target.value) || 0));
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const start = dayjs(`${form.date}T${form.time}`);
    const end = start.add(totalSeconds, 'second');

    onSave({
      startTime: toUtcIso(start),
      endTime: toUtcIso(end),
      duration: totalSeconds,
      goalId: form.goalId ? Number(form.goalId) : null,
      subject: form.subject.trim() || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Add Study Time</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Log study time you completed without the timer — e.g. offline or on paper.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              When did you study?
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={7}>
                <TextField
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={handleChange('date')}
                  fullWidth
                  size="small"
                  error={goalDateBlocks}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={5}>
                <TextField
                  label="Start time"
                  type="time"
                  value={form.time}
                  onChange={handleChange('time')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            {goalDateError && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2" component="div" mb={0.5}>
                  {goalDateError}
                </Typography>
                <FormControlLabel
                  sx={{ m: 0, alignItems: 'center' }}
                  control={
                    <Checkbox
                      size="small"
                      checked={ignoreGoalDate}
                      onChange={(e) => setIgnoreGoalDate(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I understand — save anyway
                    </Typography>
                  }
                />
              </Alert>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Duration (min {MANUAL_MIN_DURATION_SECONDS}s · max {MANUAL_MAX_DURATION_HOURS}h)
            </Typography>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={3.5}>
                <TextField
                  label="Hours"
                  type="number"
                  value={form.hours}
                  onChange={handleNumberChange('hours', 0, MANUAL_MAX_DURATION_HOURS)}
                  onKeyDown={blockNegativeKeys}
                  fullWidth
                  inputProps={{ min: 0, max: MANUAL_MAX_DURATION_HOURS }}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  label="Minutes"
                  type="number"
                  value={form.minutes}
                  onChange={handleNumberChange('minutes', 0, 59)}
                  onKeyDown={blockNegativeKeys}
                  fullWidth
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  label="Seconds"
                  type="number"
                  value={form.seconds}
                  onChange={handleNumberChange('seconds', 0, 59)}
                  onKeyDown={blockNegativeKeys}
                  fullWidth
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid size={1.5}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontFamily="monospace"
                  display="block"
                  textAlign="center"
                >
                  {formatDuration(totalSeconds)}
                </Typography>
              </Grid>
            </Grid>
            {underMin && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Minimum duration is {MANUAL_MIN_DURATION_SECONDS} second(s).
              </Alert>
            )}
            {overMax && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Maximum duration for manual entry is {MANUAL_MAX_DURATION_HOURS} hour(s) (
                {formatDuration(MANUAL_MAX_DURATION_SECONDS)}).
              </Alert>
            )}
          </Box>

          <TextField
            select
            label="Related Goal"
            value={form.goalId}
            onChange={handleChange('goalId')}
            fullWidth
            size="small"
          >
            <MenuItem value="">None</MenuItem>
            {goals.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Subject / Topic"
            value={form.subject}
            onChange={handleChange('subject')}
            fullWidth
            size="small"
            placeholder="e.g. Mathematics, Reading"
          />

          <TextField
            label="Notes"
            value={form.notes}
            onChange={handleChange('notes')}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="Optional details about what you studied"
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
          Add Time
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualSessionDialog;
