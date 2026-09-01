import { dayjs } from './helpers';
import { isGoalOngoingStatus, getGoalStudyProgressPct } from './goalHelpers';
import { isPlanMissed } from './planHelpers';
import { getSessionDateKey, getDayTotalSeconds } from './studyCalendar';

export const NOTIFICATION_STORAGE = {
  dismissed: 'sm_notif_dismissed',
  sent: 'sm_notif_sent',
  lastVisit: 'sm_last_visit',
};

export const PLAN_REMINDER_WINDOWS = [
  { key: '24h', minutes: 24 * 60, label: 'in 24 hours' },
  { key: '1h', minutes: 60, label: 'in 1 hour' },
  { key: '15m', minutes: 15, label: 'in 15 minutes' },
  { key: 'now', minutes: 0, label: 'now' },
];

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const loadDismissedIds = () => new Set(loadJson(NOTIFICATION_STORAGE.dismissed, []));

export const saveDismissedIds = (ids) => {
  localStorage.setItem(NOTIFICATION_STORAGE.dismissed, JSON.stringify([...ids]));
};

export const loadSentKeys = () => {
  const map = loadJson(NOTIFICATION_STORAGE.sent, {});
  const cutoff = dayjs().subtract(7, 'day').valueOf();
  return Object.fromEntries(Object.entries(map).filter(([, ts]) => ts >= cutoff));
};

export const markSentKey = (key) => {
  const map = loadSentKeys();
  map[key] = Date.now();
  localStorage.setItem(NOTIFICATION_STORAGE.sent, JSON.stringify(map));
};

export const wasSentKey = (key) => Boolean(loadSentKeys()[key]);

export const touchLastVisit = () => {
  const now = new Date().toISOString();
  localStorage.setItem(NOTIFICATION_STORAGE.lastVisit, now);
  return now;
};

export const getLastVisit = () => localStorage.getItem(NOTIFICATION_STORAGE.lastVisit);

const formatPlanTime = (plannedDate) => dayjs(plannedDate).format('ddd, MMM D · HH:mm');

const minutesUntil = (plannedDate, now = dayjs()) => dayjs(plannedDate).diff(now, 'minute');

const todayKey = (now = dayjs()) => now.format('YYYY-MM-DD');

export const getLastStudyDate = (studySessions = []) => {
  const keys = studySessions
    .filter((s) => s.status !== 'ACTIVE')
    .map((s) => getSessionDateKey(s))
    .filter(Boolean)
    .sort()
    .reverse();
  return keys[0] ? dayjs(keys[0]) : null;
};

export const getDaysSinceStudy = (studySessions = [], now = dayjs()) => {
  const last = getLastStudyDate(studySessions);
  if (!last) return null;
  return now.diff(last, 'day');
};

export const buildPlanNotifications = (plans = [], now = dayjs()) => {
  const items = [];
  const dayKey = todayKey(now);

  plans.forEach((plan) => {
    if (plan.status !== 'PLANNED') return;

    const planId = plan.id;
    const timeLabel = formatPlanTime(plan.plannedDate);
    const diffMin = minutesUntil(plan.plannedDate, now);
    const isToday = dayjs(plan.plannedDate).isSame(now, 'day');
    const isFuture = diffMin > 0;
    const withinWeek = diffMin >= 0 && diffMin <= 7 * 24 * 60;

    if (isToday && isFuture) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      const startsIn =
        hours > 0 ? `in ${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `in ${mins} minutes`;

      items.push({
        id: `plan-${planId}-today-${dayKey}`,
        type: 'plan',
        severity: diffMin <= 15 ? 'warning' : 'info',
        title: diffMin <= 15 ? 'Session starting soon' : 'Today\'s study session',
        message: `"${plan.title}" ${startsIn} (${timeLabel}).`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Start timer',
        entityId: planId,
        diffMin,
      });
    } else if (isToday && !isFuture) {
      items.push({
        id: `plan-${planId}-missed-${dayKey}`,
        type: 'plan',
        severity: 'error',
        title: 'Missed study session',
        message: `"${plan.title}" was planned for ${timeLabel} but is not completed yet.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Start now',
        entityId: planId,
        pushKey: `plan-${planId}-missed-${dayKey}`,
      });
    } else if (isPlanMissed(plan)) {
      items.push({
        id: `plan-${planId}-overdue-${dayjs(plan.plannedDate).format('YYYY-MM-DD')}`,
        type: 'plan',
        severity: 'error',
        title: 'Overdue planned session',
        message: `"${plan.title}" from ${timeLabel} was never completed.`,
        timestamp: now.toISOString(),
        actionPath: '/planning',
        actionLabel: 'Review plan',
        entityId: planId,
        pushKey: `plan-${planId}-overdue-${dayjs(plan.plannedDate).format('YYYY-MM-DD')}`,
      });
    } else if (withinWeek && !isToday) {
      const days = Math.ceil(diffMin / (24 * 60));
      items.push({
        id: `plan-${planId}-ahead-${dayKey}`,
        type: 'plan',
        severity: 'info',
        title: 'Upcoming study session',
        message: `"${plan.title}" in ${days} day${days === 1 ? '' : 's'} (${timeLabel}).`,
        timestamp: now.toISOString(),
        actionPath: '/planning',
        actionLabel: 'View plan',
        entityId: planId,
        diffMin,
      });
    }
  });

  return items;
};

