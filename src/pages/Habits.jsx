import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import HabitCard from '../components/habits/HabitCard.jsx';
import HabitForm from '../components/habits/HabitForm.jsx';
import { useHabitsStore } from '../store/useHabitsStore.js';
import { progressForXP, HABIT_XP } from '../utils/xpCalculator.js';
import { todayKey } from '../utils/dateHelpers.js';

export default function Habits() {
  const habits = useHabitsStore((s) => s.habits);
  const logs = useHabitsStore((s) => s.logs);
  const loaded = useHabitsStore((s) => s.loaded);
  const loading = useHabitsStore((s) => s.loading);
  const error = useHabitsStore((s) => s.error);
  const load = useHabitsStore((s) => s.load);
  const addHabit = useHabitsStore((s) => s.addHabit);
  const updateHabit = useHabitsStore((s) => s.updateHabit);
  const deleteHabit = useHabitsStore((s) => s.deleteHabit);

  // Derived values computed locally — never call store methods that return
  // new objects/arrays inside a selector (causes useSyncExternalStore tearing).
  const totalXP = useMemo(() => {
    const xpById = new Map(habits.map((h) => [h.id, h.xpPerCompletion || HABIT_XP]));
    return logs.reduce((sum, l) => sum + (xpById.get(l.habitId) || HABIT_XP), 0);
  }, [habits, logs]);

  const todayStats = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    if (active.length === 0) return { done: 0, total: 0, percent: 0 };
    const t = todayKey();
    const completedIds = new Set(
      logs.filter((l) => l.date === t).map((l) => l.habitId)
    );
    const done = active.filter((h) => completedIds.has(h.id)).length;
    return { done, total: active.length, percent: (done / active.length) * 100 };
  }, [habits, logs]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!loaded) load();
    // Intentionally omit `loading` from deps — load() guards against duplicate
    // calls, and including it would re-fire this effect on every load failure,
    // causing an infinite retry loop. Use the Retry button instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const visibleHabits = useMemo(
    () =>
      habits.filter((h) => (showArchived ? h.archived : !h.archived)),
    [habits, showArchived]
  );

  const xp = progressForXP(totalXP);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (h) => {
    setEditing(h);
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const submit = async (form) => {
    if (editing) await updateHabit(editing.id, form);
    else await addHabit(form);
    close();
  };

  const onDelete = async (habit) => {
    if (!confirm(`Delete "${habit.name}" and all its logs?`)) return;
    await deleteHabit(habit.id);
    close();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
            Habits
          </h1>
          <p className="mt-1 text-slate-400">
            Daily missions, streaks, XP. Tap a card to log it.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white shadow-glow hover:bg-nebula-violet/30"
        >
          + New Habit
        </button>
      </div>

      {/* Summary strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard hover={false}>
          <Stat
            label="Today"
            value={`${todayStats.done} / ${todayStats.total}`}
            sub={`${Math.round(todayStats.percent)}% complete`}
          />
        </GlassCard>
        <GlassCard hover={false}>
          <Stat
            label="Level"
            value={xp.level}
            sub={`${xp.xpInLevel} / ${xp.xpToNext} XP`}
          />
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-nebula-violet to-nebula-cyan"
              initial={{ width: 0 }}
              animate={{ width: `${xp.percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </GlassCard>
        <GlassCard hover={false}>
          <Stat
            label="Total XP"
            value={totalXP.toLocaleString()}
            sub={`${habits.filter((h) => !h.archived).length} active habits`}
          />
        </GlassCard>
      </div>

      {/* Loading / error */}
      {loading && !loaded && (
        <div className="mt-12 flex justify-center">
          <OrbitSpinner size={56} />
        </div>
      )}
      {error && (
        <GlassCard hover={false} className="mt-6 border-nebula-red/40">
          <div className="text-sm text-nebula-red">
            <strong>Sync error:</strong> {error}
          </div>
          <button
            onClick={load}
            className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {/* Habit grid */}
      {loaded && (
        <>
          {visibleHabits.length === 0 ? (
            <EmptyState onCreate={openCreate} archived={showArchived} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleHabits.map((h) => (
                <HabitCard key={h.id} habit={h} onEdit={openEdit} />
              ))}
            </div>
          )}

          {habits.some((h) => h.archived) && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-100"
              >
                {showArchived ? 'Show Active' : 'Show Archived'}
              </button>
            </div>
          )}
        </>
      )}

      <HabitForm
        open={formOpen}
        habit={editing}
        onClose={close}
        onSubmit={submit}
        onDelete={editing ? onDelete : undefined}
      />
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-2 font-display text-3xl text-slate-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function EmptyState({ onCreate, archived }) {
  return (
    <GlassCard hover={false} className="mt-10 text-center">
      <div className="font-display text-sm uppercase tracking-[0.35em] text-slate-400">
        {archived ? 'No archived habits' : 'No habits yet'}
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
        {archived
          ? 'Habits you archive will appear here.'
          : 'Set your first mission. Small, daily, repeatable — the streak does the rest.'}
      </p>
      {!archived && (
        <button
          onClick={onCreate}
          className="mt-5 rounded-xl border border-nebula-cyan/50 bg-nebula-cyan/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-cyan hover:bg-nebula-cyan/25"
        >
          Create your first habit
        </button>
      )}
    </GlassCard>
  );
}
