import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GOAL_CATEGORIES } from '../../store/useGoalsStore.js';

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const empty = {
  title: '',
  description: '',
  category: 'personal',
  targetDate: '',
  milestones: [],
};

export default function GoalForm({ open, goal, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(goal ? { ...empty, ...goal } : empty);
  const [newMilestone, setNewMilestone] = useState('');
  const editing = Boolean(goal?.id);

  useEffect(() => {
    setForm(goal ? { ...empty, ...goal, milestones: goal.milestones || [] } : empty);
    setNewMilestone('');
  }, [goal, open]);

  if (!open) return null;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addMilestone = () => {
    const title = newMilestone.trim();
    if (!title) return;
    update({
      milestones: [
        ...form.milestones,
        { id: uid(), title, completed: false, completedAt: null },
      ],
    });
    setNewMilestone('');
  };

  const removeMilestone = (id) =>
    update({ milestones: form.milestones.filter((m) => m.id !== id) });

  const updateMilestoneTitle = (id, title) =>
    update({
      milestones: form.milestones.map((m) =>
        m.id === id ? { ...m, title } : m
      ),
    });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  };

  const activeCategory =
    GOAL_CATEGORIES.find((c) => c.id === form.category) || GOAL_CATEGORIES[0];

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
          className="glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wide text-glow">
              {editing ? 'Edit Goal' : 'New Goal'}
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
            <Field label="Title">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Ship NexusLife v1"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-nebula-cyan/60 focus:shadow-glow-cyan"
              />
            </Field>

            <Field label="Description (optional)">
              <textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Why does this matter?"
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-nebula-cyan/60"
              />
            </Field>

            <Field label="Category">
              <div className="flex flex-wrap gap-2">
                {GOAL_CATEGORIES.map((c) => (
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

            <Field label="Target Date (optional)">
              <input
                type="date"
                value={form.targetDate || ''}
                onChange={(e) => update({ targetDate: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
              />
            </Field>

            <Field label="Milestones">
              <div className="space-y-2">
                {form.milestones.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{i + 1}.</span>
                    <input
                      value={m.title}
                      onChange={(e) => updateMilestoneTitle(m.id, e.target.value)}
                      placeholder="Milestone…"
                      className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                    />
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-400 hover:border-nebula-red/40 hover:text-nebula-red"
                      aria-label="Remove milestone"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <input
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMilestone();
                      }
                    }}
                    placeholder="Add a milestone, then press Enter…"
                    className="flex-1 rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                  />
                  <button
                    type="button"
                    onClick={addMilestone}
                    disabled={!newMilestone.trim()}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs uppercase tracking-widest text-slate-300 disabled:opacity-50 hover:border-nebula-cyan/50 hover:text-nebula-cyan"
                    style={
                      newMilestone.trim()
                        ? { boxShadow: `0 0 12px ${activeCategory.color}44` }
                        : undefined
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {editing && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(goal)}
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
                disabled={!form.title.trim()}
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