export const getPlanPushCandidates = (plans = [], now = dayjs()) => {
  const candidates = [];

  plans.forEach((plan) => {
    if (plan.status !== 'PLANNED') return;
    const diffMin = minutesUntil(plan.plannedDate, now);
    const planId = plan.id;
    const timeLabel = formatPlanTime(plan.plannedDate);
    const dayKey = dayjs(plan.plannedDate).format('YYYY-MM-DD');

    PLAN_REMINDER_WINDOWS.forEach(({ key, minutes, label }) => {
      if (diffMin >= 0 && diffMin <= minutes && diffMin > minutes - 5) {
        candidates.push({
          title: minutes === 0 ? 'Study session starting' : 'Upcoming study session',
          message:
            minutes === 0
              ? `"${plan.title}" is scheduled for ${timeLabel}. Time to begin!`
              : `"${plan.title}" starts ${label} (${timeLabel}).`,
          pushKey: `plan-${planId}-${key}-${dayKey}`,
        });
      }
    });
  });

  return candidates;
};

export const buildGoalNotifications = (goals = [], studySessions = [], now = dayjs()) => {
  const items = [];
  const studiedByGoal = {};
  const dayKey = todayKey(now);

  studySessions.forEach((session) => {
    const goalId = session.goalId;
    if (!goalId) return;
    studiedByGoal[goalId] =
      (studiedByGoal[goalId] || 0) + Number(session.duration ?? session.durationSeconds ?? 0);
  });

  const activeGoals = goals.filter((g) => isGoalOngoingStatus(g.status));

  activeGoals.forEach((goal) => {
    const goalId = goal.id;
    const endDate = goal.endDate ? dayjs(goal.endDate) : null;
    const daysLeft = endDate ? endDate.diff(now, 'day') : null;
    const progress = getGoalStudyProgressPct(goal, studiedByGoal[goalId] || 0);

    if (goal.status === 'OVERDUE') {
      items.push({
        id: `goal-${goalId}-overdue-${dayKey}`,
        type: 'goal',
        severity: 'error',
        title: 'Goal overdue',
        message: `"${goal.title}" is past its deadline. Update your progress or extend the period.`,
        timestamp: now.toISOString(),
        actionPath: '/goals',
        actionLabel: 'Open goals',
        entityId: goalId,
        pushKey: `goal-${goalId}-overdue-${dayKey}`,
      });
      return;
    }

    if (endDate && daysLeft === 0) {
      items.push({
        id: `goal-${goalId}-due-today-${dayKey}`,
        type: 'goal',
        severity: 'warning',
        title: 'Goal due today',
        message: `"${goal.title}" ends today (${progress}% of target reached).`,
        timestamp: now.toISOString(),
        actionPath: '/goals',
        actionLabel: 'View goal',
        entityId: goalId,
        pushKey: `goal-${goalId}-due-${dayKey}`,
      });
    } else if (endDate && daysLeft > 0 && daysLeft <= 3) {
      items.push({
        id: `goal-${goalId}-due-soon-${dayKey}`,
        type: 'goal',
        severity: 'warning',
        title: 'Goal deadline approaching',
        message: `"${goal.title}" ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} · ${progress}% done.`,
        timestamp: now.toISOString(),
        actionPath: '/goals',
        actionLabel: 'View goal',
        entityId: goalId,
        pushKey: `goal-${goalId}-soon-${dayKey}`,
      });
    } else if (endDate && daysLeft > 0 && daysLeft <= 14 && progress < 40) {
      items.push({
        id: `goal-${goalId}-behind-${dayKey}`,
        type: 'goal',
        severity: 'info',
        title: 'Goal needs attention',
        message: `"${goal.title}" — ${progress}% complete with ${daysLeft} days remaining.`,
        timestamp: now.toISOString(),
        actionPath: '/goals',
        actionLabel: 'View goal',
        entityId: goalId,
        pushKey: `goal-${goalId}-behind-${dayKey}`,
      });
    }
  });

  const daysSinceStudy = getDaysSinceStudy(studySessions, now);
  if (activeGoals.length > 0 && daysSinceStudy != null && daysSinceStudy >= 2) {
    const staleGoals = activeGoals.filter((g) => {
      const studied = studiedByGoal[g.id] || 0;
      return getGoalStudyProgressPct(g, studied) < 100;
    });
    if (staleGoals.length > 0 && daysSinceStudy >= 2 && daysSinceStudy < 3) {
      items.push({
        id: `goal-checkin-${dayKey}`,
        type: 'goal',
        severity: 'info',
        title: 'Keep your goals moving',
        message: `${staleGoals.length} active goal(s) — last study was ${daysSinceStudy} days ago.`,
        timestamp: now.toISOString(),
        actionPath: '/goals',
        actionLabel: 'Review goals',
        pushKey: `goal-checkin-${dayKey}`,
      });
    }
  }

  return items;
};

