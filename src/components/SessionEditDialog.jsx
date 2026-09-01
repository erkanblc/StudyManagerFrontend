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
import { getSessionDurationSec } from '../utils/studyCalendar';
import { dayjs, formatDuration, toUtcIso } from '../utils/helpers';
import { getGoalDateViolation } from '../utils/goalHelpers';
import {
  MANUAL_MAX_DURATION_HOURS,
  MANUAL_MAX_DURATION_SECONDS,
  MANUAL_MIN_DURATION_SECONDS,
} from '../api/settingsApi';

const SessionEditDialog = ({ open, onClose, session, goals = [], onSave, saving }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [goalId, setGoalId] = useState('');
  const [ignoreGoalDate, setIgnoreGoalDate] = useState(false);

  useEffect(() => {
    if (!open || !session) return;

    const dur = getSessionDurationSec(session);
    const startSource = session.startTime || session.endTime || session.createdAt || session.date;
    const start = startSource ? dayjs(startSource) : dayjs();

    setIgnoreGoalDate(false);
    setDate(start.format('YYYY-MM-DD'));
    setTime(start.format('HH:mm'));
    setHours(Math.floor(dur / 3600));
    setMinutes(Math.floor((dur % 3600) / 60));
    setSeconds(dur % 60);
    setSubject(session.subject || '');
    setNotes(session.notes || '');
    setGoalId(session.goalId ? String(session.goalId) : '');
  }, [open, session]);

  const selectedGoal = goals.find((g) => String(g.id) === String(goalId)) || null;
  const goalDateError = goalId ? getGoalDateViolation(date, selectedGoal) : null;
  const goalDateBlocks = Boolean(goalDateError) && !ignoreGoalDate;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const underMin = totalSeconds > 0 && totalSeconds < MANUAL_MIN_DURATION_SECONDS;
  const overMax = totalSeconds > MANUAL_MAX_DURATION_SECONDS;
  const baseValid =
    Boolean(date && time) &&
    totalSeconds >= MANUAL_MIN_DURATION_SECONDS &&
    totalSeconds <= MANUAL_MAX_DURATION_SECONDS;
  const isValid = baseValid && !goalDateBlocks;

  const handleSubmit = () => {
    if (!isValid) return;
    const start = dayjs(`${date}T${time}`);
    const end = start.add(totalSeconds, 'second');
    onSave({
      startTime: toUtcIso(start),
      endTime: toUtcIso(end),
      duration: totalSeconds,
      subject: subject.trim() || null,
      notes: notes.trim() || null,
      goalId: goalId ? Number(goalId) : null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>Edit Study Session</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              When did you study?
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={7}>
                <TextField
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setIgnoreGoalDate(false);
                    setDate(e.target.value);
                  }}
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
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
                  value={hours}
                  onChange={(e) =>
                    setHours(Math.min(MANUAL_MAX_DURATION_HOURS, Math.max(0, Number(e.target.value) || 0)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
                  }}
                  fullWidth
                  inputProps={{ min: 0, max: MANUAL_MAX_DURATION_HOURS }}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  label="Minutes"
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
                  }}
                  fullWidth
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid size={3.5}>
                <TextField
                  label="Seconds"
                  type="number"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
                  }}
                  fullWidth
                  inputProps={{ min: 0, max: 59 }}
                />
              </Grid>
              <Grid size={1.5}>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" textAlign="center">
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
            value={goalId}
            onChange={(e) => {
              setIgnoreGoalDate(false);
              setGoalId(e.target.value);
            }}
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
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            size="small"
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            size="small"
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
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionEditDialog;
