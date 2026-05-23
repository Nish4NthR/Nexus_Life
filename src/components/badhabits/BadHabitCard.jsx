import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard.jsx';
import {
  useBadHabitsStore,
  daysClean,
  nextMilestone,
  lastResetDate,
} from '../../store/useBadHabitsStore.js';
import { todayKey } from '../../utils/dateHelpers.js';

export default function BadHabitCard({ habit, onEdit, onMilestone }) {
  const resistToday = useBadHabitsStore((s) => s.resistToday);
  const logRelapse = useBadHabitsStore((s) => s.logRelapse);

  const [confirmingRelapse, setConfirmingRelapse] = useState(false);
  const [relapseNote, setRelapseNote] = useState('');

  const days = daysClean(habit);
  const next = nextMilestone(days);
  const resetDate = lastResetDate(habit);
  const resistedToday = habit.resistedDates.includes(todayKey());

  const color = habit.color || '#EF4444';
  const progress = next ? Math.min(100, (days / next) * 100) : 100;

  const onResist = async () => {
    const before = days;
    await resistToday(habit.id);
    // Resist click counts the *day* — only check milestone if today's resist
    // pushed us past a threshold (rare since days clean is date-based, not click-based).
    if (before > 0 && [7, 21, 30, 60, 90, 180, 365].includes(before)) {
      onMilestone?.(before);
    }
  };

  const onRelapse = async () => {
    if (!confirmingRelapse) {
      setConfirmingRelapse(true);
      return;
    }
    await logRelapse(habit.id, relapseNote);
    setConfirmingRelapse(false);
    setRelapseNote('');
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-2xl"
        style={{ background: color }}
      />

      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}55`,
            boxShadow: `0 0 16px ${color}33`,
          }}
        >
          <span>{habit.icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-base text-slate-100">
              {habit.name}
            </h3>
            <button
              onClick={() => onEdit?.(habit)}
              className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-400 hover:border-nebula-cyan/50 hover:text-nebula-cyan"
            >
              Edit
            </button>
          </div>
          {habit.why && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {habit.why}
            </p>
          )}
        </div>
      </div>

      {/* Days clean counter */}
      <div className="mt-5 flex items-end justify-between">
        <div>
          <div
            className="font-display text-5xl leading-none"
            style={{
              color,
              textShadow: `0 0 18px ${color}99`,
            }}
          >
            {days}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Days Clean
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {next ? (
            <>
              Next: <span className="text-slate-200">{next}d</span>
            </>
          ) : (
            <span className="text-nebula-green">Veteran</span>
          )}
          <div className="mt-0.5 text-[10px] text-slate-600">
            since {resetDate}
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {next && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${color}, ${color}99)`,
              boxShadow: `0 0 10px ${color}88`,
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onResist}
          disabled={resistedToday}
          className={`flex-1 rounded-xl border px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] transition disabled:opacity-50 ${
            resistedToday
              ? 'border-nebula-green/60 bg-nebula-green/15 text-nebula-green shadow-glow-cyan'
              : 'border-white/10 bg-black/30 text-slate-200 hover:border-nebula-cyan/60 hover:text-nebula-cyan'
          }`}
        >
          {resistedToday ? '✓ Resisted today' : 'I resisted today'}
        </motion.button>

        <button
          onClick={onRelapse}
          className={`rounded-xl border px-4 py-2 text-xs uppercase tracking-widest transition ${
            confirmingRelapse
              ? 'border-nebula-red/70 bg-nebula-red/20 text-nebula-red shadow-glow-red'
              : 'border-white/10 bg-black/30 text-slate-400 hover:border-nebula-red/50 hover:text-nebula-red'
          }`}
        >
          {confirmingRelapse ? 'Confirm reset' : 'Log relapse'}
        </button>
      </div>

      {confirmingRelapse && (
        <div className="mt-3 space-y-2">
          <input
            value={relapseNote}
            onChange={(e) => setRelapseNote(e.target.value)}
            placeholder="What happened? (optional)"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-nebula-red/60"
          />
          <button
            onClick={() => {
              setConfirmingRelapse(false);
              setRelapseNote('');
            }}
            className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      )}
    </GlassCard>
  );
}