export const buildInactivityNotifications = (
  plans = [],
  studySessions = [],
  goals = [],
  lastVisitAt = null,
  now = dayjs()
) => {
  const items = [];
  const dayKey = todayKey(now);
  const activeGoals = goals.filter((g) => isGoalOngoingStatus(g.status));

  const todayPlans = plans.filter(
    (p) => p.status === 'PLANNED' && dayjs(p.plannedDate).format('YYYY-MM-DD') === dayKey
  );

  const todayStudySec = studySessions
    .filter((s) => getSessionDateKey(s) === dayKey)
    .reduce((sum, s) => sum + Number(s.duration ?? s.durationSeconds ?? 0), 0);

  const studiedMinutes = todayStudySec / 60;
  const daysSinceStudy = getDaysSinceStudy(studySessions, now);

  if (todayPlans.length > 0) {
    const pastDuePlans = todayPlans.filter((p) =>
      dayjs(p.plannedDate).add(30, 'minute').isBefore(now)
    );

    if (pastDuePlans.length > 0 && todayStudySec === 0) {
      items.push({
        id: `inactivity-missed-${dayKey}`,
        type: 'inactivity',
        severity: 'error',
        title: 'No study activity today',
        message: `${pastDuePlans.length} planned session${pastDuePlans.length === 1 ? '' : 's'} passed without any study logged.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Start studying',
        pushKey: `inactivity-missed-${dayKey}`,
      });
    }

    if (now.hour() >= 20 && studiedMinutes < 30) {
      items.push({
        id: `inactivity-evening-${dayKey}`,
        type: 'inactivity',
        severity: 'warning',
        title: 'End-of-day reminder',
        message: `Planned study time remains today. Only ${Math.round(studiedMinutes)} min logged so far.`,
        timestamp: now.toISOString(),
        actionPath: '/planning',
        actionLabel: 'Check schedule',
        pushKey: `inactivity-evening-${dayKey}`,
      });
    }

    const nextPlan = todayPlans
      .filter((p) => dayjs(p.plannedDate).isAfter(now))
      .sort((a, b) => dayjs(a.plannedDate).diff(dayjs(b.plannedDate)))[0];

    if (nextPlan && studiedMinutes === 0 && minutesUntil(nextPlan.plannedDate, now) <= 90) {
      items.push({
        id: `inactivity-upcoming-${dayKey}-${nextPlan.id}`,
        type: 'inactivity',
        severity: 'info',
        title: 'Get ready to study',
        message: `"${nextPlan.title}" starts soon. Prepare your workspace.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Open timer',
        entityId: nextPlan.id,
        pushKey: `inactivity-upcoming-${dayKey}-${nextPlan.id}`,
      });
    }
  }

  if (activeGoals.length > 0) {
    if (daysSinceStudy === null) {
      items.push({
        id: `inactivity-first-${dayKey}`,
        type: 'inactivity',
        severity: 'info',
        title: 'Start tracking your progress',
        message: `You have ${activeGoals.length} active goal(s) but no study sessions yet.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Start timer',
        pushKey: `inactivity-first-${dayKey}`,
      });
    } else if (daysSinceStudy >= 7) {
      items.push({
        id: `inactivity-long-${dayKey}`,
        type: 'inactivity',
        severity: 'error',
        title: 'Long-term inactivity',
        message: `No study logged for ${daysSinceStudy} days. Return to your goals before you lose momentum.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Study now',
        pushKey: `inactivity-long-${dayKey}`,
      });
    } else if (daysSinceStudy >= 3) {
      items.push({
        id: `inactivity-medium-${dayKey}`,
        type: 'inactivity',
        severity: 'warning',
        title: 'Inactivity reminder',
        message: `Last study was ${daysSinceStudy} days ago. A short session keeps your streak alive.`,
        timestamp: now.toISOString(),
        actionPath: '/timer',
        actionLabel: 'Start session',
        pushKey: `inactivity-medium-${dayKey}`,
      });
    }
  }

  if (lastVisitAt && activeGoals.length > 0) {
    const daysSinceVisit = now.diff(dayjs(lastVisitAt), 'day');
    if (daysSinceVisit >= 2 && daysSinceStudy != null && daysSinceStudy >= 2) {
      items.push({
        id: `inactivity-return-${dayKey}`,
        type: 'inactivity',
        severity: 'info',
        title: 'Welcome back',
        message: 'Good to see you again. Pick up where you left off with a quick review.',
        timestamp: now.toISOString(),
        actionPath: '/',
        actionLabel: 'Dashboard',
        pushKey: `inactivity-return-${dayKey}`,
      });
    }
  }

  return items;
};

