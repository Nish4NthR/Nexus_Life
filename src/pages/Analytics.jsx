import { useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import {
  useHabitsStore,
  HABIT_CATEGORIES,
} from '../store/useHabitsStore.js';
import {
  useExpensesStore,
  formatINR,
  EXPENSE_CATEGORIES,
} from '../store/useExpensesStore.js';
import { useGoalsStore, goalProgress } from '../store/useGoalsStore.js';
import {
  useLearningStore,
  studyStreak,
  totalMinutes,
  LEARNING_TYPES,
} from '../store/useLearningStore.js';
import { useJournalStore, moodMeta } from '../store/useJournalStore.js';
import { useBadHabitsStore, daysClean } from '../store/useBadHabitsStore.js';
import { useWeeklySummary } from '../hooks/useAI.js';
import {
  lastNDays,
  shortLabel,
  formatMinutes,
  todayKey,
} from '../utils/dateHelpers.js';
import { computeLongestStreak, computeStreak } from '../utils/streakLogic.js';

const tooltipStyle = {
  background: 'rgba(10,10,31,0.92)',
  border: '1px solid rgba(124,58,237,0.4)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
};

export default function Analytics() {
  const habits = useHabitsStore((s) => s.habits);
  const habitLogs = useHabitsStore((s) => s.logs);
  const loadHabits = useHabitsStore((s) => s.load);

  const expenses = useExpensesStore((s) => s.expenses);
  const budgets = useExpensesStore((s) => s.budgets);
  const loadExpenses = useExpensesStore((s) => s.load);

  const goals = useGoalsStore((s) => s.goals);
  const loadGoals = useGoalsStore((s) => s.load);

  const learningItems = useLearningStore((s) => s.items);
  const learningLogs = useLearningStore((s) => s.logs);
  const loadLearning = useLearningStore((s) => s.load);

  const moods = useJournalStore((s) => s.moods);
  const journalEntries = useJournalStore((s) => s.entries);
  const loadJournal = useJournalStore((s) => s.load);

  const badHabits = useBadHabitsStore((s) => s.badHabits);
  const loadBad = useBadHabitsStore((s) => s.load);

  const summary = useWeeklySummary();

  useEffect(() => {
    loadHabits();
    loadExpenses();
    loadGoals();
    loadLearning();
    loadJournal();
    loadBad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  // ===== Headline metrics =====

  const habitConsistency = useMemo(() => {
    if (activeHabits.length === 0) return 0;
    const days = lastNDays(7);
    let hits = 0;
    for (const d of days) {
      const todayLogs = habitLogs.filter((l) => l.date === d).map((l) => l.habitId);
      const done = activeHabits.filter((h) => todayLogs.includes(h.id)).length;
      hits += done / activeHabits.length;
    }
    return Math.round((hits / days.length) * 100);
  }, [activeHabits, habitLogs]);

  const longestHabitStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    return Math.max(
      0,
      ...habits.map((h) => {
        const dates = habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date);
        return computeLongestStreak(dates);
      })
    );
  }, [habits, habitLogs]);

  const weekStudyMin = useMemo(() => {
    const last7 = new Set(lastNDays(7));
    return totalMinutes(learningLogs, (d) => last7.has(d));
  }, [learningLogs]);

  const learnStreak = useMemo(() => studyStreak(learningLogs), [learningLogs]);

  const monthExpenseTotal = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter((e) => e.date.startsWith(ym))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const totalBudget = useMemo(
    () => budgets.reduce((s, b) => s + b.monthlyLimit, 0),
    [budgets]
  );

  // ===== Hero banner numbers =====

  const allDates = useMemo(() => {
    const set = new Set([
      ...habitLogs.map((l) => l.date),
      ...learningLogs.map((l) => l.date),
      ...expenses.map((e) => e.date),
      ...moods.map((m) => m.date),
      ...journalEntries.map((e) => e.date),
    ]);
    return [...set].sort();
  }, [habitLogs, learningLogs, expenses, moods, journalEntries]);

  const daysTracking = useMemo(() => {
    if (!allDates.length) return 0;
    const first = allDates[0];
    const [y, m, d] = first.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    return Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000) + 1);
  }, [allDates]);

  const lifetimeHabitsDone = habitLogs.length;
  const lifetimeStudyMin = useMemo(
    () => learningLogs.reduce((s, l) => s + l.minutes, 0),
    [learningLogs]
  );
  const bestCleanStreak = useMemo(() => {
    if (!badHabits.length) return 0;
    return Math.max(0, ...badHabits.map(daysClean));
  }, [badHabits]);

  // ===== Habit heatmap (90 days) =====

  const heatmapData = useMemo(() => {
    const days = lastNDays(90);
    const total = activeHabits.length || 1;
    return days.map((d) => {
      const completedToday = new Set(
        habitLogs.filter((l) => l.date === d).map((l) => l.habitId)
      );
      const count = activeHabits.filter((h) => completedToday.has(h.id)).length;
      return { date: d, count, total, pct: count / total };
    });
  }, [activeHabits, habitLogs]);

  // ===== Week-over-week deltas =====

  const wow = useMemo(() => {
    const thisWeek = new Set(lastNDays(7));
    const lastWeek = new Set();
    const today = new Date();
    for (let i = 13; i >= 7; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      lastWeek.add(k);
    }

    const habitsRate = (days) => {
      if (!activeHabits.length) return 0;
      let hits = 0;
      let n = 0;
      for (const d of days) {
        const todayLogs = habitLogs.filter((l) => l.date === d).map((l) => l.habitId);
        const done = activeHabits.filter((h) => todayLogs.includes(h.id)).length;
        hits += done / activeHabits.length;
        n++;
      }
      return n ? Math.round((hits / n) * 100) : 0;
    };

    const studyMins = (days) =>
      learningLogs.filter((l) => days.has(l.date)).reduce((s, l) => s + l.minutes, 0);

    const moodAvg = (days) => {
      const vals = moods
        .filter((m) => days.has(m.date))
        .map((m) => moodMeta(m.mood)?.value)
        .filter((v) => typeof v === 'number');
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const spend = (days) =>
      expenses.filter((e) => days.has(e.date)).reduce((s, e) => s + e.amount, 0);

    return {
      habitsThis: habitsRate(thisWeek),
      habitsLast: habitsRate(lastWeek),
      studyThis: studyMins(thisWeek),
      studyLast: studyMins(lastWeek),
      moodThis: moodAvg(thisWeek),
      moodLast: moodAvg(lastWeek),
      spendThis: spend(thisWeek),
      spendLast: spend(lastWeek),
    };
  }, [activeHabits, habitLogs, learningLogs, moods, expenses]);

  // ===== 30-day trend datasets =====

  const moodData = useMemo(() => {
    const days = lastNDays(30);
    const byDate = new Map(moods.map((m) => [m.date, m.mood]));
    return days.map((d) => {
      const mood = byDate.get(d);
      const meta = mood ? moodMeta(mood) : null;
      return { date: shortLabel(d), value: meta?.value ?? null };
    });
  }, [moods]);

  const study30 = useMemo(() => {
    const days = lastNDays(30);
    const byDate = new Map(days.map((d) => [d, 0]));
    for (const l of learningLogs) {
      if (byDate.has(l.date)) byDate.set(l.date, byDate.get(l.date) + l.minutes);
    }
    return Array.from(byDate, ([d, m]) => ({ date: shortLabel(d), value: m }));
  }, [learningLogs]);

  const spend30 = useMemo(() => {
    const days = lastNDays(30);
    const byDate = new Map(days.map((d) => [d, 0]));
    for (const e of expenses) {
      if (byDate.has(e.date)) byDate.set(e.date, byDate.get(e.date) + e.amount);
    }
    return Array.from(byDate, ([d, v]) => ({
      date: shortLabel(d),
      value: Math.round(v),
    }));
  }, [expenses]);

  // ===== Category breakdowns =====

  const expenseByCategory = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sums = new Map();
    for (const e of expenses) {
      if (!e.date.startsWith(ym)) continue;
      sums.set(e.category, (sums.get(e.category) || 0) + e.amount);
    }
    return EXPENSE_CATEGORIES.map((c) => ({
      name: c.label,
      value: Math.round(sums.get(c.id) || 0),
      color: c.color,
    })).filter((d) => d.value > 0);
  }, [expenses]);

  const studyByType = useMemo(() => {
    const itemById = new Map(learningItems.map((it) => [it.id, it]));
    const sums = new Map();
    for (const l of learningLogs) {
      const it = itemById.get(l.itemId);
      const t = it?.type || 'course';
      sums.set(t, (sums.get(t) || 0) + l.minutes);
    }
    return LEARNING_TYPES.map((t) => ({
      name: t.label,
      value: sums.get(t.id) || 0,
      color: t.color,
    })).filter((d) => d.value > 0);
  }, [learningItems, learningLogs]);

  const habitsByCategory = useMemo(() => {
    const sums = new Map();
    for (const l of habitLogs) {
      const h = habits.find((x) => x.id === l.habitId);
      if (!h) continue;
      sums.set(h.category, (sums.get(h.category) || 0) + 1);
    }
    return HABIT_CATEGORIES.map((c) => ({
      name: c.label,
      value: sums.get(c.id) || 0,
      color: c.color,
    })).filter((d) => d.value > 0);
  }, [habits, habitLogs]);

  // ===== Active streaks leaderboard =====

  const activeStreaks = useMemo(() => {
    return activeHabits
      .map((h) => {
        const dates = habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date);
        return {
          habit: h,
          current: computeStreak(dates),
          longest: computeLongestStreak(dates),
        };
      })
      .filter((s) => s.current > 0 || s.longest > 0)
      .sort((a, b) => b.current - a.current || b.longest - a.longest)
      .slice(0, 8);
  }, [activeHabits, habitLogs]);

  // ===== Personal records =====

  const records = useMemo(() => {
    // Best study day
    const byDayStudy = new Map();
    for (const l of learningLogs) {
      byDayStudy.set(l.date, (byDayStudy.get(l.date) || 0) + l.minutes);
    }
    let bestStudy = { date: null, minutes: 0 };
    for (const [date, mins] of byDayStudy) {
      if (mins > bestStudy.minutes) bestStudy = { date, minutes: mins };
    }

    // Most habits completed in a single day
    const byDayHabits = new Map();
    for (const l of habitLogs) {
      byDayHabits.set(l.date, (byDayHabits.get(l.date) || 0) + 1);
    }
    let mostHabits = { date: null, count: 0 };
    for (const [date, count] of byDayHabits) {
      if (count > mostHabits.count) mostHabits = { date, count };
    }

    // Biggest single-day spend
    const byDaySpend = new Map();
    for (const e of expenses) {
      byDaySpend.set(e.date, (byDaySpend.get(e.date) || 0) + e.amount);
    }
    let topSpend = { date: null, amount: 0 };
    for (const [date, amt] of byDaySpend) {
      if (amt > topSpend.amount) topSpend = { date, amount: amt };
    }

    return { bestStudy, mostHabits, topSpend };
  }, [learningLogs, habitLogs, expenses]);

  // ===== Goals =====

  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const avgGoalProgress = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active');
    if (active.length === 0) return 0;
    return Math.round(
      active.reduce((s, g) => s + goalProgress(g).percent, 0) / active.length
    );
  }, [goals]);

  // ===== AI payload =====

  const buildSummaryPayload = () => ({
    week: lastNDays(7)[0] + ' to ' + lastNDays(7)[6],
    habits: {
      activeCount: activeHabits.length,
      consistencyPercent: habitConsistency,
      longestStreak: longestHabitStreak,
    },
    expenses: {
      monthTotal: Math.round(monthExpenseTotal),
      monthBudget: totalBudget,
    },
    goals: {
      active: activeGoals,
      completed: completedGoals,
      avgProgressPercent: avgGoalProgress,
    },
    learning: {
      streakDays: learnStreak,
      weekMinutes: weekStudyMin,
      activeItems: learningItems.filter((i) => i.status === 'active').length,
    },
    badHabits: badHabits.map((b) => ({ name: b.name, daysClean: daysClean(b) })),
    moodEntriesThisWeek: moods.filter((m) => lastNDays(7).includes(m.date)).length,
    journalEntriesThisWeek: journalEntries.filter((e) => lastNDays(7).includes(e.date))
      .length,
  });

  return (
    <div>
      <div>
        <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
          Analytics
        </h1>
        <p className="mt-1 text-slate-400">
          The whole-life view. Streaks, trends, and a personalized mission report.
        </p>
      </div>

      {/* ===== Hero banner ===== */}
      <GlassCard
        hover={false}
        className="relative mt-6 overflow-hidden border-nebula-violet/40"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.3em] text-nebula-violet">
            Mission Status
          </div>
          <div className="mt-1 font-display text-2xl text-slate-100 sm:text-3xl">
            Day {daysTracking} of operations
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {daysTracking >= 30
              ? 'You\'ve been showing up. The data agrees.'
              : daysTracking >= 7
                ? 'A week in. Momentum is starting to compound.'
                : 'Early days — every entry sharpens the picture.'}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <HeroStat
              label="Habits completed"
              value={lifetimeHabitsDone}
              accent="#7C3AED"
            />
            <HeroStat
              label="Study time"
              value={formatMinutes(lifetimeStudyMin)}
              accent="#06B6D4"
            />
            <HeroStat
              label="Best streak ever"
              value={`${longestHabitStreak}d`}
              accent="#F59E0B"
            />
            <HeroStat
              label="Longest clean"
              value={`${bestCleanStreak}d`}
              accent="#10B981"
            />
          </div>
        </div>
      </GlassCard>

      {/* ===== This week vs last week ===== */}
      <h2 className="mt-8 font-display text-sm uppercase tracking-[0.3em] text-slate-400">
        This week vs last
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <WowCard
          label="Habit consistency"
          unit="%"
          now={wow.habitsThis}
          prev={wow.habitsLast}
          accent="#7C3AED"
        />
        <WowCard
          label="Study minutes"
          unit="m"
          now={wow.studyThis}
          prev={wow.studyLast}
          accent="#06B6D4"
        />
        <WowCard
          label="Avg mood"
          unit="/5"
          now={wow.moodThis ? Number(wow.moodThis.toFixed(2)) : null}
          prev={wow.moodLast ? Number(wow.moodLast.toFixed(2)) : null}
          accent="#10B981"
          higherIsBetter
          smallNumber
        />
        <WowCard
          label="Spending"
          unit="₹"
          now={Math.round(wow.spendThis)}
          prev={Math.round(wow.spendLast)}
          accent="#F59E0B"
          higherIsBetter={false}
        />
      </div>

      {/* ===== Top-line metrics ===== */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Habit Consistency"
          value={`${habitConsistency}%`}
          accent="#7C3AED"
          sub="last 7 days"
        />
        <Metric
          label="Best Habit Streak"
          value={`${longestHabitStreak}d`}
          accent="#F59E0B"
          sub="all-time"
        />
        <Metric
          label="Study This Week"
          value={formatMinutes(weekStudyMin)}
          accent="#06B6D4"
          sub={`${learnStreak}d streak`}
        />
        <Metric
          label="Goals Active / Done"
          value={`${activeGoals} / ${completedGoals}`}
          accent="#10B981"
          sub={`${avgGoalProgress}% avg`}
        />
      </div>

      {/* ===== Habit heatmap (90 days) ===== */}
      <GlassCard hover={false} className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Habit grid · 90 days
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
            <span>Less</span>
            <span className="h-3 w-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.30)' }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.65)' }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.95)' }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: '#7C3AED', boxShadow: '0 0 6px #7C3AEDaa' }} />
            <span>More</span>
          </div>
        </div>
        {activeHabits.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">
            Add a few habits on the Habits page — this grid will fill in as you log.
          </div>
        ) : (
          <Heatmap days={heatmapData} />
        )}
      </GlassCard>

      {/* ===== Trends ===== */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
              Mood · 30 days
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              5 amazing → 1 terrible
            </span>
          </div>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <LineChart data={moodData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#06B6D4' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Study · 30 days
          </h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <AreaChart data={study30}>
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v} min`} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#studyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="lg:col-span-2">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Spending · 30 days
          </h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <AreaChart data={spend30}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatINR(v)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#spendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* ===== Category breakdowns ===== */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DonutCard
          title="Expense by category"
          subtitle="this month"
          data={expenseByCategory}
          formatter={(v) => formatINR(v)}
          emptyMsg="No expenses this month yet."
        />
        <DonutCard
          title="Study by type"
          subtitle="all time"
          data={studyByType}
          formatter={(v) => formatMinutes(v)}
          emptyMsg="Log a study session to fill this in."
        />
        <DonutCard
          title="Habits by category"
          subtitle="total completions"
          data={habitsByCategory}
          formatter={(v) => `${v} done`}
          emptyMsg="Complete a habit to fill this in."
        />
      </div>

      {/* ===== Streak leaderboard + Records ===== */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Active streaks
          </h2>
          {activeStreaks.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              No active streaks yet. Log a habit today to start one.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeStreaks.map((s) => {
                const max = activeStreaks[0].current || 1;
                const pct = Math.max(6, (s.current / max) * 100);
                return (
                  <li
                    key={s.habit.id}
                    className="rounded-xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                        style={{
                          background: `${s.habit.color}22`,
                          border: `1px solid ${s.habit.color}55`,
                        }}
                      >
                        {s.habit.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-slate-200">
                            {s.habit.name}
                          </span>
                          <span className="shrink-0 font-display text-sm text-slate-100">
                            🔥 {s.current}d
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: s.habit.color,
                              boxShadow: `0 0 8px ${s.habit.color}88`,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                          Personal best: {s.longest}d
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Personal records
          </h2>
          <div className="mt-3 space-y-3">
            <RecordRow
              icon="🏆"
              label="Longest habit streak"
              value={longestHabitStreak ? `${longestHabitStreak} days` : '—'}
              accent="#F59E0B"
            />
            <RecordRow
              icon="📚"
              label="Best study day"
              value={
                records.bestStudy.minutes
                  ? `${formatMinutes(records.bestStudy.minutes)} · ${shortLabel(
                      records.bestStudy.date
                    )}`
                  : '—'
              }
              accent="#06B6D4"
            />
            <RecordRow
              icon="✓"
              label="Most habits in a day"
              value={
                records.mostHabits.count
                  ? `${records.mostHabits.count} habits · ${shortLabel(
                      records.mostHabits.date
                    )}`
                  : '—'
              }
              accent="#7C3AED"
            />
            <RecordRow
              icon="🛡"
              label="Longest clean stretch"
              value={bestCleanStreak ? `${bestCleanStreak} days` : '—'}
              accent="#10B981"
            />
            <RecordRow
              icon="💸"
              label="Biggest single-day spend"
              value={
                records.topSpend.amount
                  ? `${formatINR(records.topSpend.amount)} · ${shortLabel(
                      records.topSpend.date
                    )}`
                  : '—'
              }
              accent="#EF4444"
            />
          </div>
        </GlassCard>
      </div>

      {/* ===== Bad habits progress ===== */}
      {badHabits.length > 0 && (
        <GlassCard hover={false} className="mt-8">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Quit progress
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badHabits.map((b) => {
              const days = daysClean(b);
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-white/5 bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-200">{b.name}</span>
                    <span className="shrink-0 font-display text-base text-nebula-green">
                      {days}d
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                    clean
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ===== Budget snapshot ===== */}
      <GlassCard hover={false} className="mt-8">
        <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
          Expense vs Budget · this month
        </h2>
        <div className="mt-3 text-sm text-slate-300">
          {totalBudget > 0 ? (
            <>
              <span className="font-display text-2xl text-slate-100">
                {formatINR(monthExpenseTotal)}
              </span>
              <span className="ml-2 text-slate-500">
                / {formatINR(totalBudget)}
              </span>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (monthExpenseTotal / totalBudget) * 100)}%`,
                    background:
                      monthExpenseTotal > totalBudget ? '#EF4444' : '#10B981',
                    boxShadow:
                      monthExpenseTotal > totalBudget
                        ? '0 0 12px #EF4444aa'
                        : undefined,
                  }}
                />
              </div>
            </>
          ) : (
            <span className="text-slate-500">
              Set per-category budgets on the Expenses page to see budget tracking here.
            </span>
          )}
        </div>
      </GlassCard>

      {/* ===== AI weekly summary ===== */}
      <GlassCard hover={false} className="mt-8 border-nebula-cyan/30">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            ✺ Weekly Mission Report
          </h2>
          {summary.available && (
            <button
              onClick={() => summary.run(buildSummaryPayload())}
              disabled={summary.loading}
              className="rounded-lg border border-nebula-cyan/50 bg-nebula-cyan/15 px-3 py-1 text-[10px] uppercase tracking-widest text-nebula-cyan hover:bg-nebula-cyan/25 disabled:opacity-50"
            >
              {summary.loading ? 'Composing…' : 'Generate'}
            </button>
          )}
        </div>
        <div className="mt-4">
          {summary.loading && (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <OrbitSpinner size={22} />
              Reading the data…
            </div>
          )}
          {summary.data && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {summary.data}
            </div>
          )}
          {!summary.data && !summary.loading && (
            <div className="text-sm text-slate-500">
              {summary.available
                ? 'Tap "Generate" for a personalized recap of habits, expenses, goals, learning, and mood across the last 7 days.'
                : 'AI not configured — add VITE_GEMINI_API_KEY to .env.'}
            </div>
          )}
          {summary.error && (
            <div className="mt-3 text-xs text-nebula-red">{summary.error}</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ===== Sub-components =====

function HeroStat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl sm:text-3xl" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent }) {
  return (
    <GlassCard hover={false} className="!p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl" style={{ color: accent }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
          {sub}
        </div>
      )}
    </GlassCard>
  );
}

