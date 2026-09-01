import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { NotificationProvider } from './context/NotificationContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import SixMonthPlanPage from './pages/SixMonthPlanPage';
import MonthlyPlanPage from './pages/MonthlyPlanPage';
import StudyTimerPage from './pages/StudyTimerPage';
import StudyHistoryPage from './pages/StudyHistoryPage';
import PlanningPage from './pages/PlanningPage';
import ProgressPage from './pages/ProgressPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import SessionDetailsPage from './pages/admin/SessionDetailsPage';
import LoginHistoryPage from './pages/admin/LoginHistoryPage';
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

const AppContent = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/goals" element={<SessionDetailsPage />} />
                <Route path="/login-history" element={<LoginHistoryPage />} />
                <Route path="/approvals" element={<AdminApprovalsPage />} />
                <Route path="/settings" element={<AdminSettingsPage />} />
                <Route path="/permissions" element={<Navigate to="/admin" replace />} />
                <Route path="/session-details" element={<Navigate to="/admin/goals" replace />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* Student routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <NotificationProvider>
              <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/six-month-plan" element={<SixMonthPlanPage />} />
                <Route path="/monthly-plan" element={<MonthlyPlanPage />} />
                <Route path="/planning" element={<PlanningPage />} />
                <Route path="/timer" element={<StudyTimerPage />} />
                <Route path="/study-history" element={<StudyHistoryPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Layout>
            </NotificationProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppContent;
