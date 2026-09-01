import { api, authHeaders } from './client';

const getToken = () => {
  try {
    const stored = localStorage.getItem('lm_auth_user');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
};

export const fetchGoals = () =>
  api.get('/api/goals', authHeaders(getToken())).then((r) => r.data);

export const fetchActiveGoals = () =>
  api.get('/api/goals/active', authHeaders(getToken())).then((r) => r.data);

export const createGoal = (data) =>
  api.post('/api/goals', data, authHeaders(getToken())).then((r) => r.data);

export const updateGoal = (id, data) =>
  api.put(`/api/goals/${id}`, data, authHeaders(getToken())).then((r) => r.data);

export const deleteGoal = (id) =>
  api.delete(`/api/goals/${id}`, authHeaders(getToken()));

export const createMilestone = (goalId, data) =>
  api.post(`/api/goals/${goalId}/milestones`, data, authHeaders(getToken())).then((r) => r.data);

export const toggleMilestone = (goalId, milestoneId) =>
  api
    .patch(`/api/goals/${goalId}/milestones/${milestoneId}/toggle`, {}, authHeaders(getToken()))
    .then((r) => r.data);

export const deleteMilestone = (goalId, milestoneId) =>
  api.delete(`/api/goals/${goalId}/milestones/${milestoneId}`, authHeaders(getToken())).then((r) => r.data);
