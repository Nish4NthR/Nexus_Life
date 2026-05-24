import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import BadHabitCard from '../components/badhabits/BadHabitCard.jsx';
import BadHabitForm from '../components/badhabits/BadHabitForm.jsx';
import MilestoneCelebration from '../components/badhabits/MilestoneCelebration.jsx';
import { useBadHabitsStore, daysClean } from '../store/useBadHabitsStore.js';

export default function BadHabits() {
  const badHabits = useBadHabitsStore((s) => s.badHabits);
  const loaded = useBadHabitsStore((s) => s.loaded);
  const loading = useBadHabitsStore((s) => s.loading);
  const error = useBadHabitsStore((s) => s.error);
  const load = useBadHabitsStore((s) => s.load);
  const addBadHabit = useBadHabitsStore((s) => s.addBadHabit);
  const updateBadHabit = useBadHabitsStore((s) => s.updateBadHabit);
  const deleteBadHabit = useBadHabitsStore((s) => s.deleteBadHabit);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [celebrationDays, setCelebrationDays] = useState(null);

  useEffect(() => {
    if (!loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const stats = useMemo(() => {
    if (!badHabits.length) return { total: 0, longest: 0, totalDaysClean: 0 };
    const all = badHabits.map(daysClean);
    return {
      total: badHabits.length,
      longest: Math.max(...all),
      totalDaysClean: all.reduce((a, b) => a + b, 0),
    };
  }, [badHabits]);

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
    if (editing) await updateBadHabit(editing.id, form);
    else await addBadHabit(form);
    close();
  };
  const onDelete = async (h) => {
    if (!confirm(`Delete "${h.name}"? Relapse history goes too.`)) return;
    await deleteBadHabit(h.id);
    close();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
            Bad Habits
          </h1>
          <p className="mt-1 text-slate-400">
            Quit the loops. Tap "I resisted today" each day you held the line.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white shadow-glow hover:bg-nebula-violet/30"
        >
          + Start Quit
        </button>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Tracking" value={stats.total} accent="#39ff14" />
        <Stat label="Best Run" value={`${stats.longest}d`} accent="#00cc44" />
        <Stat label="Total Days Clean" value={stats.totalDaysClean} accent="#5eead4" />
      </div>

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

      {loaded && (
        <>
          {badHabits.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {badHabits.map((h) => (
                <BadHabitCard
                  key={h.id}
                  habit={h}
                  onEdit={openEdit}
                  onMilestone={setCelebrationDays}
                />
              ))}
            </div>
          )}
        </>
      )}

      <BadHabitForm
        open={formOpen}
        habit={editing}
        onClose={close}
        onSubmit={submit}
        onDelete={editing ? onDelete : undefined}
      />

      <MilestoneCelebration
        open={celebrationDays !== null}
        days={celebrationDays}
        onClose={() => setCelebrationDays(null)}
      />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <GlassCard hover={false} className="!p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div
        className="mt-1 font-display text-2xl"
        style={{ color: value === 0 || value === '0d' ? '#64748b' : accent }}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function EmptyState({ onCreate }) {
  return (
    <GlassCard hover={false} className="mt-10 text-center">
      <div className="font-display text-sm uppercase tracking-[0.35em] text-slate-400">
        Nothing to quit yet
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
        Name the loop you want to break. Each day you resist, you reinforce the new pattern.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl border border-nebula-cyan/50 bg-nebula-cyan/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-cyan hover:bg-nebula-cyan/25"
      >
        Start your first quit
      </button>
    </GlassCard>
  );
}
