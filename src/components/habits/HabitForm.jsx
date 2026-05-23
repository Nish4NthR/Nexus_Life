import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HABIT_CATEGORIES } from '../../store/useHabitsStore.js';

const ICONS = ['✦', '☄', '✺', '◈', '⌬', '🧘', '🏃', '📚', '💧', '🌙', '☀', '⚡'];

const empty = {
  name: '',
  category: 'productivity',
  frequency: 'daily',
  time: '',
  icon: '✦',
};

export default function HabitForm({ open, habit, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(habit ? { ...empty, ...habit } : empty);
  const editing = Boolean(habit?.id);

  useEffect(() => {
    setForm(habit ? { ...empty, ...habit } : empty);
  }, [habit, open]);

  if (!open) return null;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  const activeCategory =
    HABIT_CATEGORIES.find((c) => c.id === form.category) || HABIT_CATEGORIES[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-strong w-full max-w-lg rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wide text-glow">
              {editing ? 'Edit Habit' : 'New Habit'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm text-slate-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Name">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Meditate"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-nebula-cyan/60 focus:shadow-glow-cyan"
              />
            </Field>

            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {HABIT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update({ category: c.id, color: c.color })}
                    className={`rounded-xl border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                      form.category === c.id
                        ? 'text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
                    }`}
                    style={
                      form.category === c.id
                        ? {
                            borderColor: `${c.color}99`,
                            background: `${c.color}22`,
                            boxShadow: `0 0 16px ${c.color}55`,
                          }
                        : undefined
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Frequency">
                <select
                  value={form.frequency}
                  onChange={(e) => update({ frequency: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </Field>
              <Field label="Time (optional)">
                <input
                  type="time"
                  value={form.time || ''}
                  onChange={(e) => update({ time: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </Field>
            </div>

            <Field label="Icon">
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => update({ icon })}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
                      form.icon === icon
                        ? 'text-white'
                        : 'border border-white/10 bg-black/30 text-slate-300 hover:text-white'
                    }`}
                    style={
                      form.icon === icon
                        ? {
                            background: `${activeCategory.color}22`,
                            border: `1px solid ${activeCategory.color}99`,
                            boxShadow: `0 0 16px ${activeCategory.color}55`,
                          }
                        : undefined
                    }
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {editing && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(habit)}
                className="rounded-xl border border-nebula-red/40 bg-nebula-red/10 px-4 py-2 text-xs uppercase tracking-widest text-nebula-red transition hover:bg-nebula-red/20"
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-widest text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2 text-xs uppercase tracking-widest text-white shadow-glow disabled:opacity-50 hover:bg-nebula-violet/30"
              >
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.25em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
