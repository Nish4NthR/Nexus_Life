import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import StarField from '../components/ui/StarField.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

export default function Login() {
  const user = useAuthStore((s) => s.user); const signIn = useAuthStore((s) => s.signIn);
  const authError = useAuthStore((s) => s.error);
  const navigate = useNavigate(); const location = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  async function submit(e) { e.preventDefault(); setBusy(true); const { error } = await signIn(email, password); setBusy(false); if (!error) navigate('/dashboard'); }
  return <AuthShell title="welcome back" subtitle="sign in to your private mission control">
    <form onSubmit={submit} className="space-y-4"><Field label="Email" type="email" value={email} set={setEmail}/><Field label="Password" type="password" value={password} set={setPassword}/>
      {(authError) && <p className="text-sm text-nebula-red">{authError}</p>}<button disabled={busy} className="btn-neon w-full">{busy ? 'signing in…' : '> sign in'}</button></form>
    <div className="mt-6 flex justify-between text-xs text-slate-400"><Link to="/signup" className="hover:text-nebula-violet">create account</Link><Link to="/forgot-password" className="hover:text-nebula-violet">forgot password?</Link></div>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }) { return <div className="relative flex min-h-screen items-center justify-center px-4"><StarField density={120}/><GlassCard hover={false} className="relative w-full max-w-md p-8"><Link to="/" className="font-mono text-sm font-bold text-nebula-violet">&gt; nexus_life</Link><h1 className="mt-8 font-mono text-2xl text-nebula-violet text-glow">{title}</h1><p className="mt-2 text-sm text-slate-400">{subtitle}</p><div className="mt-6">{children}</div></GlassCard></div>; }
function Field({ label, type, value, set }) { return <label className="block"><span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-slate-400">{label}</span><input required type={type} value={value} onChange={(e)=>set(e.target.value)} className="w-full rounded-lg border border-nebula-violet/20 bg-black px-4 py-3 text-slate-100 outline-none focus:border-nebula-violet" /></label>; }
