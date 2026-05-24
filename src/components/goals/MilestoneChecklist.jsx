import { motion } from 'framer-motion';

export default function MilestoneChecklist({
  milestones = [],
  onToggle,
  compact = false,
  color = '#58a6ff',
}) {
  if (!milestones.length) {
    return (
      <div className="text-xs italic text-slate-500">No milestones yet.</div>
    );
  }

  return (
    <ul className={`space-y-${compact ? '1.5' : '2'}`}>
      {milestones.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onToggle?.(m.id)}
            disabled={!onToggle}
            className={`group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition ${
              onToggle ? 'hover:bg-white/5' : 'cursor-default'
            } ${m.completed ? 'text-slate-400' : 'text-slate-200'}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                m.completed ? 'border-transparent' : 'border-white/20 group-hover:border-white/40'
              }`}
              style={
                m.completed
                  ? {
                      background: color,
                      boxShadow: `0 0 12px ${color}88`,
                    }
                  : undefined
              }
            >
              {m.completed && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, ease: 'backOut' }}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6.5 L5 9 L10 3"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </span>
            <span className={`flex-1 ${m.completed ? 'line-through' : ''}`}>
              {m.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
