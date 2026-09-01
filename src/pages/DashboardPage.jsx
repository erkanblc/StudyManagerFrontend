import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Button,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchTodayPlanSessions, fetchPlanSessions } from '../api/planSessionsApi';
import { fetchGoals } from '../api/goalsApi';
import { fetchSessions, fetchTotalSeconds } from '../api/sessionsApi';
import { fetchActiveSession } from '../api/sessionsApi';
import { planToTimerState } from '../utils/planHelpers';
import InterruptedSessionDialog from '../components/InterruptedSessionDialog';
import RemindersCard from '../components/RemindersCard';
import { dayjs, formatHours } from '../utils/helpers';
import { getMilestoneProgress, getGoalStudyProgressPct, formatGoalPeriod, isGoalOngoingStatus, isGoalCompletedStatus, getGoalStatusMeta } from '../utils/goalHelpers';
import { getSessionDurationSec, filterOwnSessions } from '../utils/studyCalendar';

const StatCard = ({ title, value, subtitle, icon, color, onClick }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
      borderRadius: 3,
    }}
    onClick={onClick}
    elevation={1}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color || 'text.primary'}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color || 'primary'}.light`,
            color: color || 'primary.main',
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayPlans, setTodayPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [goals, setGoals] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const [interruptedSession, setInterruptedSession] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '' });

  useEffect(() => {
    fetchTodayPlanSessions()
      .then((data) => setTodayPlans(Array.isArray(data) ? data : []))
      .catch(() => setTodayPlans([]));
    fetchPlanSessions()
      .then((data) => setAllPlans(Array.isArray(data) ? data : []))
      .catch(() => setAllPlans([]));
    fetchGoals()
      .then((data) => setGoals(Array.isArray(data) ? data : []))
      .catch(() => setGoals([]));
    fetchSessions()
      .then((data) => setStudySessions(filterOwnSessions(data, user?.id)))
      .catch(() => setStudySessions([]));
    fetchTotalSeconds()
      .then((total) => setTotalStudySeconds(total ?? 0))
      .catch(() => setTotalStudySeconds(0));

    fetchActiveSession()
      .then((active) => {
        if (active) setInterruptedSession(active);
      })
      .catch(() => {});
  }, [user?.id]);

  const totalSeconds = totalStudySeconds;
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const activeGoals = goals.filter((g) => isGoalOngoingStatus(g.status));
  const completedGoals = goals.filter((g) => isGoalCompletedStatus(g.status));
  const goalProgress = goals.length ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  const todaySessions = todayPlans.filter((p) => p.status === 'PLANNED');

  const upcomingSessions = allPlans
    .filter(
      (p) =>
        p.status === 'PLANNED' &&
        dayjs(p.plannedDate).isAfter(dayjs()) &&
        dayjs(p.plannedDate).isBefore(dayjs().add(7, 'day'))
    )
    .sort((a, b) => dayjs(a.plannedDate).diff(dayjs(b.plannedDate)))
    .slice(0, 5);

  const recentSessions = studySessions
    .filter((s) => s.status !== 'ACTIVE')
    .slice(0, 5);

  const completedMilestones = goals.reduce(
    (sum, g) => sum + getMilestoneProgress(g).completed,
    0
  );
  const totalMilestones = goals.reduce((sum, g) => sum + getMilestoneProgress(g).total, 0);

  const studiedSecondsForGoal = (goalId) =>
    studySessions
      .filter((s) => s.status !== 'ACTIVE' && String(s.goalId) === String(goalId))
      .reduce((sum, s) => sum + getSessionDurationSec(s), 0);

  const greeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>
          {greeting()}, {user?.name || user?.email?.split('@')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {dayjs().format('dddd, MMMM D, YYYY')} — Let's make today count!
        </Typography>
      </Box>

      <RemindersCard />

      {/* Today's sessions alert */}
      {todaySessions.length > 0 && (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 3,
          }}
          elevation={0}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CalendarTodayIcon sx={{ color: 'white' }} />
                <Box>
                  <Typography variant="subtitle2" color="white" fontWeight={700}>
                    {todaySessions.length} session{todaySessions.length > 1 ? 's' : ''} planned for today
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {todaySessions.map((s) => s.title).join(', ')}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={() =>
                  navigate('/timer', {
                    state: todaySessions.length === 1 ? planToTimerState(todaySessions[0]) : undefined,
                  })
                }
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  whiteSpace: 'nowrap',
                }}
              >
                Start Timer
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total Study Time"
            value={`${totalHours}h`}
            subtitle={`${studySessions.length} recorded sessions`}
            icon={<TimerIcon />}
            color="primary"
            onClick={() => navigate('/progress')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Active Goals"
            value={activeGoals.length}
            subtitle={`${completedGoals.length} completed`}
            icon={<FlagIcon />}
            color="secondary"
            onClick={() => navigate('/goals')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Goals Completed"
            value={`${goalProgress}%`}
            subtitle={`${completedGoals.length} of ${goals.length} goals`}
            icon={<CheckCircleIcon />}
            color="success"
            onClick={() => navigate('/goals')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Milestones Reached"
            value={completedMilestones}
            subtitle={`of ${totalMilestones} total`}
            icon={<EmojiEventsIcon />}
            color="warning"
            onClick={() => navigate('/goals')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Goal Progress */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Active Goals
                </Typography>
                <Button size="small" onClick={() => navigate('/goals')}>
                  View All
                </Button>
              </Box>

              {activeGoals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FlagIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">
                    No active goals yet
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/goals')}
                  >
                    Add Goal
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {activeGoals.slice(0, 4).map((goal, idx) => {
                    const statusMeta = getGoalStatusMeta(goal.status);
                    const studiedSec = studiedSecondsForGoal(goal.id);
                    const progressPct = getGoalStudyProgressPct(goal, studiedSec);
                    const { completed, total } = getMilestoneProgress(goal);
                    const period = formatGoalPeriod(goal);
                    const daysLeft = goal.endDate ? dayjs(goal.endDate).diff(dayjs(), 'day') : null;
                    return (
                      <Box key={goal.id}>
                        {idx > 0 && <Divider sx={{ my: 1 }} />}
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>
                              {goal.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                              {goal.status !== 'ACTIVE' && (
                                <Chip label={statusMeta.label} size="small" color={statusMeta.color} sx={{ fontSize: 10 }} />
                              )}
                              {daysLeft != null && goal.status !== 'OVERDUE' && (
                                <Chip
                                  label={daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
                                  size="small"
                                  color={daysLeft < 0 ? 'error' : daysLeft < 7 ? 'warning' : 'default'}
                                  sx={{ fontSize: 10 }}
                                />
                              )}
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {period || goal.description || 'No period set'}
                            {goal.targetHours != null && ` · ${goal.targetHours}h target`}
                            {total > 0 && ` · Milestones ${completed}/${total}`}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progressPct}
                            sx={{ mt: 0.75, borderRadius: 1, height: 4 }}
                            color="primary"
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Sessions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Upcoming Sessions
                </Typography>
                <Button size="small" onClick={() => navigate('/planning')}>
                  View Plan
                </Button>
              </Box>

              {upcomingSessions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CalendarTodayIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">
                    No sessions planned for the next 7 days
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/planning')}
                  >
                    Plan Sessions
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {upcomingSessions.map((session, idx) => (
                    <Box key={session.id}>
                      {idx > 0 && <Divider sx={{ my: 0.5 }} />}
                      <ListItem disablePadding sx={{ py: 0.75 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <AccessTimeIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={session.title}
                          secondary={`${dayjs(session.plannedDate).format('ddd, MMM D')} · ${session.plannedDurationMinutes} min`}
                          slotProps={{ primary: { variant: 'body2', style: { fontWeight: 500 } }, secondary: { variant: 'caption' } }}
                        />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Study Sessions */}
        {recentSessions.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card elevation={1} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Recent Study Sessions
                  </Typography>
                  <Button size="small" onClick={() => navigate('/progress')}>
                    View All
                  </Button>
                </Box>
                <Grid container spacing={1.5}>
                  {recentSessions.map((session) => {
                    const goalName = session.goalId
                      ? goals.find((g) => g.id === session.goalId)?.title
                      : null;
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={session.id}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <TrendingUpIcon fontSize="small" color="primary" />
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(session.startTime || session.date).format('MMM D')}
                              </Typography>
                            </Box>
                            <Typography variant="h6" fontWeight={700} color="primary">
                              {formatHours(session.duration)}h
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {session.subject || goalName || 'General Study'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <InterruptedSessionDialog
        open={Boolean(interruptedSession)}
        session={interruptedSession}
        onClose={() => setInterruptedSession(null)}
        onResolved={(message) => setSnack({ open: true, message })}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnack({ open: false, message: '' })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardPage;
