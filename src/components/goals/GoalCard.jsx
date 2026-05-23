import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard.jsx';
import MilestoneChecklist from './MilestoneChecklist.jsx';
import {
  useGoalsStore,
  goalProgress,
  daysUntil,
  isOverdue,
} from '../../store/useGoalsStore.js';

export default function GoalCard({ goal, onEdit }) {
  const toggleMilestone = useGoalsStore((s) => s.toggleMilestone);
  const [expanded, setExpanded] = useState(false);

  const progress = goalProgress(goal);
  const days = daysUntil(goal.targetDate);
  const overdue = isOverdue(goal);
  const isComplete = goal.status === 'completed';
  const color = goal.color || '#7C3AED';

  const visibleMilestones = expanded
    ? goal.milestones
    : goal.milestones.slice(0, 3);

  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-25 blur-2xl"
        style={{ background: color }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
              style={{
                background: `${color}22`,
                color,
                border: `1px solid ${color}55`,
              }}
            >
              {goal.category}
            </span>
            {isComplete && (
              <span className="rounded-full border border-nebula-green/50 bg-nebula-green/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-nebula-green">
                Done
              </span>
            )}
            {overdue && (
              <span className="rounded-full border border-nebula-red/50 bg-nebula-red/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-nebula-red">
                Overdue
              </span>
            )}
            {goal.status === 'abandoned' && (
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-500">
                Abandoned
              </span>
            )}
          </div>

          <h3
            className={`mt-2 font-display text-lg ${
              isComplete ? 'text-slate-400 line-through' : 'text-slate-100'
            }`}
          >
            {goal.title}
          </h3>

          {goal.description && (
            <p className="mt-1 text-sm text-slate-400">{goal.description}</p>
          )}
        </div>

        <button
          onClick={() => onEdit?.(goal)}
          className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs uppercase tracking-widest text-slate-400 transition hover:border-nebula-cyan/50 hover:text-nebula-cyan"
        >
          Edit
        </button>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.2em] text-slate-400">
            Progress
          </span>
          <span className="font-display text-slate-200">
            {progress.done}/{progress.total || '—'} ·{' '}
            <span style={{ color }}>{Math.round(progress.percent)}%</span>
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${color}, ${color}aa)`,
              boxShadow: `0 0 12px ${color}88`,
            }}
          />
        </div>

        {goal.targetDate && (
          <div className="mt-2 text-[11px] text-slate-500">
            {isComplete ? (
              <>Completed{goal.completedAt ? ` ${formatDate(goal.completedAt)}` : ''}.</>
            ) : days === null ? null : days === 0 ? (
              <span className="text-nebula-amber">Due today</span>
            ) : days > 0 ? (
              <>
                <span className="text-slate-300">{days}d</span> until{' '}
                {goal.targetDate}
              </>
            ) : (
              <span className="text-nebula-red">
                {Math.abs(days)}d overdue · was due {goal.targetDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/5 bg-black/20 p-3">
          <MilestoneChecklist
            milestones={visibleMilestones}
            onToggle={
              isComplete || goal.status === 'abandoned'
                ? undefined
                : (mid) => toggleMilestone(goal.id, mid)
            }
            color={color}
            compact
          />
          {goal.milestones.length > 3 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-100"
            >
              {expanded
                ? 'Show less'
                : `+ ${goal.milestones.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
