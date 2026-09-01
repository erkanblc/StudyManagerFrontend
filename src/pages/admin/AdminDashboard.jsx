import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ShieldIcon from '@mui/icons-material/Shield';
import FlagIcon from '@mui/icons-material/Flag';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { fetchAllUsers, fetchAllRoles, fetchAllGoalsAdmin } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { dayjs } from '../../utils/helpers';
import { getRoleLabel, getRoleColor } from '../../utils/roles';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
    <CardContent sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 96 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 96 }}>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight={700} color={color || 'text.primary'}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minHeight: 16 }}>
            {subtitle || '\u00A0'}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light` || '#e2e8f0', color: color || 'text.secondary', width: 52, height: 52, flexShrink: 0 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, r, g] = await Promise.all([
          fetchAllUsers(user.token),
          fetchAllRoles(user.token),
          fetchAllGoalsAdmin(user.token),
        ]);
        setUsers(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
        setGoals(Array.isArray(g) ? g : []);
      } catch (err) {
        setError('Could not load data from the backend. Make sure the server is running.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user.token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeUsers = users.filter((u) => u.active !== false);
  const passiveUsers = users.filter((u) => u.active === false);

  // Role distribution
  const roleDistribution = roles.map((role) => {
    const count = users.filter((u) =>
      u.roles?.some((r) => r.name === role.name || r === role.name)
    ).length;
    return {
      name: getRoleLabel(role.name),
      value: count,
      color: getRoleColor(role.name),
    };
  }).filter((r) => r.value > 0);

  // Users per role for bar chart
  const usersByRole = roles.map((role) => ({
    role: getRoleLabel(role.name),
    count: users.filter((u) =>
      u.roles?.some((r) => r.name === role.name || r === role.name)
    ).length,
  }));

  // Recent users (last 5)
  const recentUsers = [...users]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 6);

  const getRoleForUser = (u) => {
    const roleObj = u.roles?.[0];
    return {
      label: getRoleLabel(roleObj) || 'User',
      color: getRoleColor(roleObj),
    };
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Platform overview — {dayjs().format('MMMM D, YYYY')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        <StatCard
          title="Total Users"
          value={users.length}
          icon={<PeopleIcon />}
          color="primary"
          subtitle={`${activeUsers.length} active`}
        />
        <StatCard
          title="Active Users"
          value={activeUsers.length}
          icon={<CheckCircleIcon />}
          color="success"
          subtitle={`${passiveUsers.length} inactive`}
        />
        <StatCard
          title="Roles Defined"
          value={roles.length}
          icon={<ShieldIcon />}
          color="warning"
          subtitle={`${roles.length} role${roles.length === 1 ? '' : 's'}`}
        />
        <StatCard
          title="User Goals"
          value={goals.length}
          icon={<FlagIcon />}
          color="secondary"
          subtitle={`${goals.length} goal${goals.length === 1 ? '' : 's'}`}
        />
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Active vs Passive */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                User Status
              </Typography>
              {users.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: activeUsers.length },
                          { name: 'Inactive', value: passiveUsers.length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
                      <Typography variant="caption">Active ({activeUsers.length})</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                      <Typography variant="caption">Inactive ({passiveUsers.length})</Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.disabled">No users found</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Users by Role */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Users by Role
              </Typography>
              {usersByRole.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usersByRole} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="role" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.disabled">No role data</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Role breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={1} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Role Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {roles.map((role) => {
                  const count = users.filter((u) =>
                    u.roles?.some((r) => r.name === role.name || r === role.name)
                  ).length;
                  const pct = users.length ? (count / users.length) * 100 : 0;
                  const color = getRoleColor(role.name);
                  const label = getRoleLabel(role.name);
                  return (
                    <Box key={role.id || role.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{label}</Typography>
                        <Typography variant="caption" fontWeight={600} color={color}>
                          {count} user{count !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: color + '20',
                          '& .MuiLinearProgress-bar': { bgcolor: color },
                        }}
                      />
                    </Box>
                  );
                })}
                {roles.length === 0 && (
                  <Typography color="text.disabled" variant="body2">
                    No roles defined
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Users */}
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Recent Users
          </Typography>
          {recentUsers.length === 0 ? (
            <Typography color="text.disabled">No users found</Typography>
          ) : (
            <List disablePadding>
              {recentUsers.map((u, idx) => {
                const role = getRoleForUser(u);
                const isActive = u.active !== false;
                return (
                  <Box key={u.id}>
                    {idx > 0 && <Divider />}
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: role.color + '20', color: role.color }}>
                          {u.fullName?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || <PersonIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {u.fullName || u.username || u.email?.split('@')[0]}
                            </Typography>
                            <Chip
                              label={role.label}
                              size="small"
                              sx={{
                                bgcolor: role.color + '20',
                                color: role.color,
                                fontSize: 10,
                                fontWeight: 600,
                                height: 18,
                              }}
                            />
                          </Box>
                        }
                        secondary={u.email}
                      />
                      <Chip
                        icon={isActive ? <CheckCircleIcon /> : <PersonOffIcon />}
                        label={isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={isActive ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminDashboard;
