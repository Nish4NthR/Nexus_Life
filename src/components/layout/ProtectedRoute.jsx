import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';

export default function ProtectedRoute({ children }) {
  const { user, loading, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized || loading) return <div className="flex min-h-screen items-center justify-center font-mono text-nebula-violet">loading nexuslife…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
