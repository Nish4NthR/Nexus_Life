import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useDriveAuthStore } from '../../store/useDriveAuthStore.js';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthorized = useDriveAuthStore((s) => s.isAuthorized());
  const location = useLocation();

  if (!isAuthenticated || !isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
