import { dayjs } from './helpers';

export const getSessionDurationSec = (session) =>
  Number(session?.duration ?? session?.durationSeconds ?? 0);

export const getSessionDateKey = (session) => {
  if (session?.startTime) return dayjs(session.startTime).format('YYYY-MM-DD');
  if (session?.date) return dayjs(session.date).format('YYYY-MM-DD');
  if (session?.endTime) return dayjs(session.endTime).format('YYYY-MM-DD');
  return null;
};

export const getCompletedSessions = (sessions) =>
  (Array.isArray(sessions) ? sessions : []).filter((s) => s.status !== 'ACTIVE');

/** Keep only sessions owned by the given user. Backend already scopes by JWT; this is a client guard. */
export const filterOwnSessions = (sessions, userId) => {
  const list = Array.isArray(sessions) ? sessions : [];
  if (userId == null || userId === '') return list;
  const uid = Number(userId);
  return list.filter((s) => {
    if (s?.userId == null) return true;
    return Number(s.userId) === uid;
  });
};

export const groupSessionsByDate = (sessions) => {
  const map = {};
  getCompletedSessions(sessions).forEach((session) => {
    const key = getSessionDateKey(session);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(session);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => dayjs(a.startTime || a.date).diff(dayjs(b.startTime || b.date)))
  );
  return map;
};

export const getDayTotalSeconds = (sessions) =>
  sessions.reduce((sum, s) => sum + getSessionDurationSec(s), 0);

/** low < 30min, medium 30–89min, high >= 90min */
export const getDayStudyLevel = (sessions) => {
  const totalMin = getDayTotalSeconds(sessions) / 60;
  if (totalMin >= 90) return 'high';
  if (totalMin >= 30) return 'medium';
  if (totalMin > 0) return 'low';
  return 'none';
};

/** Green intensity: Light = pale, Good = mid, Great = strongest mint */
export const DAY_STUDY_STYLES = {
  none: {
    bgcolor: '#ffffff',
    hoverBg: '#f8fafc',
    borderColor: '#e2e8f0',
    dot: null,
    label: 'No study',
  },
  low: {
    bgcolor: '#F1F8E9',
    hoverBg: '#DCEDC8',
    borderColor: '#C5E1A5',
    dot: '#AED581',
    label: 'Light (< 30 min)',
  },
  medium: {
    bgcolor: '#C8E6C9',
    hoverBg: '#A5D6A7',
    borderColor: '#81C784',
    dot: '#66BB6A',
    label: 'Good (30–89 min)',
  },
  high: {
    bgcolor: '#B9F6CA',
    hoverBg: '#69F0AE',
    borderColor: '#4CAF50',
    dot: '#2E7D32',
    label: 'Great (90+ min)',
  },
};

export const formatStudyMinutes = (seconds) => {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
