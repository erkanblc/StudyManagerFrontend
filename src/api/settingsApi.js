import { api, authHeaders } from './client';

const getToken = () => {
  try {
    const stored = localStorage.getItem('lm_auth_user');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
};

const withAuth = () => authHeaders(getToken());

export const DEFAULT_MAX_SESSION_HOURS = 6;
export const MIN_MAX_SESSION_HOURS = 6;
export const MAX_MAX_SESSION_HOURS = 24;
export const MAX_SESSION_HOURS_KEY = 'max.session.hours';

/** Manual duration edits (Add Study Time / Edit Session): fixed bounds, not admin timer limit. */
export const MANUAL_MIN_DURATION_SECONDS = 3;
export const MANUAL_MAX_DURATION_HOURS = 24;
export const MANUAL_MAX_DURATION_SECONDS = MANUAL_MAX_DURATION_HOURS * 3600;

/** Authenticated users (students + admins) — read max session duration. */
export const fetchMaxSessionHours = () =>
  api.get('/api/settings/max-session-hours', withAuth()).then((r) => {
    const hours = Number(r.data?.maxHours ?? r.data?.value ?? DEFAULT_MAX_SESSION_HOURS);
    return {
      maxHours: hours,
      maxMinutes: Number(r.data?.maxMinutes ?? hours * 60),
      maxSeconds: Number(r.data?.maxSeconds ?? hours * 3600),
      value: String(r.data?.value ?? hours),
      key: r.data?.key ?? MAX_SESSION_HOURS_KEY,
    };
  });

export const clampMaxSessionHours = (value) => {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return DEFAULT_MAX_SESSION_HOURS;
  return Math.min(MAX_MAX_SESSION_HOURS, Math.max(MIN_MAX_SESSION_HOURS, n));
};
