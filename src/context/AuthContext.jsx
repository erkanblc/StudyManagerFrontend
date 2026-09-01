import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginUser, registerUser, logoutUser } from '../api/authApi';
import { isAdminRole } from '../utils/roles';
import { getDaysSinceLogin, shouldShowLoginGapAlert } from '../utils/loginGapHelpers';
import {
  clearAuthStorage,
  getRefreshToken,
  readAuthUser,
  registerAuthListener,
  writeAuthUser,
} from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readAuthUser());
  const [loginGapAlert, setLoginGapAlert] = useState(null);
  const [showRemindersBriefly, setShowRemindersBriefly] = useState(false);

  useEffect(() => registerAuthListener(setUser), []);

  const clearLoginGapAlert = useCallback(() => setLoginGapAlert(null), []);
  const clearRemindersBriefly = useCallback(() => setShowRemindersBriefly(false), []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      const userInfo = {
        id: data.id ?? null,
        email: data.email || email,
        roles: data.roles || [],
        token: data.token || '',
        refreshToken: data.refreshToken || '',
        expiresIn: data.expiresIn ?? null,
        name: data.username || email.split('@')[0],
        lastLoginAt: data.lastLoginAt || null,
      };

      if (shouldShowLoginGapAlert(data.lastLoginAt)) {
        setLoginGapAlert({
          days: getDaysSinceLogin(data.lastLoginAt),
          name: userInfo.name,
        });
      } else {
        setLoginGapAlert(null);
      }

      setUser(userInfo);
      writeAuthUser(userInfo);
      setShowRemindersBriefly(true);
      return { success: true, isAdmin: isAdminRole(userInfo.roles) };
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (apiMessage) {
        return { success: false, message: apiMessage };
      }
      const demoAccounts = [
        { email: 'admin@example.com', password: 'admin', roles: ['ADMIN'] },
        { email: 'student1@example.com', password: 'student1', roles: ['STUDENT'] },
        { email: 'demo@student.de', password: 'demo123', roles: ['STUDENT'] },
      ];
      const match = demoAccounts.find(
        (a) => a.email === email && a.password === password
      );
      if (match) {
        const userInfo = {
          email: match.email,
          roles: match.roles,
          token: 'demo-token',
          refreshToken: '',
          name: email.split('@')[0],
        };
        setUser(userInfo);
        writeAuthUser(userInfo);
        setShowRemindersBriefly(true);
        return { success: true, isAdmin: isAdminRole(match.roles) };
      }
      return { success: false, message: 'Invalid email or password.' };
    }
  };

  const register = async (form) => {
    try {
      const data = await registerUser(form);
      return {
        success: true,
        message: data.message,
        pendingAdminApproval: data.pendingAdminApproval,
      };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    await logoutUser(refreshToken);
    setUser(null);
    setLoginGapAlert(null);
    setShowRemindersBriefly(false);
    clearAuthStorage();
  };

  const isAdmin = isAdminRole(user?.roles);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAdmin,
        loginGapAlert,
        clearLoginGapAlert,
        showRemindersBriefly,
        clearRemindersBriefly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
