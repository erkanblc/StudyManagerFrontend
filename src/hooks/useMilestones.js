import { useCallback, useEffect, useState } from 'react';
import {
  fetchMilestones,
  createMilestone as apiCreate,
  updateMilestone as apiUpdate,
  toggleMilestone as apiToggle,
  deleteMilestone as apiDelete,
} from '../api/milestonesApi';
import { formToMilestoneRequest, mapMilestoneFromApi } from '../utils/milestoneHelpers';

export const useMilestones = () => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMilestones();
      const list = (Array.isArray(data) ? data : []).map(mapMilestoneFromApi).filter(Boolean);
      setMilestones(list);
      setError('');
      return list;
    } catch {
      setError('Could not load milestones.');
      setMilestones([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMilestone = useCallback(async (form) => {
    setSaving(true);
    try {
      const created = await apiCreate(formToMilestoneRequest(form));
      const mapped = mapMilestoneFromApi(created);
      setMilestones((prev) => [...prev, mapped]);
      return mapped;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateMilestone = useCallback(async (id, form) => {
    setSaving(true);
    try {
      const updated = await apiUpdate(id, formToMilestoneRequest(form, { isUpdate: true }));
      const mapped = mapMilestoneFromApi(updated);
      setMilestones((prev) => prev.map((m) => (String(m.id) === String(id) ? mapped : m)));
      return mapped;
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleMilestone = useCallback(async (milestone) => {
    setSaving(true);
    try {
      const updated = await apiToggle(milestone.id);
      const mapped = mapMilestoneFromApi(updated);
      setMilestones((prev) => prev.map((m) => (String(m.id) === String(milestone.id) ? mapped : m)));
      return mapped;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteMilestone = useCallback(async (id) => {
    setSaving(true);
    try {
      await apiDelete(id);
      setMilestones((prev) => prev.filter((m) => String(m.id) !== String(id)));
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    milestones,
    loading,
    error,
    saving,
    refresh,
    addMilestone,
    updateMilestone,
    toggleMilestone,
    deleteMilestone,
  };
};
