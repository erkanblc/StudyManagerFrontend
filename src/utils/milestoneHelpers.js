import { dayjs } from './helpers';

export const STANDALONE_GOAL_FILTER = 'standalone';
/** Non-empty Select value so MUI shows the "All goals" label. */
export const ALL_GOALS_FILTER = 'all';

/** Max linked milestones allowed per learning goal. */
export const MAX_MILESTONES_PER_GOAL = 5;

export const countMilestonesForGoal = (milestones, goalId, { excludeId } = {}) => {
  if (!goalId) return 0;
  return (milestones || []).filter((m) => {
    if (String(m.goalId) !== String(goalId)) return false;
    if (excludeId != null && String(m.id) === String(excludeId)) return false;
    return true;
  }).length;
};

/** True if linking another milestone to this goal would exceed the limit. */
export const wouldExceedGoalMilestoneLimit = (milestones, goalId, { excludeId } = {}) => {
  if (!goalId) return false;
  return countMilestonesForGoal(milestones, goalId, { excludeId }) >= MAX_MILESTONES_PER_GOAL;
};

export const isGoalMilestoneLimitReached = (goal) => {
  const total = goal?.milestoneCount ?? goal?.milestones?.length ?? 0;
  return total >= MAX_MILESTONES_PER_GOAL;
};

export const MILESTONE_TYPES = [
  { value: 'module_completion', label: 'Module Completion' },
  { value: 'exam', label: 'Exam / Test' },
  { value: 'report', label: 'Submit Report' },
  { value: 'assignment', label: 'Assignment Due' },
  { value: 'other', label: 'Other' },
];

export const isStandaloneMilestone = (milestone) =>
  milestone?.goalId == null || milestone?.goalId === '';

/** Match sessions, plans, or milestones against the goal filter dropdown. */
export const matchesGoalFilter = (item, filter) => {
  if (!filter || filter === ALL_GOALS_FILTER) return true;
  if (filter === STANDALONE_GOAL_FILTER) {
    return item?.goalId == null || item?.goalId === '';
  }
  return String(item.goalId) === String(filter);
};

export const milestoneMatchesGoalFilter = (milestone, filter) =>
  matchesGoalFilter(milestone, filter);

export const getMilestoneGoalLabel = (milestone, goals = []) => {
  if (isStandaloneMilestone(milestone)) return 'Standalone';
  const goal = goals.find((g) => String(g.id) === String(milestone.goalId));
  return goal?.title || 'Linked goal';
};

export const getMilestoneTypeLabel = (type) =>
  MILESTONE_TYPES.find((t) => t.value === type)?.label || type;

/** Normalize API milestone for Monthly Plan UI (status string, dueDate YYYY-MM-DD). */
export const mapMilestoneFromApi = (m) => {
  if (!m) return null;
  return {
    id: m.id,
    userId: m.userId ?? null,
    goalId: m.goalId != null ? String(m.goalId) : '',
    title: m.title || '',
    description: m.description || '',
    dueDate: m.dueDate ? dayjs(m.dueDate).format('YYYY-MM-DD') : '',
    type: m.type || 'other',
    completed: Boolean(m.completed),
    status: m.completed ? 'completed' : 'pending',
    completedAt: m.completedAt || null,
    createdAt: m.createdAt || null,
  };
};

/** Build create/update payload for /api/milestones */
export const formToMilestoneRequest = (form, { isUpdate = false } = {}) => {
  const goalId = form.goalId ? Number(form.goalId) : null;
  const payload = {
    title: form.title?.trim() || '',
    description: form.description?.trim() || null,
    dueDate: form.dueDate || null,
    type: form.type || 'other',
  };
  if (goalId) {
    payload.goalId = goalId;
    if (isUpdate) payload.clearGoal = false;
  } else if (isUpdate) {
    payload.clearGoal = true;
  }
  return payload;
};
