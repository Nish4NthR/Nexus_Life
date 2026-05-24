import { useEffect, useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import StarField from '../components/ui/StarField.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useDriveAuthStore } from '../store/useDriveAuthStore.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);

  const initDrive = useDriveAuthStore((s) => s.init);
  const driveToken = useDriveAuthStore((s) => s.token);
  const driveReady = useDriveAuthStore((s) => s.ready);
  const driveSigningIn = useDriveAuthStore((s) => s.signingIn);
  const driveError = useDriveAuthStore((s) => s.error);
  const isAuthorized = useDriveAuthStore((s) => s.isAuthorized());
  const signInDrive = useDriveAuthStore((s) => s.signIn);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState(isAuthenticated ? 'drive' : 'creds');

  // Boot the OAuth client lazily — only once we reach the drive stage
  useEffect(() => {
    if (stage === 'drive' && !driveReady) {
      initDrive();
    }
  }, [stage, driveReady, initDrive]);

  // When both auth gates pass, redirect to the requested page (or Dashboard)
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, isAuthorized, location.state, navigate]);

  if (isAuthenticated && isAuthorized) {
    const dest = location.state?.from?.pathname || '/';
    return <Navigate to={dest} replace />;
  }

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    await new Promise((r) => setTimeout(r, 250));

    const ok = login(username.trim(), password);
    setSubmitting(false);

    if (ok) {
      setStage('drive');
    } else {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
  };

  const onConnectDrive = async () => {
    try {
      await signInDrive({ silent: !!driveToken });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarField density={180} />

      {/* Single soft neon ambient — subtle, not loud */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-nebula-violet/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="font-mono text-3xl font-bold text-nebula-violet text-glow"
          >
            <span className="text-nebula-cyan">&gt;</span> nexus<span className="text-nebula-cyan">_</span>life
          </motion.h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
            mission control
          </p>
        </div>

        {stage === 'creds' ? (
          <CredsCard
            error={error}
            username={username}
            password={password}
            setUsername={setUsername}
            setPassword={setPassword}
            submitting={submitting}
            onSubmit={onPasswordSubmit}
          />
        ) : (
          <DriveCard
            signingIn={driveSigningIn}
            error={driveError}
            ready={driveReady}
            onConnect={onConnectDrive}
          />
        )}
      </motion.div>
    </div>
  );
}

function CredsCard({
  error,
  username,
  password,
  setUsername,
  setPassword,
  submitting,
  onSubmit,
}) {
  return (
    <GlassCard
      strong
      hover={false}
      className={`p-8 ${error ? 'animate-shake !border-nebula-red/70 shadow-glow-red' : ''}`}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Operator"
          type="text"
          value={username}
          autoComplete="username"
          onChange={setUsername}
          disabled={submitting}
        />
        <Field
          label="Access Code"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
          disabled={submitting}
        />

        {error && (
          <div className="text-center text-sm text-nebula-red">
            Authentication failed. Try again.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="group relative w-full overflow-hidden rounded-lg border border-nebula-violet/50 bg-black px-5 py-3 font-mono text-sm uppercase tracking-[0.25em] text-nebula-violet transition hover:scale-[1.02] hover:border-nebula-violet hover:bg-nebula-violet/10 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {submitting ? 'engaging…' : '> initiate'}
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-[11px] text-[color:var(--text-faint)]">
        credentials validated locally against <code>.env</code>
      </p>
    </GlassCard>
  );
}

function DriveCard({ signingIn, error, ready, onConnect }) {
  return (
    <GlassCard strong hover={false} className="p-8 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
        step 2 of 2
      </div>
      <h2 className="mt-3 font-mono text-2xl text-nebula-violet text-glow">connect drive</h2>
      <p className="mt-3 text-sm text-[color:var(--text-muted)]">
        NexusLife stores your data inside a single <code className="font-mono text-nebula-cyan">NexusLife</code> folder
        in your Google Drive. Nothing else in your Drive is touched.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-nebula-red/40 bg-nebula-red/10 px-3 py-2 font-mono text-xs text-nebula-red">
          {error}
        </div>
      )}

      <button
        onClick={onConnect}
        disabled={!ready || signingIn}
        className="mt-6 inline-flex items-center justify-center gap-3 rounded-lg border border-nebula-violet/50 bg-black px-6 py-3 font-mono text-sm uppercase tracking-[0.25em] text-nebula-violet transition hover:scale-[1.02] hover:border-nebula-violet hover:bg-nebula-violet/10 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {signingIn ? (
          <>
            <OrbitSpinner size={18} />
            <span>connecting…</span>
          </>
        ) : (
          <>
            <GoogleMark />
            <span>sign in with Google</span>
          </>
        )}
      </button>

      <p className="mt-6 text-center font-mono text-[11px] text-[color:var(--text-faint)]">
        scope: <code>drive.file</code> — app-created files only
      </p>
    </GlassCard>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 7.1 29.3 5 24 5 16.3 5 9.7 9 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.3 0 10-1.9 13.6-5.2l-6.3-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.7 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.5 4.4-4.7 5.7l6.3 5.2C40.1 35.8 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function Field({ label, type, value, onChange, disabled, autoComplete }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-nebula-violet/15 bg-black px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-nebula-violet/80 focus:shadow-glow disabled:opacity-50"
      />
    </label>
  );
}
