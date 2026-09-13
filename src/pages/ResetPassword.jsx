import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthShell } from './Login.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/useAuthStore.js';

export default function ResetPassword() {
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const logout = useAuthStore((s) => s.logout);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) { setError('Password reset is not configured.'); setChecking(false); return undefined; }

    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) setRecoveryReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      // Supabase restores the recovery session from the email link. The event
      // is preferred, but an already-restored session is also valid here.
      setRecoveryReady(Boolean(data.session));
      setChecking(false);
    }).catch(() => { if (active) { setError('This password reset link is invalid or expired.'); setChecking(false); } });

    return () => { active = false; listener?.subscription?.unsubscribe(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!password) return setError('Enter a new password.');
    if (password.length < 6) return setError('Your password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result?.error) return setError(result.error.message || 'Unable to update your password.');
    setSuccess(true);
    await logout();
  }

  if (checking) return <AuthShell title="reset access" subtitle="checking your recovery session"><p className="font-mono text-sm text-slate-400">loading…</p></AuthShell>;

  if (success) return <AuthShell title="password updated" subtitle="your NexusLife account is ready"><p className="text-sm text-nebula-green">Password updated successfully.</p><button onClick={() => navigate('/login')} className="btn-neon mt-6 w-full">go to login</button></AuthShell>;

  if (!recoveryReady) return <AuthShell title="reset link unavailable" subtitle="request a new password reset link"><p className="text-sm text-nebula-red">{error || 'This password reset link is invalid or expired.'}</p><Link to="/forgot-password" className="btn-neon mt-6 block w-full text-center">request new link</Link></AuthShell>;

  return <AuthShell title="set new password" subtitle="choose a new password for your account"><form onSubmit={submit} className="space-y-4"><PasswordField label="New Password" value={password} set={setPassword} visible={showPassword}/><PasswordField label="Confirm New Password" value={confirmPassword} set={setConfirmPassword} visible={showPassword}/>{error && <p className="text-sm text-nebula-red">{error}</p>}<label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> show password</label><button disabled={busy} className="btn-neon w-full">{busy ? 'updating…' : 'update password'}</button></form></AuthShell>;
}

function PasswordField({ label, value, set, visible }) { return <label className="block"><span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-slate-400">{label}</span><input required minLength={6} type={visible ? 'text' : 'password'} value={value} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-nebula-violet/20 bg-black px-4 py-3 text-slate-100 outline-none focus:border-nebula-violet" /></label>; }
