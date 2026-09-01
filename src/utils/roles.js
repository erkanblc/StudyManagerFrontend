export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  MODERATOR: 'Moderator',
  // legacy demo names
  ROLE_ADMIN: 'Administrator',
  ROLE_OGRENCI: 'Student',
  ROLE_EGITMEN: 'Instructor',
  ROLE_MODERATOR: 'Moderator',
};

export const ROLE_COLORS = {
  ADMIN: '#ef4444',
  STUDENT: '#6366f1',
  INSTRUCTOR: '#10b981',
  MODERATOR: '#f59e0b',
  ROLE_ADMIN: '#ef4444',
  ROLE_OGRENCI: '#6366f1',
  ROLE_EGITMEN: '#10b981',
  ROLE_MODERATOR: '#f59e0b',
};

export const getRoleName = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  return role.name || '';
};

export const getRoleLabel = (role) => {
  const name = getRoleName(role);
  return ROLE_LABELS[name] || name.replace(/^ROLE_/, '');
};

export const getRoleColor = (role) => ROLE_COLORS[getRoleName(role)] || '#94a3b8';

export const isAdminRole = (roles = []) =>
  roles.some((r) => {
    const name = getRoleName(r);
    return name === 'ADMIN' || name === 'ROLE_ADMIN';
  });

export const isInstructorRoleName = (name) => {
  const n = getRoleName(name);
  return n === 'INSTRUCTOR' || n === 'ROLE_EGITMEN' || n === 'EGITMEN';
};

/** Roles shown when creating/editing users (Instructor is not assignable). */
export const filterAssignableRoles = (roles = []) =>
  roles.filter((r) => !isInstructorRoleName(r));

export const normalizeRoleName = (name) => {
  if (!name) return '';
  const upper = name.toUpperCase().replace(/^ROLE_/, '');
  const map = {
    OGRENCI: 'STUDENT',
    EGITMEN: 'INSTRUCTOR',
    ADMIN: 'ADMIN',
    STUDENT: 'STUDENT',
    INSTRUCTOR: 'INSTRUCTOR',
    MODERATOR: 'MODERATOR',
  };
  return map[upper] || upper;
};
