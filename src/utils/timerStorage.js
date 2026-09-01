import { dayjs } from './helpers';

const TIMER_STORAGE_KEY = 'lm_study_timer';

/** Elapsed seconds from session startTime until now (for Continue / recovery). */
export const getElapsedSinceStart = (session) => {
  if (!session?.startTime) return 0;
  return Math.max(0, dayjs().diff(dayjs(session.startTime), 'second'));
};

export const loadTimerState = () => {
  try {
    const raw = sessionStorage.getItem(TIMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveTimerState = (state) => {
  try {
    sessionStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
};

export const clearTimerState = () => {
  sessionStorage.removeItem(TIMER_STORAGE_KEY);
};

/** Resume elapsed time if the timer was running when the user left the page. */
export const resolveElapsedFromSaved = (saved) => {
  if (!saved) return 0;
  if (!saved.isRunning || !saved.lastTickAt) return saved.elapsed ?? 0;
  const awaySeconds = Math.floor((Date.now() - saved.lastTickAt) / 1000);
  return Math.max(0, (saved.elapsed ?? 0) + awaySeconds);
};
