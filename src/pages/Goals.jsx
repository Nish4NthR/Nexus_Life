import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import GoalCard from '../components/goals/GoalCard.jsx';
import GoalForm from '../components/goals/GoalForm.jsx';
import { useGoalsStore, isOverdue } from '../store/useGoalsStore.js';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'all', label: 'All' },
];

export default function Goals() {
  const goals = useGoalsStore((s) => s.goals);
  const loaded = useGoalsStore((s) => s.loaded);
  const loading = useGoalsStore((s) => s.loading);
  const error = useGoalsStore((s) => s.error);
  const load = useGoalsStore((s) => s.load);
  const addGoal = useGoalsStore((s) => s.addGoal);
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const deleteGoal = useGoalsStore((s) => s.deleteGoal);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    if (!loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const counts = useMemo(() => {
    let active = 0, completed = 0, overdue = 0;
    for (const g of goals) {
      if (g.status === 'completed') completed++;
      else if (g.status === 'active') {
        active++;
        if (isOverdue(g)) overdue++;
      }
    }
    return { active, completed, overdue, total: goals.length };
  }, [goals]);

  const visible = useMemo(() => {
    const sorted = [...goals].sort((a, b) => {
      // Active first, then completed, then abandoned
      const rank = (g) =>
        g.status === 'active' ? 0 : g.status === 'completed' ? 1 : 2;
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      // Within group, soonest target date first (null last)
      const ad = a.targetDate || '9999-12-31';
      const bd = b.targetDate || '9999-12-31';
      return ad.localeCompare(bd);
    });

    if (filter === 'active') return sorted.filter((g) => g.status === 'active');
    if (filter === 'completed') return sorted.filter((g) => g.status === 'completed');
    if (filter === 'overdue') return sorted.filter(isOverdue);
    return sorted;
  }, [goals, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (g) => {
    setEditing(g);
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const submit = async (form) => {
    if (editing) await updateGoal(editing.id, form);
    else await addGoal(form);
    close();
  };

  const onDelete = async (goal) => {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    await deleteGoal(goal.id);
    close();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
            Goals
          </h1>
          <p className="mt-1 text-slate-400">
            Mission objectives. Break them into milestones and check them off.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white shadow-glow hover:bg-nebula-violet/30"
        >
          + New Goal
        </button>
      </div>

      {/* Summary strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active" value={counts.active} accent="#39ff14" />
        <Stat label="Completed" value={counts.completed} accent="#00cc44" />
        <Stat label="Overdue" value={counts.overdue} accent="#f85149" />
        <Stat label="Total" value={counts.total} accent="#5eead4" />
      </div>

      {/* Filter pills */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
              filter === f.id
                ? 'border-nebula-violet/60 bg-nebula-violet/20 text-white shadow-glow'
                : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
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

      {/* Grid */}
      {loaded && (
        <>
          {visible.length === 0 ? (
            <EmptyState filter={filter} onCreate={openCreate} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((g) => (
                <GoalCard key={g.id} goal={g} onEdit={openEdit} />
              ))}
            </div>
          )}
        </>
      )}

      <GoalForm
        open={formOpen}
        goal={editing}
        onClose={close}
        onSubmit={submit}
        onDelete={editing ? onDelete : undefined}
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
        style={{ color: value === 0 ? '#64748b' : accent }}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function EmptyState({ filter, onCreate }) {
  const msgs = {
    active: {
      title: 'No active goals',
      body: 'Set a target. Break it into milestones. Cross them off as you go.',
      cta: 'Create your first goal',
      showCTA: true,
    },
    completed: {
      title: 'No completed goals yet',
      body: 'Goals you finish will show up here.',
      showCTA: false,
    },
    overdue: {
      title: 'Nothing overdue',
      body: 'Either you\'re on track, or you don\'t have any goals with target dates.',
      showCTA: false,
    },
    all: {
      title: 'No goals yet',
      body: 'Set your first one.',
      cta: 'Create a goal',
      showCTA: true,
    },
  };
  const m = msgs[filter] || msgs.all;
  return (
    <GlassCard hover={false} className="mt-10 text-center">
      <div className="font-display text-sm uppercase tracking-[0.35em] text-slate-400">
        {m.title}
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">{m.body}</p>
      {m.showCTA && (
        <button
          onClick={onCreate}
          className="mt-5 rounded-xl border border-nebula-cyan/50 bg-nebula-cyan/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-cyan hover:bg-nebula-cyan/25"
        >
          {m.cta}
        </button>
      )}
    </GlassCard>
  );
}
