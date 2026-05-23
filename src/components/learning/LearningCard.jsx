import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard.jsx';
import {
  useLearningStore,
  itemProgress,
  learningTypeMeta,
  lastStudiedFor,
} from '../../store/useLearningStore.js';
import { formatMinutes, shortLabel } from '../../utils/dateHelpers.js';

export default function LearningCard({ item, onEdit, onStudy }) {
  const toggleTopic = useLearningStore((s) => s.toggleTopic);
  const updateItem = useLearningStore((s) => s.updateItem);
  const logs = useLearningStore((s) => s.logs);
  const [expanded, setExpanded] = useState(false);

  const t = learningTypeMeta(item.type);
  const color = item.color || t.color;
  const progress = itemProgress(item);
  const itemLogs = logs.filter((l) => l.itemId === item.id);
  const totalMin = itemLogs.reduce((s, l) => s + l.minutes, 0);
  const lastStudied = lastStudiedFor(logs, item.id);
  const isComplete = item.status === 'completed';

  const visibleTopics = expanded ? item.topics : item.topics.slice(0, 4);

  const markComplete = () =>
    updateItem(item.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

  const reopen = () =>
    updateItem(item.id, { status: 'active', completedAt: null });

  return (
    <GlassCard className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-2xl"
        style={{ background: color }}
      />

      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}55`,
            boxShadow: `0 0 16px ${color}33`,
          }}
        >
          {item.icon}
        </div>

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
              {t.label}
            </span>
            {isComplete && (
              <span className="rounded-full border border-nebula-green/50 bg-nebula-green/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-nebula-green">
                Done
              </span>
            )}
          </div>

          <h3
            className={`mt-2 font-display text-base ${
              isComplete ? 'text-slate-400 line-through' : 'text-slate-100'
            }`}
          >
            {item.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-slate-500">
            {item.platform && <span>{item.platform}</span>}
            {item.author && <span>· {item.author}</span>}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-nebula-cyan hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                ↗ Open
              </a>
            )}
          </div>
        </div>

        <button
          onClick={() => onEdit?.(item)}
          className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-400 hover:border-nebula-cyan/50 hover:text-nebula-cyan"
        >
          Edit
        </button>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.2em] text-slate-400">Progress</span>
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
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
          <span>{formatMinutes(totalMin)} total studied</span>
          {lastStudied && <span>Last: {shortLabel(lastStudied)}</span>}
        </div>
      </div>

      {/* Topics */}
      {item.topics.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
          <ul className="space-y-1.5">
            {visibleTopics.map((tp) => (
              <li key={tp.id}>
                <button
                  type="button"
                  onClick={() => toggleTopic(item.id, tp.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition hover:bg-white/5"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      tp.completed ? 'border-transparent' : 'border-white/20'
                    }`}
                    style={
                      tp.completed
                        ? { background: color, boxShadow: `0 0 10px ${color}88` }
                        : undefined
                    }
                  >
                    {tp.completed && (
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M2 6.5 L5 9 L10 3"
                          stroke="white"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`flex-1 ${
                      tp.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}
                  >
                    {tp.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {item.topics.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-100"
            >
              {expanded ? 'Show less' : `+ ${item.topics.length - 4} more`}
            </button>
          )}
        </div>
      )}

      {/* Study CTA + Mark complete */}
      <div className="mt-4 flex gap-2">
        {!isComplete ? (
          <>
            <button
              onClick={() => onStudy?.(item)}
              className="flex-1 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition"
              style={{
                borderColor: `${color}99`,
                background: `${color}22`,
              }}
            >
              ☄ Start study session
            </button>
            <button
              onClick={markComplete}
              title="Mark this item as completed"
              className="rounded-xl border border-nebula-green/50 bg-nebula-green/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-nebula-green transition hover:bg-nebula-green/25"
            >
              ✓ Done
            </button>
          </>
        ) : (
          <button
            onClick={reopen}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-nebula-cyan/50 hover:text-nebula-cyan"
          >
            ↺ Reopen
          </button>
        )}
      </div>
    </GlassCard>
  );
}
