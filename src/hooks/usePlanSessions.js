import { useCallback, useEffect, useState } from 'react';
import { fetchPlanSessions } from '../api/planSessionsApi';

export const usePlanSessions = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlanSessions();
      setPlans(Array.isArray(data) ? data : []);
      setError('');
      return Array.isArray(data) ? data : [];
    } catch {
      setError('Could not load plan sessions.');
      setPlans([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plans, loading, error, refresh };
};
