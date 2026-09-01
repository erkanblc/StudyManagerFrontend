import { useCallback, useEffect, useState } from 'react';
import { fetchSessions } from '../api/sessionsApi';
import { fetchGoals } from '../api/goalsApi';
import { useAuth } from '../context/AuthContext';
import { filterOwnSessions } from '../utils/studyCalendar';

export const useStudySessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, goalsData] = await Promise.all([
        fetchSessions(),
        fetchGoals(),
      ]);
      const nextSessions = filterOwnSessions(sessionsData, user?.id);
      setSessions(nextSessions);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setError('');
      return nextSessions;
    } catch {
      setError('Could not load study sessions.');
      setSessions([]);
      setGoals([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, goals, loading, error, refresh };
};
