import { api, authHeaders } from './client';

// ─── USERS ────────────────────────────────────────────────────────────────────
export const fetchAllUsers = (token) =>
  api.get('/api/admin/users', authHeaders(token)).then((r) => r.data);

export const createUser = (token, userData) =>
  api.post('/api/admin/users', userData, authHeaders(token)).then((r) => r.data);

export const fetchUserById = (token, userId) =>
  api.get(`/api/admin/users/${userId}`, authHeaders(token)).then((r) => r.data);

export const updateUserStatus = (token, userId, active) =>
  api
    .put(`/api/admin/users/${userId}/status?active=${active}`, {}, authHeaders(token))
    .then((r) => r.data);

export const updateUserRoles = (token, userId, roleNames) =>
  api
    .put(`/api/admin/users/${userId}/roles`, { roleNames }, authHeaders(token))
    .then((r) => r.data);

export const deleteUser = (token, userId) =>
  api.delete(`/api/admin/users/${userId}`, authHeaders(token)).then((r) => r.data);

// ─── ROLES ────────────────────────────────────────────────────────────────────
export const fetchAllRoles = (token) =>
  api.get('/api/admin/roles', authHeaders(token)).then((r) => r.data);

export const createRole = (token, name) =>
  api.post('/api/admin/roles', { name }, authHeaders(token)).then((r) => r.data);

export const deleteRole = (token, roleId) =>
  api.delete(`/api/admin/roles/${roleId}`, authHeaders(token)).then((r) => r.data);

// ─── GOALS (admin view) ───────────────────────────────────────────────────────
export const fetchAllGoalsAdmin = (token, userId) => {
  const params = userId ? `?userId=${userId}` : '';
  return api.get(`/api/admin/goals${params}`, authHeaders(token)).then((r) => r.data);
};

export const fetchGoalsByUserAdmin = (token, userId) =>
  api.get(`/api/admin/goals/user/${userId}`, authHeaders(token)).then((r) => r.data);

// ─── LOGIN HISTORY ────────────────────────────────────────────────────────────
export const fetchLoginHistoryByUser = (token, userId) =>
  api.get(`/api/admin/login-history/user/${userId}`, authHeaders(token)).then((r) => r.data);

export const fetchLoginHistoryById = (token, id) =>
  api.get(`/api/admin/login-history/${id}`, authHeaders(token)).then((r) => r.data);

export const updateLoginHistory = (token, id, loginAt) =>
  api
    .put(`/api/admin/login-history/${id}`, { loginAt }, authHeaders(token))
    .then((r) => r.data);

export const deleteLoginHistory = (token, id) =>
  api.delete(`/api/admin/login-history/${id}`, authHeaders(token));

export const deleteAllLoginHistory = (token, userId) =>
  api.delete(`/api/admin/login-history/user/${userId}`, authHeaders(token));

// ─── ADMIN APPROVALS ──────────────────────────────────────────────────────────
export const fetchPendingAdminCount = (token) =>
  api.get('/api/admin/approvals/pending/count', authHeaders(token)).then((r) => r.data.count);

export const fetchPendingAdmins = (token) =>
  api.get('/api/admin/approvals/pending', authHeaders(token)).then((r) => r.data);

export const approveAdminRegistration = (token, userId) =>
  api.post(`/api/admin/approvals/${userId}/approve`, {}, authHeaders(token)).then((r) => r.data);

export const rejectAdminRegistration = (token, userId) =>
  api.post(`/api/admin/approvals/${userId}/reject`, {}, authHeaders(token)).then((r) => r.data);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export const fetchAllSettings = (token) =>
  api.get('/api/admin/settings', authHeaders(token)).then((r) => r.data);

export const fetchSettingByKey = (token, key) =>
  api.get(`/api/admin/settings/${key}`, authHeaders(token)).then((r) => r.data);

export const updateSetting = (token, key, value) =>
  api
    .put(`/api/admin/settings/${key}`, { value: String(value) }, authHeaders(token))
    .then((r) => r.data);
