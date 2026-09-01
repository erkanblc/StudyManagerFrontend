import { dayjs } from './helpers';

export const PLAN_TYPES = [
  { value: 'STUDY', label: 'Study' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'EXAM_PREP', label: 'Exam Prep' },
  { value: 'PROJECT', label: 'Project Work' },
];

export const PLAN_STATUS = {
  PLANNED: { label: 'Planned', color: 'primary' },
  COMPLETED: { label: 'Completed', color: 'success' },
  MISSED: { label: 'Missed', color: 'error' },
};

export const getPlanTypeLabel = (type) =>
  PLAN_TYPES.find((t) => t.value === type)?.label || type || 'Study';

export const getPlanDateKey = (plan) =>
  plan?.plannedDate ? dayjs(plan.plannedDate).format('YYYY-MM-DD') : null;

export const groupPlansByDate = (plans) => {
  const map = {};
  (Array.isArray(plans) ? plans : []).forEach((plan) => {
    const key = getPlanDateKey(plan);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(plan);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => dayjs(a.plannedDate).diff(dayjs(b.plannedDate)))
  );
  return map;
};

export const formToPlanRequest = (form, goals = []) => {
  const goal = goals.find((g) => String(g.id) === String(form.goalId));
  return {
    title: form.title.trim(),
    goalId: form.goalId ? Number(form.goalId) : null,
    goalTitle: goal?.title || null,
    type: form.type || 'STUDY',
    plannedDate: dayjs(form.plannedDate).toISOString(),
    plannedDurationMinutes: Number(form.plannedDurationMinutes),
    notes: form.notes?.trim() || null,
  };
};

export const planToForm = (plan) => ({
  title: plan?.title || '',
  goalId: plan?.goalId ? String(plan.goalId) : '',
  type: plan?.type || 'STUDY',
  plannedDate: plan?.plannedDate
    ? dayjs(plan.plannedDate).format('YYYY-MM-DDTHH:mm')
    : dayjs().format('YYYY-MM-DDTHH:mm'),
  plannedDurationMinutes: plan?.plannedDurationMinutes ?? 60,
  notes: plan?.notes || '',
});

export const isPlanMissed = (plan) =>
  plan?.status === 'PLANNED' && dayjs(plan.plannedDate).isBefore(dayjs(), 'day');

export const getPlanStatusDisplay = (plan) => {
  if (isPlanMissed(plan)) return { label: 'Missed', color: 'error' };
  return PLAN_STATUS[plan?.status] || { label: plan?.status, color: 'default' };
};

export const planToTimerState = (plan) => ({
  planSessionId: plan.id,
  goalId: plan.goalId ? String(plan.goalId) : '',
  subject: plan.title || '',
  notes: plan.notes || '',
  plannedDurationMinutes: plan.plannedDurationMinutes,
});
