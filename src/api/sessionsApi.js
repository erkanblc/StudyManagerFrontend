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

export const fetchSessions = () =>
  api.get('/api/sessions', withAuth()).then((r) => r.data);

export const fetchLastSession = () =>
  api.get('/api/sessions/last', withAuth()).then((r) => {
    if (r.status === 204 || !r.data?.id) return null;
    return r.data;
  }).catch((err) => {
    if (err.response?.status === 204) return null;
    throw err;
  });

export const fetchActiveSession = () =>
  api.get('/api/sessions/active', withAuth()).then((r) => {
    if (r.status === 204 || !r.data?.id) return null;
    return r.data;
  }).catch((err) => {
    if (err.response?.status === 204) return null;
    throw err;
  });

export const fetchTotalSeconds = () =>
  api.get('/api/sessions/total', withAuth()).then((r) => r.data.totalSeconds);

export const startSession = (data = {}) =>
  api.post('/api/sessions/start', data, withAuth()).then((r) => r.data);

export const heartbeatSession = (id, data) =>
  api.patch(`/api/sessions/${id}/heartbeat`, data, withAuth()).then((r) => r.data);

export const resolveSession = (id, data) =>
  api.post(`/api/sessions/${id}/resolve`, data, withAuth()).then((r) => r.data);

export const stopSession = () =>
  api.post('/api/sessions/stop', {}, withAuth()).then((r) => r.data);

export const createManualSession = (data) =>
  api.post('/api/sessions/manual', data, withAuth()).then((r) => r.data);

export const updateSession = (id, data) =>
  api.put(`/api/sessions/${id}`, data, withAuth()).then((r) => r.data);

export const deleteSession = (id) =>
  api.delete(`/api/sessions/${id}`, withAuth());
