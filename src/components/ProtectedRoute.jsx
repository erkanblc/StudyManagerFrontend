import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Admins going to student routes get redirected to admin panel
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
};

export default ProtectedRoute;
