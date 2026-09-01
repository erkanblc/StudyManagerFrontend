import { createContext, useContext, useState, useCallback } from 'react';
import { generateId, dayjs } from '../utils/helpers';

const DataContext = createContext(null);

const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const DataProvider = ({ children }) => {
  const [goals, setGoals] = useState(() => loadFromStorage('lm_goals', []));
  const [planSessions, setPlanSessions] = useState(() => loadFromStorage('lm_plan_sessions', []));
  const [studySessions, setStudySessions] = useState(() => loadFromStorage('lm_study_sessions', []));

  // ─── GOALS ───────────────────────────────────────────────────────────────
  const addGoal = useCallback((goalData) => {
    const newGoal = {
      id: generateId(),
      status: 'pending',
      createdAt: dayjs().toISOString(),
      completedAt: null,
      ...goalData,
    };
    setGoals((prev) => {
      const updated = [...prev, newGoal];
      saveToStorage('lm_goals', updated);
      return updated;
    });
    return newGoal;
  }, []);

  const updateGoal = useCallback((id, updates) => {
    setGoals((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...updates } : g));
      saveToStorage('lm_goals', updated);
      return updated;
    });
  }, []);

  const deleteGoal = useCallback((id) => {
    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      saveToStorage('lm_goals', updated);
      return updated;
    });
  }, []);

  const completeGoal = useCallback((id) => {
    updateGoal(id, { status: 'completed', completedAt: dayjs().toISOString() });
  }, [updateGoal]);

  // ─── PLAN SESSIONS ────────────────────────────────────────────────────────
  const addPlanSession = useCallback((sessionData) => {
    const newSession = {
      id: generateId(),
      status: 'planned',
      createdAt: dayjs().toISOString(),
      ...sessionData,
    };
    setPlanSessions((prev) => {
      const updated = [...prev, newSession];
      saveToStorage('lm_plan_sessions', updated);
      return updated;
    });
    return newSession;
  }, []);

  const updatePlanSession = useCallback((id, updates) => {
    setPlanSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveToStorage('lm_plan_sessions', updated);
      return updated;
    });
  }, []);

  const deletePlanSession = useCallback((id) => {
    setPlanSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage('lm_plan_sessions', updated);
      return updated;
    });
  }, []);

  // ─── STUDY SESSIONS ───────────────────────────────────────────────────────
  const addStudySession = useCallback((sessionData) => {
    const newSession = {
      id: generateId(),
      date: dayjs().toISOString(),
      ...sessionData,
    };
    setStudySessions((prev) => {
      const updated = [...prev, newSession];
      saveToStorage('lm_study_sessions', updated);
      return updated;
    });
    return newSession;
  }, []);

  const deleteStudySession = useCallback((id) => {
    setStudySessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage('lm_study_sessions', updated);
      return updated;
    });
  }, []);

  // ─── COMPUTED ─────────────────────────────────────────────────────────────
  const getTotalStudySeconds = useCallback(() =>
    studySessions.reduce((acc, s) => acc + (s.duration || 0), 0),
  [studySessions]);

  const getStudySecondsForGoal = useCallback(
    (goalId) =>
      studySessions
        .filter((s) => s.goalId === goalId)
        .reduce((acc, s) => acc + (s.duration || 0), 0),
    [studySessions]
  );

  return (
    <DataContext.Provider
      value={{
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        completeGoal,
        planSessions,
        addPlanSession,
        updatePlanSession,
        deletePlanSession,
        studySessions,
        addStudySession,
        deleteStudySession,
        getTotalStudySeconds,
        getStudySecondsForGoal,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
