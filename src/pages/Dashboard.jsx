import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import GlassCard from '../components/ui/GlassCard.jsx';
import MoodPicker from '../components/journal/MoodPicker.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useHabitsStore } from '../store/useHabitsStore.js';
import { useExpensesStore, formatINR } from '../store/useExpensesStore.js';
import { useGoalsStore, goalProgress } from '../store/useGoalsStore.js';
import { useLearningStore, studyStreak } from '../store/useLearningStore.js';
import { useBadHabitsStore, daysClean } from '../store/useBadHabitsStore.js';
import { useJournalStore, MOODS } from '../store/useJournalStore.js';
import { useMotivationalQuote } from '../hooks/useAI.js';
import { todayKey, lastNDays, shortLabel } from '../utils/dateHelpers.js';
import { computeStreak } from '../utils/streakLogic.js';

export default function Dashboard() {
  const username = useAuthStore((s) => s.username) || 'Operator';

  // Load all stores on mount
  const loadHabits = useHabitsStore((s) => s.load);
  const loadExpenses = useExpensesStore((s) => s.load);
  const loadGoals = useGoalsStore((s) => s.load);
  const loadLearning = useLearningStore((s) => s.load);
  const loadBad = useBadHabitsStore((s) => s.load);
  const loadJournal = useJournalStore((s) => s.load);

  const habits = useHabitsStore((s) => s.habits);
  const habitLogs = useHabitsStore((s) => s.logs);
  const toggleLog = useHabitsStore((s) => s.toggleLog);

  const expenses = useExpensesStore((s) => s.expenses);
  const goals = useGoalsStore((s) => s.goals);

  const learningItems = useLearningStore((s) => s.items);
  const learningLogs = useLearningStore((s) => s.logs);

  const badHabits = useBadHabitsStore((s) => s.badHabits);

  const moods = useJournalStore((s) => s.moods);
  const setMood = useJournalStore((s) => s.setMood);

  useEffect(() => {
    loadHabits();
    loadExpenses();
    loadGoals();
    loadLearning();
    loadBad();
    loadJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayKey();
  const todayMood = moods.find((m) => m.date === today)?.mood || null;

  // ---- derived metrics ----
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const completedIds = useMemo(
    () => new Set(habitLogs.filter((l) => l.date === today).map((l) => l.habitId)),
    [habitLogs, today]
  );
  const habitsDone = activeHabits.filter((h) => completedIds.has(h.id)).length;

  const topStreak = useMemo(() => {
    if (activeHabits.length === 0) return 0;
    return Math.max(
      0,
      ...activeHabits.map((h) =>
        computeStreak(habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date))
      )
    );
  }, [activeHabits, habitLogs]);

  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.date.startsWith(ym))
        .reduce((s, e) => s + e.amount, 0),
    [expenses, ym]
  );

  const activeGoals = goals.filter((g) => g.status === 'active');
  const learnStreak = useMemo(() => studyStreak(learningLogs), [learningLogs]);
  const bestQuit = useMemo(() => {
    if (!badHabits.length) return 0;
    return Math.max(0, ...badHabits.map(daysClean));
  }, [badHabits]);

  // Last 7 days expense sparkline
  const sparkline = useMemo(() => {
    const days = lastNDays(7);
    const sums = new Map(days.map((d) => [d, 0]));
    for (const e of expenses) {
      if (sums.has(e.date)) sums.set(e.date, sums.get(e.date) + e.amount);
    }
    return Array.from(sums, ([d, v]) => ({ date: shortLabel(d), value: Math.round(v) }));
  }, [expenses]);

  const quote = useMotivationalQuote(
    {
      activeGoals: activeGoals.slice(0, 3).map((g) => g.title),
      topStreak,
      recentMood: todayMood,
    },
    {}
  );

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Missions today: top 5 active habits not yet done
  const missionsToday = activeHabits
    .filter((h) => !completedIds.has(h.id))
    .slice(0, 5);

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-mono text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
      >
        <span className="text-nebula-violet">{greeting.toLowerCase().replace('good ', '')}</span>
        <span className="text-[color:var(--text-faint)]">, </span>
        <span className="text-nebula-cyan">{username}</span>
      </motion.h1>

      {/* AI quote */}
      <GlassCard hover={false} className="mt-4 border-nebula-violet/30">
        <div className="flex items-start gap-3">
          <span className="font-display text-xl text-nebula-violet">✺</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Mission Briefing
            </div>
            <div className="mt-1 text-sm italic text-slate-200">
              {quote.loading
                ? 'Composing…'
                : quote.data ||
                  quote.error ||
                  'Today is yours. Make one small move forward.'}
            </div>
          </div>
          {quote.available && (
            <button
              onClick={() =>
                quote.run({
                  activeGoals: activeGoals.slice(0, 3).map((g) => g.title),
                  topStreak,
                  recentMood: todayMood,
                })
              }
              disabled={quote.loading}
              className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-400 hover:text-nebula-cyan disabled:opacity-50"
            >
              ↻
            </button>
          )}
        </div>
      </GlassCard>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Module
          title="Habits"
          value={`${habitsDone}/${activeHabits.length}`}
          sub={topStreak ? `🔥 ${topStreak}d streak` : 'no streak'}
          accent="#39ff14"
          to="/habits"
        />
        <Module
          title="Goals"
          value={activeGoals.length}
          sub={`${goals.filter((g) => g.status === 'completed').length} done`}
          accent="#00cc44"
          to="/goals"
        />
        <Module
          title="Expenses"
          value={formatINR(monthExpenses)}
          sub="this month"
          accent="#d29922"
          to="/expenses"
        />
        <Module
          title="Learning"
          value={`${learnStreak}d`}
          sub={`${learningItems.length} tracked`}
          accent="#5eead4"
          to="/learning"
        />
        <Module
          title="Bad Habits"
          value={`${bestQuit}d`}
          sub={`${badHabits.length} tracking`}
          accent="#f85149"
          to="/bad-habits"
        />
        <Module
          title="Journal"
          value={todayMood ? MOODS.find((m) => m.id === todayMood)?.emoji || '—' : '—'}
          sub="today's mood"
          accent="#8bc98b"
          to="/journal"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Missions today */}
        <GlassCard hover={false} className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
              Missions Today
            </h2>
            <Link
              to="/habits"
              className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-200"
            >
              View all →
            </Link>
          </div>
          {activeHabits.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              No habits yet. <Link to="/habits" className="text-nebula-cyan hover:underline">Create one</Link> to get started.
            </div>
          ) : missionsToday.length === 0 ? (
            <div className="mt-4 text-sm text-nebula-green">
              ✓ All today's missions complete. Hold the line, operator.
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {missionsToday.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => toggleLog(h.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-white/15"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{
                        background: `${h.color}22`,
                        border: `1px solid ${h.color}55`,
                      }}
                    >
                      {h.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-slate-200">{h.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {h.category}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-widest text-slate-400">
                      Tap to log
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Mood + sparkline stacked */}
        <div className="space-y-6">
          <GlassCard hover={false}>
            <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
              Mood Check-in
            </h2>
            <div className="mt-3">
              <MoodPicker value={todayMood} onChange={(m) => setMood(m)} />
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
              Spending (7d)
            </h2>
            {sparkline.every((p) => p.value === 0) ? (
              <div className="mt-4 text-sm text-slate-500">
                No expenses in the last 7 days.
              </div>
            ) : (
              <div className="mt-3 h-24">
                <ResponsiveContainer>
                  <LineChart data={sparkline}>
                    <Tooltip
                      contentStyle={{
                        background: '#000',
                        border: '1px solid rgba(57,255,20,0.45)',
                        borderRadius: 8,
                        color: '#e7ffe7',
                        fontSize: 11,
                        boxShadow: '0 0 10px rgba(57,255,20,0.20)',
                      }}
                      formatter={(v) => formatINR(v)}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#39ff14"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#39ff14' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Active goal progress bars */}
      {activeGoals.length > 0 && (
        <GlassCard hover={false} className="mt-6">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Active Goals
          </h2>
          <div className="mt-3 space-y-3">
            {activeGoals.slice(0, 4).map((g) => {
              const p = goalProgress(g);
              return (
                <Link
                  key={g.id}
                  to="/goals"
                  className="block rounded-xl border border-white/5 bg-black/20 p-3 transition hover:border-white/15"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-200">{g.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {p.done}/{p.total || '—'} · {Math.round(p.percent)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.percent}%`,
                        background: g.color || '#39ff14',
                        boxShadow: `0 0 10px ${g.color || '#39ff14'}aa`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function Module({ title, value, sub, accent, to }) {
  return (
    <Link to={to} className="block">
      <GlassCard className="min-h-[124px] !p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {title}
        </div>
        <div
          className="mt-3 font-mono text-2xl font-semibold tabular-nums"
          style={{ color: accent, textShadow: `0 0 10px ${accent}55` }}
        >
          {value}
        </div>
        {sub && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-600">
            {sub}
          </div>
        )}
      </GlassCard>
    </Link>
  );
}
