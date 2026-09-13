import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Landing from './pages/Landing.jsx';
import AuthForm from './pages/AuthForm.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
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
  return <BrowserRouter><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<AuthForm mode="signup" />} />
    <Route path="/forgot-password" element={<AuthForm mode="forgot" />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/habits" element={<Habits />} /><Route path="/bad-habits" element={<BadHabits />} />
      <Route path="/expenses" element={<Expenses />} /><Route path="/goals" element={<Goals />} />
      <Route path="/learning" element={<Learning />} /><Route path="/analytics" element={<Analytics />} />
      <Route path="/journal" element={<Journal />} /><Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