function WowCard({
  label,
  unit,
  now,
  prev,
  accent,
  higherIsBetter = true,
  smallNumber = false,
}) {
  const hasNow = now !== null && now !== undefined;
  const hasPrev = prev !== null && prev !== undefined;
  const delta = hasNow && hasPrev ? now - prev : null;
  const better = delta !== null && (higherIsBetter ? delta > 0 : delta < 0);
  const worse = delta !== null && (higherIsBetter ? delta < 0 : delta > 0);
  const deltaStr =
    delta === null
      ? '—'
      : delta === 0
        ? '·'
        : `${delta > 0 ? '+' : ''}${
            unit === '₹' ? formatINR(Math.abs(delta)) : Math.abs(delta).toFixed(smallNumber ? 2 : 0)
          }${unit === '₹' || unit === 'm' || unit === '%' || unit === '/5' ? '' : unit}`;

  const display = !hasNow
    ? '—'
    : unit === '₹'
      ? formatINR(now)
      : unit === 'm'
        ? `${now}${unit}`
        : `${now}${unit}`;

  return (
    <GlassCard hover={false} className="!p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-display text-xl" style={{ color: accent }}>
        {display}
      </div>
      <div
        className={`mt-1 text-[11px] uppercase tracking-widest ${
          better
            ? 'text-nebula-green'
            : worse
              ? 'text-nebula-red'
              : 'text-slate-500'
        }`}
      >
        {delta === null
          ? 'no prior data'
          : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '·'} ${
              delta === 0 ? 'no change' : deltaStr + ' vs last week'
            }`}
      </div>
    </GlassCard>
  );
}

function DonutCard({ title, subtitle, data, formatter, emptyMsg }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <GlassCard hover={false}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
          {title}
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {subtitle}
        </span>
      </div>
      {data.length === 0 ? (
        <div className="mt-4 text-sm text-slate-500">{emptyMsg}</div>
      ) : (
        <>
          <div className="mt-3 h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="rgba(0,0,0,0.4)"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatter(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1">
            {data
              .slice()
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="text-slate-400">
                    {formatter(d.value)}{' '}
                    <span className="text-slate-600">
                      · {Math.round((d.value / total) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </GlassCard>
  );
}

function RecordRow({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
        style={{
          background: `${accent}22`,
          border: `1px solid ${accent}55`,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 font-display text-base text-slate-100">{value}</div>
      </div>
    </div>
  );
}

/**
 * GitHub-style heatmap. 13 columns × 7 rows = 91 cells, oldest at left.
 * Rows are days-of-week (Sun→Sat). Each cell's color encodes that day's
 * habit-completion ratio.
 */
function Heatmap({ days }) {
  const today = todayKey();
  const firstDate = days[0]?.date;
  let firstDay = new Date();
  if (firstDate) {
    const [y, m, d] = firstDate.split('-').map(Number);
    firstDay = new Date(y, m - 1, d);
  }
  const startWeekday = firstDay.getDay(); // 0=Sun

  // Build cells: leading pad (so first column aligns by weekday) + all 90 days
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (const d of days) cells.push(d);
  // Pad trailing nulls so total is a clean multiple of 7
  const numCols = Math.ceil(cells.length / 7);
  while (cells.length < numCols * 7) cells.push(null);

  // Transpose into [col][row]
  const cols = [];
  for (let c = 0; c < numCols; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      col.push(cells[c * 7 + r] || null);
    }
    cols.push(col);
  }

  const colorFor = (pct) => {
    if (pct == null) return 'transparent';
    if (pct === 0) return 'rgba(255,255,255,0.06)';
    if (pct < 0.25) return 'rgba(124,58,237,0.30)';
    if (pct < 0.5) return 'rgba(124,58,237,0.50)';
    if (pct < 0.75) return 'rgba(124,58,237,0.75)';
    if (pct < 1) return 'rgba(124,58,237,0.95)';
    return '#7C3AED';
  };

  const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex gap-3">
        {/* DoW column labels */}
        <div className="flex flex-col gap-1 pt-1">
          {dowLabels.map((d, i) => (
            <div
              key={d}
              className="h-3.5 text-[9px] uppercase tracking-widest text-slate-500"
              style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-1">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((cell, ri) => {
                if (!cell) {
                  return (
                    <div
                      key={ri}
                      className="h-3.5 w-3.5 rounded-sm"
                      style={{ background: 'transparent' }}
                    />
                  );
                }
                const isToday = cell.date === today;
                return (
                  <div
                    key={ri}
                    title={`${cell.date} — ${cell.count}/${cell.total} habits (${Math.round(
                      cell.pct * 100
                    )}%)`}
                    className={`h-3.5 w-3.5 rounded-sm transition ${
                      isToday ? 'ring-1 ring-nebula-cyan/80' : ''
                    }`}
                    style={{
                      background: colorFor(cell.pct),
                      boxShadow:
                        cell.pct >= 1 ? '0 0 6px rgba(124,58,237,0.8)' : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
