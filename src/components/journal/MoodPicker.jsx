import { motion } from 'framer-motion';
import { MOODS } from '../../store/useJournalStore.js';

export default function MoodPicker({ value, onChange, size = 'md' }) {
  const dim = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-11 w-11 text-xl';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {MOODS.map((m) => {
        const active = value === m.id;
        return (
          <motion.button
            key={m.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            whileHover={{ y: -2 }}
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition ${
              active
                ? 'text-white'
                : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
            }`}
            style={
              active
                ? {
                    background: `${m.color}22`,
                    borderColor: `${m.color}99`,
                    boxShadow: `0 0 16px ${m.color}55`,
                  }
                : undefined
            }
            aria-label={m.label}
          >
            <span className={`flex ${dim} items-center justify-center`}>{m.emoji}</span>
            <span className="text-[10px] uppercase tracking-widest">{m.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
