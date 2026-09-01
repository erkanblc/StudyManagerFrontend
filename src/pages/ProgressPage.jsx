import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FlagIcon from '@mui/icons-material/Flag';
import TimerIcon from '@mui/icons-material/Timer';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useStudySessions } from '../hooks/useStudySessions';
import { usePlanSessions } from '../hooks/usePlanSessions';
import { useMilestones } from '../hooks/useMilestones';
import { isStandaloneMilestone } from '../utils/milestoneHelpers';
import {
  getCompletedSessions,
  getSessionDateKey,
  getSessionDurationSec,
  formatStudyMinutes,
} from '../utils/studyCalendar';
import { dayjs, formatHours } from '../utils/helpers';
import { isPlanMissed } from '../utils/planHelpers';
import {
  getMilestoneProgress,
  getGoalStudyProgressPct,
  formatGoalPeriod,
  isGoalCompletedStatus,
  isGoalActiveStatus,
  isGoalOngoingStatus,
  isGoalOverdueStatus,
  getGoalStatusMeta,
  GOAL_STATUSES,
} from '../utils/goalHelpers';

const CHART = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#e5e7eb',
};

/** Non-empty Select values so MUI shows labels (empty string renders blank). */
const RECENT_GOALS_FILTER = 'recent';
const ALL_GOALS_CHART_FILTER = 'all';

const GOAL_STATUS_COLORS = {
  Active: '#22c55e',
  Paused: '#f59e0b',
  Overdue: '#dc2626',
  Completed: '#6366f1',
  Cancelled: '#ef4444',
  Archived: '#9ca3af',
};

const PLAN_STATUS_COLORS = {
  Completed: CHART.success,
  Missed: CHART.error,
  Upcoming: CHART.primary,
};

const ChartCard = ({ title, subtitle, children, height = 260 }) => (
  <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {subtitle}
        </Typography>
      )}
      <Box sx={{ flex: 1, width: '100%', minHeight: height }}>{children}</Box>
    </CardContent>
  </Card>
);

const StatCard = ({ label, value, subtitle, details, icon, color = 'primary' }) => (
  <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
          {label && (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          )}
          {value != null && value !== '' && (
            <Typography variant="h4" fontWeight={700} color={`${color}.main`} sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {subtitle}
            </Typography>
          )}
          {details?.length > 0 && (
            <Box
              sx={{
                mt: label || (value != null && value !== '') ? 1 : 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.35,
              }}
            >
              {details.map((row) => (
                <Typography
                  key={row.label}
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ fontSize: 11, lineHeight: 1.45 }}
                >
                  {row.label}:{' '}
                  <Box component="span" fontWeight={700} color="text.primary" sx={{ fontSize: 12 }}>
                    {row.value}
                  </Box>
                </Typography>
              ))}
            </Box>
          )}
        </Box>
        {icon && (
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 44, height: 44, flexShrink: 0 }}>
            {icon}
          </Avatar>
        )}
      </Box>
    </CardContent>
  </Card>
);

const EmptyChart = ({ message }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <Typography color="text.disabled" variant="body2" textAlign="center">
      {message}
    </Typography>
  </Box>
);

const ONGOING_STATUS_ACCENT = {
  Active: '#22c55e',
  Paused: '#f59e0b',
  Overdue: '#ef4444',
};

const OngoingGoalCard = ({ goal, studiedSec, pct, milestones, featured = false }) => {
  const statusMeta = getGoalStatusMeta(goal.status);
  const period = formatGoalPeriod(goal);
  const daysLeft = goal.endDate ? dayjs(goal.endDate).diff(dayjs(), 'day') : null;
  const accent = ONGOING_STATUS_ACCENT[statusMeta.label] || CHART.primary;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        height: '100%',
        borderLeft: `4px solid ${accent}`,
        bgcolor: statusMeta.label === 'Overdue' ? 'rgba(239, 68, 68, 0.04)' : 'background.paper',
        transition: 'box-shadow 0.2s, transform 0.2s',
        ...(featured && {
          boxShadow: 3,
          maxWidth: 560,
        }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Typography variant={featured ? 'subtitle1' : 'body2'} fontWeight={700} noWrap sx={{ flex: 1 }}>
          {goal.title}
        </Typography>
        <Chip label={statusMeta.label} size="small" color={statusMeta.color} sx={{ fontWeight: 600 }} />
      </Box>
      {period && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
          {period}
          {daysLeft != null && (
            daysLeft < 0
              ? ` · ${Math.abs(daysLeft)} days overdue`
              : ` · ${daysLeft} days left`
          )}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          Study progress
        </Typography>
        <Typography variant="caption" fontWeight={700} color="primary.main">
          {pct}%
          {goal.targetHours != null && ` · ${(studiedSec / 3600).toFixed(1)}h / ${goal.targetHours}h`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: featured ? 8 : 6,
          borderRadius: 1,
          mb: milestones.total > 0 ? 1.5 : 0,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: accent },
        }}
      />
      {milestones.total > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Interim goals
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {milestones.completed}/{milestones.total}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(milestones.completed / milestones.total) * 100}
            color="secondary"
            sx={{ height: 4, borderRadius: 1 }}
          />
        </>
      )}
    </Paper>
  );
};

