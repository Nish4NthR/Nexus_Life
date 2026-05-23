import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import LearningCard from '../components/learning/LearningCard.jsx';
import LearningForm from '../components/learning/LearningForm.jsx';
import StudyTimer from '../components/learning/StudyTimer.jsx';
import {
  useLearningStore,
  itemProgress,
  studyStreak,
  totalMinutes,
  lastStudiedFor,
} from '../store/useLearningStore.js';
import { useStudyNextMission } from '../hooks/useAI.js';
import { formatMinutes, lastNDays } from '../utils/dateHelpers.js';

const FILTERS = [
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all',       label: 'All' },
];

export default function Learning() {
  const items = useLearningStore((s) => s.items);
  const logs = useLearningStore((s) => s.logs);
  const loaded = useLearningStore((s) => s.loaded);
  const loading = useLearningStore((s) => s.loading);
  const error = useLearningStore((s) => s.error);
  const load = useLearningStore((s) => s.load);
  const addItem = useLearningStore((s) => s.addItem);
  const updateItem = useLearningStore((s) => s.updateItem);
  const deleteItem = useLearningStore((s) => s.deleteItem);
  const logSession = useLearningStore((s) => s.logSession);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [studyingItem, setStudyingItem] = useState(null);
  const [filter, setFilter] = useState('active');

  const nextMission = useStudyNextMission();

  useEffect(() => {
    if (!loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const streak = useMemo(() => studyStreak(logs), [logs]);
  const weekMin = useMemo(() => {
    const last7 = new Set(lastNDays(7));
    return totalMinutes(logs, (d) => last7.has(d));
  }, [logs]);
  const monthMin = useMemo(() => {
    const last30 = new Set(lastNDays(30));
    return totalMinutes(logs, (d) => last30.has(d));
  }, [logs]);

  const visible = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const rank = (it) => (it.status === 'active' ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    if (filter === 'active') return sorted.filter((it) => it.status === 'active');
    if (filter === 'completed') return sorted.filter((it) => it.status === 'completed');
    return sorted;
  }, [items, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (it) => {
    setEditing(it);
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const submit = async (form) => {
    if (editing) await updateItem(editing.id, form);
    else await addItem(form);
    close();
  };
  const onDelete = async (it) => {
    if (!confirm(`Delete "${it.title}" and all its sessions?`)) return;
    await deleteItem(it.id);
    close();
  };

  const onSessionStop = async (mins) => {
    if (!studyingItem || mins <= 0) return;
    await logSession(studyingItem.id, mins, 0);
    setStudyingItem(null);
  };

  const runNextMission = () => {
    const active = items.filter((it) => it.status === 'active');
    if (!active.length) return;
    const payload = active.map((it) => {
      const p = itemProgress(it);
      return {
        title: it.title,
        type: it.type,
        progress: Math.round(p.percent),
        lastStudied: lastStudiedFor(logs, it.id),
      };
    });
    nextMission.run({ items: payload });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
            Learning
          </h1>
          <p className="mt-1 text-slate-400">
            Courses, books, coding. Start a timer, log a session, watch the streak grow.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white shadow-glow hover:bg-nebula-violet/30"
        >
          + New Item
        </button>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Streak" value={`${streak}d`} accent="#F59E0B" />
        <Stat label="This Week" value={formatMinutes(weekMin)} accent="#06B6D4" />
        <Stat label="This Month" value={formatMinutes(monthMin)} accent="#7C3AED" />
        <Stat label="Tracking" value={items.length} accent="#10B981" />
      </div>

      {/* AI Next Mission */}
      <GlassCard hover={false} className="mt-6 border-nebula-cyan/30">
        <div className="flex items-start gap-3">
          <span className="font-display text-xl text-nebula-cyan">☄</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Next Mission
              </div>
              {nextMission.available && (
                <button
                  onClick={runNextMission}
                  disabled={nextMission.loading || items.filter((i) => i.status === 'active').length === 0}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 hover:text-nebula-cyan disabled:opacity-50"
                >
                  {nextMission.loading ? '…' : '↻'}
                </button>
              )}
            </div>
            {nextMission.data ? (
              <div className="mt-1">
                <div className="font-display text-base text-slate-100">
                  {nextMission.data.itemTitle}
                </div>
                <div className="mt-1 text-sm text-slate-400">{nextMission.data.reason}</div>
              </div>
            ) : nextMission.error ? (
              <div className="mt-1 text-sm text-nebula-red">{nextMission.error}</div>
            ) : (
              <div className="mt-1 text-sm text-slate-400">
                {nextMission.available
                  ? 'Tap ↻ for an AI pick of what to study next.'
                  : 'AI not configured — add VITE_GEMINI_API_KEY.'}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Filter */}
      <div className="mt-6 flex flex-wrap gap-2">
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
          {visible.length === 0 ? (
            <EmptyState filter={filter} onCreate={openCreate} />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((it) => (
                <LearningCard
                  key={it.id}
                  item={it}
                  onEdit={openEdit}
                  onStudy={setStudyingItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      <LearningForm
        open={formOpen}
        item={editing}
        onClose={close}
        onSubmit={submit}
        onDelete={editing ? onDelete : undefined}
      />

      {studyingItem && (
        <div
          onClick={() => setStudyingItem(null)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Studying
                </div>
                <div className="truncate font-display text-base text-slate-100">
                  {studyingItem.title}
                </div>
              </div>
              <button
                onClick={() => setStudyingItem(null)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-6">
              <StudyTimer onStop={onSessionStop} color={studyingItem.color} />
            </div>
          </div>
        </div>
      )}
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
        style={{ color: value === 0 || value === '0d' || value === '0m' ? '#64748b' : accent }}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function EmptyState({ filter, onCreate }) {
  const msg =
    filter === 'completed'
      ? { title: 'No completed items', body: 'Finished items will appear here.', show: false }
      : { title: 'Nothing tracked yet', body: 'Add your first course, book, or coding project to start logging study time.', show: true };
  return (
    <GlassCard hover={false} className="mt-10 text-center">
      <div className="font-display text-sm uppercase tracking-[0.35em] text-slate-400">
        {msg.title}
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">{msg.body}</p>
      {msg.show && (
        <button
          onClick={onCreate}
          className="mt-5 rounded-xl border border-nebula-cyan/50 bg-nebula-cyan/15 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-nebula-cyan hover:bg-nebula-cyan/25"
        >
          Create your first item
        </button>
      )}
    </GlassCard>
  );
}
