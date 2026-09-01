import axios from 'axios';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  patchAuthTokens,
} from '../utils/authStorage';

// Use relative URLs so Vite dev proxy forwards /api → localhost:8080 (avoids CORS)
export const api = axios.create({
  baseURL: '',
});

export const authHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
    if (!data?.token) return false;
    patchAuthTokens({
      token: data.token,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
    return true;
  } catch {
    return false;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const ok = await refreshPromise;
    if (!ok) {
      clearAuthStorage();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.assign('/login');
      }
      return Promise.reject(error);
    }

    const token = getAccessToken();
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  }
);