const ProgressPage = () => {
  const { sessions, goals, loading, error } = useStudySessions();
  const { plans, loading: plansLoading } = usePlanSessions();
  const { milestones } = useMilestones();
  const standaloneMilestones = useMemo(
    () => milestones.filter(isStandaloneMilestone),
    [milestones]
  );
  const [selectedGoalChartId, setSelectedGoalChartId] = useState(ALL_GOALS_CHART_FILTER);
  const [selectedActiveGoalId, setSelectedActiveGoalId] = useState(RECENT_GOALS_FILTER);

  const completedSessions = useMemo(() => getCompletedSessions(sessions), [sessions]);

  const studySecondsForGoal = useMemo(() => {
    const map = {};
    completedSessions.forEach((s) => {
      if (s.goalId == null) return;
      const key = String(s.goalId);
      map[key] = (map[key] || 0) + getSessionDurationSec(s);
    });
    return map;
  }, [completedSessions]);

  const totalSeconds = completedSessions.reduce((a, s) => a + getSessionDurationSec(s), 0);
  const avgSessionHours = completedSessions.length
    ? (totalSeconds / 3600 / completedSessions.length).toFixed(1)
    : '0';

  const activeGoals = useMemo(
    () => goals.filter((g) => isGoalActiveStatus(g.status)),
    [goals]
  );

  const goalMilestoneTotal = activeGoals.reduce((sum, g) => sum + getMilestoneProgress(g).total, 0);
  const goalMilestoneDone = activeGoals.reduce((sum, g) => sum + getMilestoneProgress(g).completed, 0);
  const goalMilestonePending = Math.max(0, goalMilestoneTotal - goalMilestoneDone);
  const totalMilestones = goalMilestoneTotal;
  const completedMilestones = goalMilestoneDone;
  const standaloneDone = standaloneMilestones.filter((m) => m.status === 'completed').length;

  const ongoingGoals = useMemo(
    () => goals.filter((g) => isGoalOngoingStatus(g.status)),
    [goals]
  );
  const completedGoals = goals.filter((g) => isGoalCompletedStatus(g.status)).length;
  const overdueGoals = goals.filter((g) => isGoalOverdueStatus(g.status)).length;

  const planStats = useMemo(() => {
    const completed = plans.filter((p) => p.status === 'COMPLETED').length;
    const missed = plans.filter((p) => p.status === 'MISSED' || isPlanMissed(p)).length;
    const upcoming = plans.filter((p) => p.status === 'PLANNED' && !isPlanMissed(p)).length;
    return { completed, missed, upcoming, total: plans.length };
  }, [plans]);

  const weekStudy = useMemo(() => {
    const weekStart = dayjs().startOf('week');
    const weekSessions = completedSessions.filter((s) => {
      const d = getSessionDateKey(s);
      return d && !dayjs(d).isBefore(weekStart, 'day');
    });
    const seconds = weekSessions.reduce((sum, s) => sum + getSessionDurationSec(s), 0);
    return { seconds, count: weekSessions.length };
  }, [completedSessions]);

  const monthStudy = useMemo(() => {
    const monthStart = dayjs().startOf('month');
    const monthSessions = completedSessions.filter((s) => {
      const d = getSessionDateKey(s);
      return d && !dayjs(d).isBefore(monthStart, 'day');
    });
    const seconds = monthSessions.reduce((sum, s) => sum + getSessionDurationSec(s), 0);
    return { seconds, count: monthSessions.length };
  }, [completedSessions]);

  const dailyStudyData = useMemo(() => {
    const map = {};
    for (let i = 29; i >= 0; i--) {
      map[dayjs().subtract(i, 'day').format('YYYY-MM-DD')] = 0;
    }
    completedSessions.forEach((s) => {
      const d = getSessionDateKey(s);
      if (d && map[d] !== undefined) {
        map[d] += getSessionDurationSec(s) / 3600;
      }
    });
    return Object.entries(map).map(([date, hours]) => ({
      date: dayjs(date).format('MMM D'),
      hours: parseFloat(hours.toFixed(2)),
    }));
  }, [completedSessions]);

  const weeklyCompareData = useMemo(() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = dayjs().subtract(i, 'week').startOf('week');
      const weekEnd = weekStart.endOf('week');
      const label = weekStart.format('MMM D');

      const studied = completedSessions
        .filter((s) => {
          const d = getSessionDateKey(s);
          if (!d) return false;
          const day = dayjs(d);
          return !day.isBefore(weekStart, 'day') && !day.isAfter(weekEnd, 'day');
        })
        .reduce((a, s) => a + getSessionDurationSec(s) / 3600, 0);

      const planned = plans
        .filter((p) => {
          const day = dayjs(p.plannedDate);
          return !day.isBefore(weekStart, 'day') && !day.isAfter(weekEnd, 'day');
        })
        .reduce((a, p) => a + (Number(p.plannedDurationMinutes) || 0) / 60, 0);

      weeks.push({
        week: label,
        studied: parseFloat(studied.toFixed(1)),
        planned: parseFloat(planned.toFixed(1)),
      });
    }
    return weeks;
  }, [completedSessions, plans]);

  const goalStatusData = useMemo(() => {
    const counts = Object.fromEntries(GOAL_STATUSES.map((s) => [s.label, 0]));
    goals.forEach((g) => {
      const meta = getGoalStatusMeta(g.status);
      if (counts[meta.label] != null) counts[meta.label] += 1;
    });
    return GOAL_STATUSES.map(({ label }) => ({
      name: label,
      value: counts[label] ?? 0,
    }));
  }, [goals]);

  const goalStatusPieSlices = useMemo(() => {
    const slices = [];
    goalStatusData.forEach(({ name, value }) => {
      for (let i = 0; i < value; i += 1) {
        slices.push({
          name,
          status: name,
          value: 1,
          sliceKey: `${name}-${i}`,
        });
      }
    });
    return slices;
  }, [goalStatusData]);

  const planStatusData = useMemo(
    () =>
      [
        { name: 'Completed', value: planStats.completed },
        { name: 'Missed', value: planStats.missed },
        { name: 'Upcoming', value: planStats.upcoming },
      ].filter((d) => d.value > 0),
    [planStats]
  );

  const goalStudyData = useMemo(
    () =>
      goals.map((g) => ({
        id: g.id,
        name: g.title.length > 18 ? `${g.title.slice(0, 18)}…` : g.title,
        fullTitle: g.title,
        studied: parseFloat(((studySecondsForGoal[String(g.id)] || 0) / 3600).toFixed(1)),
        target: Number(g.targetHours ?? 0),
        status: getGoalStatusMeta(g.status).label,
      })),
    [goals, studySecondsForGoal]
  );

  const goalStudyChartData = useMemo(() => {
    const withData = goalStudyData.filter((d) => d.studied > 0 || d.target > 0);
    if (selectedGoalChartId === ALL_GOALS_CHART_FILTER) return withData.slice(0, 8);
    return withData.filter((d) => String(d.id) === String(selectedGoalChartId));
  }, [goalStudyData, selectedGoalChartId]);

  const goalChartMaxHours = useMemo(() => {
    if (!goalStudyChartData.length) return 1;
    const max = Math.max(...goalStudyChartData.flatMap((d) => [Number(d.studied) || 0, Number(d.target) || 0]));
    return max > 0 ? max : 1;
  }, [goalStudyChartData]);

  const goalCards = useMemo(
    () =>
      [...ongoingGoals]
        .sort((a, b) => {
          if (isGoalOverdueStatus(a.status) && !isGoalOverdueStatus(b.status)) return -1;
          if (!isGoalOverdueStatus(a.status) && isGoalOverdueStatus(b.status)) return 1;
          const aTime = dayjs(a.updatedAt || a.createdAt).valueOf();
          const bTime = dayjs(b.updatedAt || b.createdAt).valueOf();
          return bTime - aTime;
        })
        .map((g) => {
          const studiedSec = studySecondsForGoal[String(g.id)] || 0;
          const pct = getGoalStudyProgressPct(g, studiedSec);
          const milestones = getMilestoneProgress(g);
          return { goal: g, studiedSec, pct, milestones };
        }),
    [ongoingGoals, studySecondsForGoal]
  );

  const recentGoalCards = useMemo(() => goalCards.slice(0, 3), [goalCards]);

  const selectedActiveGoalCard = useMemo(
    () =>
      selectedActiveGoalId === RECENT_GOALS_FILTER
        ? null
        : goalCards.find((c) => String(c.goal.id) === String(selectedActiveGoalId)) || null,
    [goalCards, selectedActiveGoalId]
  );

  const browsingRecentGoals = selectedActiveGoalId === RECENT_GOALS_FILTER;
  const visibleGoalCards = browsingRecentGoals
    ? recentGoalCards
    : selectedActiveGoalCard
      ? [selectedActiveGoalCard]
      : [];

  if (loading || plansLoading) {
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
          Progress & Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Goals, study sessions, and weekly progress overview
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="Total Study Time"
            value={`${formatHours(totalSeconds)}h`}
            subtitle={`${completedSessions.length} sessions · avg ${avgSessionHours}h`}
            icon={<TimerIcon />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="This Week's Study Time"
            value={formatStudyMinutes(weekStudy.seconds)}
            subtitle={
              weekStudy.count > 0
                ? `${weekStudy.count} session${weekStudy.count === 1 ? '' : 's'} this week`
                : 'No study sessions this week yet'
            }
            icon={<TrendingUpIcon />}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="Goals"
            value={`${completedGoals}/${goals.length}`}
            subtitle={`${ongoingGoals.length} ongoing${overdueGoals ? ` · ${overdueGoals} overdue` : ''}`}
            icon={<FlagIcon />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="Interim goals"
            value={`${completedMilestones}/${totalMilestones}`}
            subtitle={
              totalMilestones > 0
                ? `${completedMilestones}/${totalMilestones} on active goals`
                : 'No interim goals on active goals'
            }
            icon={<EmojiEventsIcon />}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="This Month's Study Time"
            value={formatStudyMinutes(monthStudy.seconds)}
            subtitle={
              monthStudy.count > 0
                ? `${monthStudy.count} session${monthStudy.count === 1 ? '' : 's'} this month`
                : 'No study sessions this month yet'
            }
            icon={<CalendarMonthIcon />}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            label="Milestones"
            details={[
              { label: 'Total milestones', value: goalMilestoneTotal },
              { label: 'Completed milestones', value: goalMilestoneDone },
              { label: 'Incomplete milestones', value: goalMilestonePending },
            ]}
            icon={<TrackChangesIcon />}
            color="primary"
          />
        </Grid>
      </Grid>

      {goalCards.length > 0 && (
        <Card elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2,
                mb: 2.5,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Active Goals Progress
                  </Typography>
                  <Chip label={`${goalCards.length} ongoing`} size="small" color="primary" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {browsingRecentGoals
                    ? `Showing 3 most recent of ${goalCards.length} ongoing goal${goalCards.length === 1 ? '' : 's'}`
                    : 'Viewing selected goal — switch back to see recent goals'}
                </Typography>
              </Box>
              <TextField
                select
                label="Browse goals"
                value={selectedActiveGoalId}
                onChange={(e) => setSelectedActiveGoalId(e.target.value)}
                size="small"
                sx={{ minWidth: 220 }}
              >
                <MenuItem value={RECENT_GOALS_FILTER}>Recent 3 goals</MenuItem>
                {goalCards.map(({ goal }) => (
                  <MenuItem key={goal.id} value={String(goal.id)}>
                    {goal.title}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Grid container spacing={2}>
              {visibleGoalCards.map((item) => (
                <Grid
                  size={{ xs: 12, md: browsingRecentGoals ? 4 : 12 }}
                  key={item.goal.id}
                >
                  <OngoingGoalCard
                    {...item}
                    featured={!browsingRecentGoals}
                  />
                </Grid>
              ))}
            </Grid>

            {browsingRecentGoals && goalCards.length > 3 && (
              <Typography variant="caption" color="text.secondary" display="block" mt={2} textAlign="center">
                {goalCards.length - 3} more goal{goalCards.length - 3 === 1 ? '' : 's'} — use Browse goals to view
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard title="Daily Study Activity" subtitle="Hours studied per day — last 30 days" height={240}>
            {dailyStudyData.some((d) => d.hours > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStudyData}>
                  <defs>
                    <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} unit="h" width={36} />
                  <RechartsTooltip formatter={(v) => [`${v}h`, 'Study']} />
                  <Area type="monotone" dataKey="hours" stroke={CHART.primary} fill="url(#studyGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No study sessions in the last 30 days. Start the timer to see your activity." />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <ChartCard title="Goal Status" subtitle="Distribution across all goals" height={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ height: 150, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        goalStatusPieSlices.length > 0
                          ? goalStatusPieSlices
                          : [{ name: 'Empty', value: 1, sliceKey: 'empty' }]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      dataKey="value"
                      paddingAngle={goalStatusPieSlices.length > 1 ? 4 : 0}
                    >
                      {(goalStatusPieSlices.length > 0 ? goalStatusPieSlices : [{ name: 'Empty', sliceKey: 'empty' }]).map((entry) => (
                        <Cell
                          key={entry.sliceKey || entry.name}
                          fill={
                            entry.name === 'Empty'
                              ? '#f3f4f6'
                              : GOAL_STATUS_COLORS[entry.status || entry.name] || '#9ca3af'
                          }
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={() => null} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const status = payload[0]?.payload?.status || payload[0]?.name;
                      return (
                        <Paper sx={{ px: 1.5, py: 1, borderRadius: 1 }} elevation={2}>
                          <Typography variant="caption">{status}</Typography>
                        </Paper>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <Grid container spacing={1} sx={{ mt: 1 }}>
                {goalStatusData.map((item) => (
                  <Grid size={6} key={item.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          flexShrink: 0,
                          bgcolor: GOAL_STATUS_COLORS[item.name] || '#9ca3af',
                        }}
                      />
                      <Typography variant="caption" fontWeight={500} color="text.primary">
                        {item.name} : {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="Planned vs Actual Study"
            subtitle="Weekly planned hours vs hours actually studied"
            height={260}
          >
            {weeklyCompareData.some((d) => d.studied > 0 || d.planned > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCompareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="h" width={36} />
                  <RechartsTooltip formatter={(v, n) => [`${v}h`, n === 'studied' ? 'Studied' : 'Planned']} />
                  <Legend formatter={(v) => (v === 'studied' ? 'Studied' : 'Planned')} />
                  <Bar dataKey="planned" fill={CHART.muted} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="studied" fill={CHART.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Create plans and study sessions to compare planned vs actual time." />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <ChartCard title="Plan Status" subtitle="All scheduled study plans" height={260}>
            {planStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {planStatusData.map((entry) => (
                      <Cell key={entry.name} fill={PLAN_STATUS_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No plans yet. Add plans from the Planning page." />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 2,
                  mb: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                    Study vs Target per Goal
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {selectedGoalChartId === ALL_GOALS_CHART_FILTER
                      ? 'Hours studied compared to your 6-month targets'
                      : 'Hours studied compared to target for the selected goal'}
                  </Typography>
                </Box>
                <TextField
                  select
                  label="Select Goal"
                  value={selectedGoalChartId}
                  onChange={(e) => setSelectedGoalChartId(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value={ALL_GOALS_CHART_FILTER}>All goals</MenuItem>
                  {goals.map((g) => (
                    <MenuItem key={g.id} value={String(g.id)}>
                      {g.title}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ width: '100%', height: 280 }}>
                {goalStudyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalStudyChartData} layout="vertical" margin={{ left: 4, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, goalChartMaxHours]}
                        tick={{ fontSize: 10 }}
                        unit="h"
                        allowDecimals
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={96} />
                      <RechartsTooltip formatter={(v, n) => [`${v}h`, n === 'studied' ? 'Studied' : 'Target']} />
                      <Legend formatter={(v) => (v === 'studied' ? 'Studied' : 'Target')} />
                      <Bar dataKey="target" fill={CHART.muted} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="studied" fill={CHART.secondary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart
                    message={
                      selectedGoalChartId !== ALL_GOALS_CHART_FILTER
                        ? 'No study or target hours for this goal yet.'
                        : 'Link study sessions to goals or set target hours on your goals.'
                    }
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                Summary
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Key metrics at a glance
              </Typography>

              {[
                {
                  label: 'Goals completed',
                  value: completedGoals,
                  total: goals.length,
                  color: 'success',
                },
                {
                  label: 'Interim goals (active)',
                  value: goalMilestoneDone,
                  total: goalMilestoneTotal,
                  color: 'warning',
                },
                ...(standaloneMilestones.length
                  ? [{
                      label: 'Interim goals (standalone)',
                      value: standaloneDone,
                      total: standaloneMilestones.length,
                      color: 'warning',
                    }]
                  : []),
                {
                  label: 'Plans completed',
                  value: planStats.completed,
                  total: planStats.total,
                  color: 'primary',
                },
                {
                  label: 'Plans missed',
                  value: planStats.missed,
                  total: planStats.total,
                  color: 'error',
                },
              ].map((item, idx, arr) => (
                <Box key={item.label}>
                  {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Chip
                      label={`${item.value}/${item.total}`}
                      size="small"
                      color={item.color}
                      variant="outlined"
                      sx={{ fontSize: 11 }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.total ? Math.min(100, (item.value / item.total) * 100) : 0}
                    color={item.color}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}

              {standaloneMilestones.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                  Standalone interim goals are managed on the Monthly Plan page.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProgressPage;
