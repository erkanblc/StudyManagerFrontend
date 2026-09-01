import { dayjs } from './helpers';

/** lastLoginAt = previous login from POST /api/auth/login (null on first login) */
export const getDaysSinceLogin = (lastLoginAt) => {
  if (!lastLoginAt) return null;
  return dayjs().startOf('day').diff(dayjs(lastLoginAt).startOf('day'), 'day');
};

export const shouldShowLoginGapAlert = (lastLoginAt) => {
  const days = getDaysSinceLogin(lastLoginAt);
  return days !== null && days > 2;
};

/** Yellow at 3 days → red at 20+ days */
export const getLoginGapColors = (days) => {
  const minDays = 3;
  const maxDays = 20;
  const t = Math.min(1, Math.max(0, (days - minDays) / (maxDays - minDays)));

  const r = Math.round(245 + (220 - 245) * t);
  const g = Math.round(158 + (38 - 158) * t);
  const b = Math.round(11 + (38 - 11) * t);

  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.14)`,
    border: `rgb(${r}, ${g}, ${b})`,
    text: `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)})`,
    accent: `rgb(${r}, ${g}, ${b})`,
  };
};

export const buildLoginGapMessage = (name, days) => {
  const displayName = name || 'Hi';
  const dayLabel = days === 1 ? 'day' : 'days';
  return `${displayName}, you haven't signed in for ${days} ${dayLabel} — your plans are falling behind!`;
};
