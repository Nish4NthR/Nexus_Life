import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Habits from './pages/Habits.jsx';
import BadHabits from './pages/BadHabits.jsx';
import Expenses from './pages/Expenses.jsx';
import Goals from './pages/Goals.jsx';
import Learning from './pages/Learning.jsx';
import Analytics from './pages/Analytics.jsx';
import Journal from './pages/Journal.jsx';
import Settings from './pages/Settings.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/bad-habits" element={<BadHabits />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
