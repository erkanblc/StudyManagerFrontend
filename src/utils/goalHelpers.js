import { dayjs } from './helpers';

export const GOAL_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'success' },
  { value: 'PAUSED', label: 'Paused', color: 'warning' },
  { value: 'OVERDUE', label: 'Overdue', color: 'error' },
  { value: 'COMPLETED', label: 'Completed', color: 'primary' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'default' },
  { value: 'ARCHIVED', label: 'Archived', color: 'default' },
];

/** Normalize API / form status to a known GOAL_STATUSES value. */
export const normalizeGoalStatus = (status) => {
  if (status == null || status === '') return 'ACTIVE';
  const key = String(status).trim().toUpperCase();
  return GOAL_STATUSES.some((s) => s.value === key) ? key : 'ACTIVE';
};

export const getGoalStatusMeta = (status) => {
  const key = normalizeGoalStatus(status);
  return GOAL_STATUSES.find((s) => s.value === key) || GOAL_STATUSES[0];
};

export const isGoalCompletedStatus = (status) => normalizeGoalStatus(status) === 'COMPLETED';

export const isGoalActiveStatus = (status) => normalizeGoalStatus(status) === 'ACTIVE';

export const isGoalOverdueStatus = (status) => normalizeGoalStatus(status) === 'OVERDUE';

export const isGoalInProgressStatus = (status) =>
  ['ACTIVE', 'PAUSED'].includes(normalizeGoalStatus(status));

export const isGoalOngoingStatus = (status) =>
  ['ACTIVE', 'PAUSED', 'OVERDUE'].includes(normalizeGoalStatus(status));

export const isGoalCancelledOrArchivedStatus = (status) =>
  ['CANCELLED', 'ARCHIVED'].includes(normalizeGoalStatus(status));

export const isGoalClosedStatus = (status) =>
  ['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(normalizeGoalStatus(status));

/** Tab index on Goals page for a given status. */
export const getGoalStatusTabIndex = (status) => {
  const key = normalizeGoalStatus(status);
  if (key === 'OVERDUE') return 1;
  if (key === 'COMPLETED') return 2;
  if (key === 'CANCELLED' || key === 'ARCHIVED') return 3;
  return 0;
};

export const getDefaultGoalDates = () => ({
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().add(6, 'month').format('YYYY-MM-DD'),
});

export const getEndDateFromStart = (startDate) =>
  dayjs(startDate).add(6, 'month').format('YYYY-MM-DD');

export const isGoalDateRangeValid = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  return !dayjs(startDate).isAfter(dayjs(endDate), 'day');
};

export const getMilestoneProgress = (goal) => {
  const total = goal?.milestoneCount ?? goal?.milestones?.length ?? 0;
  const completed = goal?.completedMilestoneCount
    ?? goal?.milestones?.filter((m) => m.completed)?.length
    ?? 0;
  return { completed, total };
};

export const formatGoalPeriod = (goal) => {
  if (!goal?.startDate && !goal?.endDate) return null;
  const start = goal.startDate ? dayjs(goal.startDate).format('MMM D, YYYY') : '—';
  const end = goal.endDate ? dayjs(goal.endDate).format('MMM D, YYYY') : '—';
  return `${start} – ${end}`;
};

export const getGoalStudyProgressPct = (goal, studiedSeconds = 0) => {
  const targetHours = Number(goal?.targetHours ?? 0);
  if (!targetHours) return 0;
  return Math.min(100, Math.round((studiedSeconds / 3600 / targetHours) * 100));
};

export const isDateInGoalRange = (date, goal) => {
  if (!goal) return false;
  const d = dayjs(date);
  if (goal.startDate && d.isBefore(dayjs(goal.startDate), 'day')) return false;
  if (goal.endDate && d.isAfter(dayjs(goal.endDate), 'day')) return false;
  if (!goal.startDate && !goal.endDate) return false;
  return true;
};

/** Returns an error message if study date is outside the goal period; otherwise null. */
export const getGoalDateViolation = (date, goal) => {
  if (!goal || !date) return null;
  const d = dayjs(date);
  if (goal.startDate && d.isBefore(dayjs(goal.startDate), 'day')) {
    return `Study date cannot be before the goal start (${dayjs(goal.startDate).format('D MMM YYYY')}).`;
  }
  if (goal.endDate && d.isAfter(dayjs(goal.endDate), 'day')) {
    return `Study date cannot be after the goal end (${dayjs(goal.endDate).format('D MMM YYYY')}).`;
  }
  return null;
};

export const goalOverlapsPeriod = (goal, periodStart, periodEnd) => {
  if (!goal?.startDate && !goal?.endDate) return true;
  const start = goal.startDate ? dayjs(goal.startDate) : dayjs(periodStart);
  const end = goal.endDate ? dayjs(goal.endDate) : dayjs(periodEnd);
  return !end.isBefore(dayjs(periodStart), 'day') && !start.isAfter(dayjs(periodEnd).subtract(1, 'day'), 'day');
};
