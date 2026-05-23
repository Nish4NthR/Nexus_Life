import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard.jsx';
import StreakBadge from '../ui/StreakBadge.jsx';
import ParticleBurst from '../ui/ParticleBurst.jsx';
import { useHabitsStore } from '../../store/useHabitsStore.js';

export default function HabitCard({ habit, onEdit }) {
  const toggleLog = useHabitsStore((s) => s.toggleLog);
  const isDone = useHabitsStore((s) => s.isCompletedToday(habit.id));
  const streak = useHabitsStore((s) => s.getStreak(habit.id));

  const [burst, setBurst] = useState(null);
  const btnRef = useRef(null);

  const onToggle = async (e) => {
    const justCompleted = await toggleLog(habit.id);
    if (justCompleted && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  };

  return (
    <>
      <GlassCard className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-2xl"
          style={{ background: habit.color }}
        />

        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: `${habit.color}22`,
              border: `1px solid ${habit.color}55`,
              boxShadow: `0 0 16px ${habit.color}33`,
            }}
          >
            <span>{habit.icon || '✦'}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-display text-base text-slate-100">
                {habit.name}
              </h3>
              <StreakBadge streak={streak} color={habit.color} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="uppercase tracking-widest">{habit.category}</span>
              {habit.time && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{habit.time}</span>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <motion.button
                ref={btnRef}
                whileTap={{ scale: 0.94 }}
                onClick={onToggle}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium uppercase tracking-[0.2em] transition ${
                  isDone
                    ? 'border-nebula-green/60 bg-nebula-green/15 text-nebula-green shadow-glow-cyan'
                    : 'border-white/10 bg-black/30 text-slate-200 hover:border-nebula-violet/60 hover:text-white'
                }`}
              >
                {isDone ? '✓ Logged' : 'Mark Done'}
              </motion.button>

              <button
                onClick={() => onEdit?.(habit)}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs uppercase tracking-widest text-slate-400 transition hover:border-nebula-cyan/50 hover:text-nebula-cyan"
                aria-label="Edit habit"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {burst && (
        <ParticleBurst
          x={burst.x}
          y={burst.y}
          color={habit.color}
          onComplete={() => setBurst(null)}
        />
      )}
    </>
  );
}