export const buildAllNotifications = (
  plans = [],
  goals = [],
  studySessions = [],
  lastVisitAt = null
) => {
  const now = dayjs();
  const map = new Map();

  [
    ...buildPlanNotifications(plans, now),
    ...buildGoalNotifications(goals, studySessions, now),
    ...buildInactivityNotifications(plans, studySessions, goals, lastVisitAt, now),
  ].forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });

  const severityOrder = { error: 0, warning: 1, info: 2 };
  return [...map.values()].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );
};

export const getReminderSummary = (plans = [], goals = [], studySessions = []) => {
  const now = dayjs();
  const notifications = buildAllNotifications(plans, goals, studySessions, getLastVisit());
  const daysSinceStudy = getDaysSinceStudy(studySessions, now);
  const upcomingPlans = plans.filter(
    (p) =>
      p.status === 'PLANNED' &&
      dayjs(p.plannedDate).isAfter(now) &&
      dayjs(p.plannedDate).isBefore(now.add(7, 'day'))
  ).length;

  return {
    notifications,
    daysSinceStudy,
    upcomingPlans,
    activeGoals: goals.filter((g) => isGoalOngoingStatus(g.status)).length,
    todayStudyMinutes: Math.round(
      getDayTotalSeconds(
        studySessions.filter((s) => getSessionDateKey(s) === now.format('YYYY-MM-DD'))
      ) / 60
    ),
  };
};

export const getTodayStudyMinutes = (studySessions = []) => {
  const todayKey = dayjs().format('YYYY-MM-DD');
  return Math.round(
    getDayTotalSeconds(studySessions.filter((s) => getSessionDateKey(s) === todayKey)) / 60
  );
};

export const filterOpenNotifications = (notifications, dismissedIds) =>
  notifications.filter((n) => !dismissedIds.has(n.id));

export const pruneStaleDismissals = (dismissedIds) => {
  const today = dayjs().format('YYYY-MM-DD');
  const next = new Set(
    [...dismissedIds].filter((id) => {
      const match = id.match(/\d{4}-\d{2}-\d{2}$/);
      if (!match) return true;
      return match[0] === today;
    })
  );
  if (next.size !== dismissedIds.size) saveDismissedIds(next);
  return next;
};
