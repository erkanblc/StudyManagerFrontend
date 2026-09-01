import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useNavigate } from 'react-router-dom';
import { dayjs } from '../utils/helpers';
import { getPlanTypeLabel, getPlanStatusDisplay, planToTimerState } from '../utils/planHelpers';

const DayPlanDialog = ({ open, onClose, day, plans = [], onEdit, onDelete }) => {
  const navigate = useNavigate();
  if (!day) return null;

  const handleStart = (plan) => {
    navigate('/timer', { state: planToTimerState(plan) });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Plans — {day.format('dddd, MMMM D')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {plans.length} planned session{plans.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {plans.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No plans for this day.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {plans.map((plan, idx) => {
              const status = getPlanStatusDisplay(plan);
              return (
                <Box key={plan.id}>
                  {idx > 0 && <Divider sx={{ my: 1 }} />}
                  <ListItem disablePadding sx={{ py: 1.25, alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{plan.title}</Typography>
                          <Chip label={getPlanTypeLabel(plan.type)} size="small" variant="outlined" />
                          <Chip label={status.label} size="small" color={status.color} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {dayjs(plan.plannedDate).format('HH:mm')} · {plan.plannedDurationMinutes} min
                          </Typography>
                          {plan.goalTitle && (
                            <Typography variant="caption" color="primary.main" display="block">
                              Goal: {plan.goalTitle}
                            </Typography>
                          )}
                          {plan.notes && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                              {plan.notes}
                            </Typography>
                          )}
                          {plan.status === 'PLANNED' && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => handleStart(plan)}
                              sx={{ mt: 1 }}
                            >
                              Start Timer
                            </Button>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(plan)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(plan)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DayPlanDialog;
