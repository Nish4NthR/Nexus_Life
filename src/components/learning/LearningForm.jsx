import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEARNING_TYPES } from '../../store/useLearningStore.js';

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const empty = {
  title: '',
  type: 'course',
  platform: '',
  url: '',
  author: '',
  topics: [],
};

export default function LearningForm({ open, item, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(item ? { ...empty, ...item } : empty);
  const [newTopic, setNewTopic] = useState('');
  const editing = Boolean(item?.id);

  useEffect(() => {
    setForm(item ? { ...empty, ...item, topics: item.topics || [] } : empty);
    setNewTopic('');
  }, [item, open]);

  if (!open) return null;
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addTopic = () => {
    const title = newTopic.trim();
    if (!title) return;
    update({
      topics: [...form.topics, { id: uid(), title, completed: false }],
    });
    setNewTopic('');
  };

  const removeTopic = (id) =>
    update({ topics: form.topics.filter((tp) => tp.id !== id) });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  };

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
              {editing ? 'Edit Item' : 'New Learning Item'}
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
            <Field label="Type">
              <div className="flex flex-wrap gap-2">
                {LEARNING_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => update({ type: t.id, color: t.color, icon: t.icon })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
                      form.type === t.id
                        ? 'text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
                    }`}
                    style={
                      form.type === t.id
                        ? {
                            borderColor: `${t.color}99`,
                            background: `${t.color}22`,
                            boxShadow: `0 0 14px ${t.color}55`,
                          }
                        : undefined
                    }
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Title">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. CS50: Introduction to CS"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60 focus:shadow-glow-cyan"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Platform / Source">
                <input
                  value={form.platform}
                  onChange={(e) => update({ platform: e.target.value })}
                  placeholder="Udemy, edX, YouTube…"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </Field>
              <Field label={form.type === 'book' ? 'Author' : 'Instructor (optional)'}>
                <input
                  value={form.author}
                  onChange={(e) => update({ author: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </Field>
            </div>

            <Field label="URL (optional)">
              <input
                type="url"
                value={form.url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="https://"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
              />
            </Field>

            <Field label="Topics / Lessons">
              <div className="space-y-2">
                {form.topics.map((tp, i) => (
                  <div key={tp.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{i + 1}.</span>
                    <input
                      value={tp.title}
                      onChange={(e) =>
                        update({
                          topics: form.topics.map((x) =>
                            x.id === tp.id ? { ...x, title: e.target.value } : x
                          ),
                        })
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                    />
                    <button
                      type="button"
                      onClick={() => removeTopic(tp.id)}
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-400 hover:border-nebula-red/40 hover:text-nebula-red"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTopic();
                      }
                    }}
                    placeholder="Add a topic, press Enter…"
                    className="flex-1 rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                  />
                  <button
                    type="button"
                    onClick={addTopic}
                    disabled={!newTopic.trim()}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs uppercase tracking-widest text-slate-300 hover:text-nebula-cyan disabled:opacity-50"
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
                onClick={() => onDelete(item)}
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
