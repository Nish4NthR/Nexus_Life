import { useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useDriveAuthStore } from '../store/useDriveAuthStore.js';
import { useHabitsStore } from '../store/useHabitsStore.js';
import { useExpensesStore } from '../store/useExpensesStore.js';
import { useGoalsStore } from '../store/useGoalsStore.js';
import { useLearningStore } from '../store/useLearningStore.js';
import { useJournalStore } from '../store/useJournalStore.js';
import { useBadHabitsStore } from '../store/useBadHabitsStore.js';
import { isAIAvailable } from '../ai/claude.js';

const UPI_WORKER_URL = import.meta.env.VITE_UPI_API_URL;

export default function Settings() {
  const username = useAuthStore((s) => s.username) || 'Operator';
  const logout = useAuthStore((s) => s.logout);
  const driveSignOut = useDriveAuthStore((s) => s.signOut);

  const habitsLoad = useHabitsStore((s) => s.load);
  const expensesLoad = useExpensesStore((s) => s.load);
  const goalsLoad = useGoalsStore((s) => s.load);
  const learningLoad = useLearningStore((s) => s.load);
  const journalLoad = useJournalStore((s) => s.load);
  const badLoad = useBadHabitsStore((s) => s.load);

  const habits = useHabitsStore((s) => s.habits);
  const habitLogs = useHabitsStore((s) => s.logs);
  const expenses = useExpensesStore((s) => s.expenses);
  const budgets = useExpensesStore((s) => s.budgets);
  const goals = useGoalsStore((s) => s.goals);
  const learning = useLearningStore((s) => s.items);
  const learningLogs = useLearningStore((s) => s.logs);
  const journal = useJournalStore((s) => s.entries);
  const moods = useJournalStore((s) => s.moods);
  const bad = useBadHabitsStore((s) => s.badHabits);

  const [syncing, setSyncing] = useState(false);

  const fullLogout = () => {
    driveSignOut();
    logout();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        habitsLoad(),
        expensesLoad(),
        goalsLoad(),
        learningLoad(),
        journalLoad(),
        badLoad(),
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const exportAll = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: username,
      habits,
      habitLogs,
      expenses,
      budgets,
      goals,
      learning,
      learningLogs,
      journal,
      moods,
      badHabits: bad,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexuslife-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRecords =
    habits.length +
    habitLogs.length +
    expenses.length +
    goals.length +
    learning.length +
    learningLogs.length +
    journal.length +
    moods.length +
    bad.length;

  const upiConfigured = Boolean(UPI_WORKER_URL && !UPI_WORKER_URL.includes('YOUR'));

  return (
    <div>
      <div>
        <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
          Settings
        </h1>
        <p className="mt-1 text-slate-400">
          Profile, integrations, sync, exports, and the off switch.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Profile
          </h2>
          <div className="mt-4 space-y-3">
            <Row label="Operator" value={username} />
            <Row
              label="Storage"
              value="Google Drive — NexusLife folder"
              hint="All JSON files live in your Drive, scope: drive.file"
            />
            <Row
              label="AI"
              value={isAIAvailable() ? 'Connected (Gemini 2.5 Flash-Lite)' : 'Not configured'}
              hint={!isAIAvailable() ? 'Set VITE_GEMINI_API_KEY in .env to enable AI features.' : 'Daily quote/reflection cached locally to preserve quota.'}
            />
            <Row
              label="Theme"
              value="Deep Emerald · Dark Slate"
              hint="Edit tailwind.config.js to change palette."
            />
          </div>
        </GlassCard>

        {/* Data overview — motivational snapshot */}
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Your data
          </h2>
          <div className="mt-3 font-display text-3xl text-nebula-violet">
            {totalRecords.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            entries logged across all modules
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <Mini label="Habits" value={habits.length} sub={`${habitLogs.length} logs`} />
            <Mini label="Expenses" value={expenses.length} sub={`${budgets.length} budgets`} />
            <Mini label="Goals" value={goals.length} sub="all-time" />
            <Mini label="Learning" value={learning.length} sub={`${learningLogs.length} sessions`} />
            <Mini label="Journal" value={journal.length} sub={`${moods.length} moods`} />
            <Mini label="Bad habits" value={bad.length} sub="tracking" />
          </div>
        </GlassCard>

        {/* Daily Reminders — Telegram */}
        <GlassCard hover={false} className="lg:col-span-2 border-nebula-cyan/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📡</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
                Daily Reminders · Telegram
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                A Cloudflare Worker pings you on Telegram every morning and evening with
                a check-in. Tap the inline buttons to log right from the notification —
                no need to open the app for quick updates.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-400">
                <li>
                  Open Telegram, message <code className="text-nebula-cyan">@BotFather</code>,
                  send <code>/newbot</code>, pick a name. Save the bot token.
                </li>
                <li>
                  Start a chat with your new bot, send any message. Then visit{' '}
                  <code className="text-nebula-cyan">
                    https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                  </code>{' '}
                  in a browser to find your <code>chat.id</code>.
                </li>
                <li>
                  In <code className="text-nebula-cyan">workers/telegram-reminder/</code>{' '}
                  set both as Worker secrets:{' '}
                  <code>npx wrangler secret put TELEGRAM_BOT_TOKEN</code> and{' '}
                  <code>npx wrangler secret put TELEGRAM_CHAT_ID</code>, then{' '}
                  <code>npx wrangler deploy</code>.
                </li>
                <li>
                  Cron triggers fire automatically (default 8 AM + 9 PM IST). To test
                  immediately, hit the worker's <code>/test</code> endpoint.
                </li>
              </ol>
            </div>
          </div>
        </GlassCard>

        {/* UPI Auto-Import status */}
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            UPI Auto-Import
          </h2>
          {upiConfigured ? (
            <>
              <p className="mt-3 text-sm text-slate-300">
                Live. SMS arriving on your phone are forwarded by Automate to the
                Cloudflare Worker, parsed by Gemini, and shown on the Expenses page.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-nebula-green/40 bg-nebula-green/15 px-3 py-1 text-[10px] uppercase tracking-widest text-nebula-green">
                ● Connected
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-400">
                Set <code>VITE_UPI_API_URL</code> and <code>VITE_UPI_API_SECRET</code>{' '}
                in <code>.env</code> after deploying{' '}
                <code>workers/upi-receiver/</code>.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-500">
                ⏳ Not configured
              </div>
            </>
          )}
        </GlassCard>

        {/* Sync */}
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Sync
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Force a full re-read from your Drive. Useful if you edited a file directly
            or opened the app on another device.
          </p>
          <button
            onClick={sync}
            disabled={syncing}
            className="mt-4 rounded-xl border border-nebula-cyan/50 bg-nebula-cyan/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-cyan hover:bg-nebula-cyan/25 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from Drive'}
          </button>
        </GlassCard>

        {/* Export */}
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Export
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Download every NexusLife data file as a single JSON archive.
          </p>
          <button
            onClick={exportAll}
            className="mt-4 rounded-xl border border-white/10 bg-black/30 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-slate-200 hover:border-nebula-violet/50 hover:text-white"
          >
            Download archive
          </button>
        </GlassCard>

        {/* Logout */}
        <GlassCard hover={false} className="lg:col-span-2 border-nebula-red/30">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Disengage
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Sign out and revoke this session's Drive token. Your data stays in your Drive.
          </p>
          <button
            onClick={fullLogout}
            className="mt-4 rounded-xl border border-nebula-red/50 bg-nebula-red/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-red hover:bg-nebula-red/25"
          >
            Sign out & revoke Drive
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value, hint }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</span>
        <span className="text-sm text-slate-200">{value}</span>
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function Mini({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 font-display text-lg text-slate-100">{value}</div>
      {sub && <div className="text-[10px] uppercase tracking-widest text-slate-600">{sub}</div>}
    </div>
  );
}
