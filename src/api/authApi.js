import { api } from './client';

export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (data) => {
  const response = await api.post('/api/auth/register', data);
  return response.data;
};

export const refreshSession = async (refreshToken) => {
  const response = await api.post('/api/auth/refresh', { refreshToken });
  return response.data;
};

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;
  try {
    await api.post('/api/auth/logout', { refreshToken });
  } catch {
    // logout is best-effort
  }
};

export const getUsers = async (token) => {
  const response = await api.get('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
