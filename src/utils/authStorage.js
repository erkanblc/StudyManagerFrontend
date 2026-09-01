const AUTH_KEY = 'lm_auth_user';

export const readAuthUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeAuthUser = (userInfo) => {
  if (!userInfo) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(userInfo));
};

export const getAccessToken = () => readAuthUser()?.token || null;

export const getRefreshToken = () => readAuthUser()?.refreshToken || null;

export const patchAuthTokens = ({ token, refreshToken, expiresIn }) => {
  const current = readAuthUser();
  if (!current) return null;
  const next = {
    ...current,
    token: token ?? current.token,
    refreshToken: refreshToken ?? current.refreshToken,
    expiresIn: expiresIn ?? current.expiresIn,
  };
  writeAuthUser(next);
  notifyAuthUpdated(next);
  return next;
};

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_KEY);
  notifyAuthUpdated(null);
};

let listener = null;
export const registerAuthListener = (fn) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

const notifyAuthUpdated = (user) => {
  try {
    listener?.(user);
  } catch {
    // ignore listener errors
  }
};
