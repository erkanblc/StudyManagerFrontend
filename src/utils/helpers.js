import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.extend(utc);

export { dayjs };

export const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

export const formatHours = (seconds) => (seconds / 3600).toFixed(1);

/**
 * Convert a local datetime (from form inputs) to ISO 8601 UTC with Z,
 * e.g. "2026-07-17T19:00:00.000Z". Backend expects ZonedDateTime UTC.
 */
export const toUtcIso = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return null;
  return parsed.toISOString();
};

/** Format an API UTC datetime for local date/time inputs (datetime-local / time). */
export const toLocalInputDateTime = (value, format = 'YYYY-MM-DDTHH:mm') =>
  value ? dayjs(value).format(format) : '';

/** Extract a user-facing message from an Axios error (400 body.message, etc.). */
export const getApiErrorMessage = (err, fallback = 'Something went wrong.') => {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.detail && typeof data.detail === 'string') return data.detail;
  if (data?.error && typeof data.error === 'string' && data.error !== 'Internal Server Error') {
    return data.error;
  }
  return fallback;
};

export const GOAL_TYPES = [
  { value: 'module_completion', label: 'Module Completion' },
  { value: 'exam', label: 'Exam / Test' },
  { value: 'report', label: 'Project Report' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
];

export const GOAL_STATUS = {
  pending: { label: 'Pending', color: 'default' },
  in_progress: { label: 'In Progress', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
};

export const SESSION_TYPES = [
  { value: 'study', label: 'Study' },
  { value: 'review', label: 'Review' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'project', label: 'Project Work' },
];

export const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export const getMonthsRange = (startDate) => {
  const months = [];
  for (let i = 0; i < 6; i++) {
    months.push(dayjs(startDate).add(i, 'month').format('YYYY-MM'));
  }
  return months;
};
