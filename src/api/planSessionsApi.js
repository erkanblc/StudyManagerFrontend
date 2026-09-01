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

export const fetchPlanSessions = () =>
  api.get('/api/plan-sessions', withAuth()).then((r) => r.data);

export const fetchTodayPlanSessions = () =>
  api.get('/api/plan-sessions/today', withAuth()).then((r) => r.data);

export const fetchPlanSessionById = (id) =>
  api.get(`/api/plan-sessions/${id}`, withAuth()).then((r) => r.data);

export const createPlanSession = (data) =>
  api.post('/api/plan-sessions', data, withAuth()).then((r) => r.data);

export const updatePlanSession = (id, data) =>
  api.put(`/api/plan-sessions/${id}`, data, withAuth()).then((r) => r.data);

export const completePlanSession = (id) =>
  api.patch(`/api/plan-sessions/${id}/complete`, {}, withAuth()).then((r) => r.data);

export const deletePlanSession = (id) =>
  api.delete(`/api/plan-sessions/${id}`, withAuth());
