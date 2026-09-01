import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGoals } from '../api/goalsApi';
import { fetchSessions } from '../api/sessionsApi';
import { usePlanSessions } from '../hooks/usePlanSessions';
import { useAuth } from './AuthContext';
import { filterOwnSessions } from '../utils/studyCalendar';
import {
  buildAllNotifications,
  filterOpenNotifications,
  getPlanPushCandidates,
  getDaysSinceStudy,
  getTodayStudyMinutes,
  loadDismissedIds,
  markSentKey,
  pruneStaleDismissals,
  saveDismissedIds,
  touchLastVisit,
  getLastVisit,
  wasSentKey,
} from '../utils/notificationHelpers';

const NotificationContext = createContext(null);

const CHECK_INTERVAL_MS = 60 * 1000;
const IDLE_MS = 45 * 60 * 1000;

export const NotificationProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans } = usePlanSessions();
  const [goals, setGoals] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => pruneStaleDismissals(loadDismissedIds()));
  const [lastVisitAt] = useState(() => {
    const previous = getLastVisit();
    touchLastVisit();
    return previous;
  });
  const [permission, setPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const idleNotifiedRef = useRef(false);

  const refreshData = useCallback(async () => {
    try {
      const [goalsData, sessionsData] = await Promise.all([
        fetchGoals(),
        fetchSessions(),
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setStudySessions(filterOwnSessions(sessionsData, user?.id));
    } catch {
      // Keep last known data on transient errors
    }
  }, [user?.id]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const allNotifications = useMemo(
    () => buildAllNotifications(plans, goals, studySessions, lastVisitAt),
    [plans, goals, studySessions, lastVisitAt]
  );

  const notifications = useMemo(
    () => filterOpenNotifications(allNotifications, dismissedIds),
    [allNotifications, dismissedIds]
  );

  const unreadCount = notifications.length;
  const daysSinceStudy = useMemo(() => getDaysSinceStudy(studySessions), [studySessions]);
  const todayStudyMinutes = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions]);
  const upcomingPlans = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.status === 'PLANNED' &&
          new Date(p.plannedDate) > new Date() &&
          new Date(p.plannedDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length,
    [plans]
  );

  const sendBrowserNotification = useCallback((item) => {
    if (permission !== 'granted' || !item.pushKey || wasSentKey(item.pushKey)) return;
    try {
      new Notification(item.title, {
        body: item.message,
        icon: '/study-manager-logo.png',
        tag: item.pushKey,
      });
      markSentKey(item.pushKey);
    } catch {
      // Browser blocked or unsupported
    }
  }, [permission]);

  const dismiss = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      allNotifications.forEach((n) => next.add(n.id));
      saveDismissedIds(next);
      return next;
    });
  }, [allNotifications]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const handleAction = useCallback(
    (item) => {
      if (item?.actionPath) navigate(item.actionPath);
      if (item?.id) dismiss(item.id);
      setPanelOpen(false);
    },
    [navigate, dismiss]
  );

  useEffect(() => {
    if (permission !== 'granted') return;

    notifications.forEach((item) => {
      if (item.pushKey && (item.severity === 'error' || item.severity === 'warning')) {
        sendBrowserNotification(item);
      }
    });

    getPlanPushCandidates(plans).forEach((item) => {
      if (!wasSentKey(item.pushKey)) {
        try {
          new Notification(item.title, { body: item.message, icon: '/study-manager-logo.png', tag: item.pushKey });
          markSentKey(item.pushKey);
        } catch {
          // ignore
        }
      }
    });
  }, [notifications, permission, sendBrowserNotification, plans]);

  useEffect(() => {
    const urgent = notifications.find((n) => n.severity === 'error');
    if (!urgent || document.hidden) return;
    setToast(urgent);
  }, [notifications]);

  useEffect(() => {
    const runCheck = () => {
      refreshData();
    };
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      idleNotifiedRef.current = false;
    };

    const onIdle = () => {
      if (idleNotifiedRef.current) return;
      const hour = new Date().getHours();
      if (hour < 8 || hour > 22) return;

      const upcoming = plans.some(
        (p) =>
          p.status === 'PLANNED' &&
          new Date(p.plannedDate).getTime() - Date.now() <= 90 * 60 * 1000 &&
          new Date(p.plannedDate).getTime() > Date.now()
      );

      if (!upcoming) return;

      idleNotifiedRef.current = true;
      const item = {
        title: 'Still there?',
        message: 'You have an upcoming study session. Take a short break, then get back on track.',
        pushKey: `idle-${new Date().toISOString().slice(0, 13)}`,
      };
      if (permission === 'granted' && !wasSentKey(item.pushKey)) {
        try {
          new Notification(item.title, { body: item.message, icon: '/study-manager-logo.png', tag: item.pushKey });
          markSentKey(item.pushKey);
        } catch {
          // ignore
        }
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));

    const idleInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_MS) onIdle();
    }, 60 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      clearInterval(idleInterval);
    };
  }, [plans, permission]);

  const value = {
    notifications,
    allNotifications,
    unreadCount,
    daysSinceStudy,
    todayStudyMinutes,
    upcomingPlans,
    permission,
    panelOpen,
    setPanelOpen,
    toast,
    setToast,
    dismiss,
    dismissAll,
    requestPermission,
    handleAction,
    refreshData,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationCenter = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within NotificationProvider');
  }
  return ctx;
};
