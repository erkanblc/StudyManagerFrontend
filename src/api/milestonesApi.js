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

export const fetchMilestones = () =>
  api.get('/api/milestones', withAuth()).then((r) => r.data);

export const createMilestone = (data) =>
  api.post('/api/milestones', data, withAuth()).then((r) => r.data);

export const updateMilestone = (id, data) =>
  api.put(`/api/milestones/${id}`, data, withAuth()).then((r) => r.data);

export const toggleMilestone = (id) =>
  api.patch(`/api/milestones/${id}/toggle`, {}, withAuth()).then((r) => r.data);

export const deleteMilestone = (id) =>
  api.delete(`/api/milestones/${id}`, withAuth());
