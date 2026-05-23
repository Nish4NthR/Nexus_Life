import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXPENSE_CATEGORIES } from '../../store/useExpensesStore.js';
import { todayKey } from '../../utils/dateHelpers.js';

const empty = {
  amount: '',
  category: 'food',
  merchant: '',
  note: '',
  date: todayKey(),
};

export default function ExpenseForm({ open, expense, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(expense ? { ...empty, ...expense } : empty);
  const editing = Boolean(expense?.id);

  useEffect(() => {
    setForm(expense ? { ...empty, ...expense } : empty);
  }, [expense, open]);

  if (!open) return null;
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const activeCat = EXPENSE_CATEGORIES.find((c) => c.id === form.category) || EXPENSE_CATEGORIES[0];

  const submit = (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
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
          className="glass-strong w-full max-w-lg rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wide text-glow">
              {editing ? 'Edit Expense' : 'New Expense'}
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
            <Field label="Amount (₹)">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.amount}
                onChange={(e) => update({ amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-display text-xl text-slate-100 outline-none focus:border-nebula-cyan/60 focus:shadow-glow-cyan"
              />
            </Field>

            <Field label="Category">
              <div className="grid grid-cols-4 gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update({ category: c.id })}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] uppercase tracking-widest transition ${
                      form.category === c.id
                        ? 'text-white'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
                    }`}
                    style={
                      form.category === c.id
                        ? {
                            borderColor: `${c.color}99`,
                            background: `${c.color}22`,
                            boxShadow: `0 0 12px ${c.color}55`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Merchant (optional)">
                <input
                  value={form.merchant}
                  onChange={(e) => update({ merchant: e.target.value })}
                  placeholder="e.g. Swiggy"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update({ date: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </Field>
            </div>

            <Field label="Note (optional)">
              <input
                value={form.note}
                onChange={(e) => update({ note: e.target.value })}
                placeholder="Anything to remember?"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
              />
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {editing && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(expense)}
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
                disabled={!Number(form.amount)}
                className="rounded-xl border px-5 py-2 text-xs uppercase tracking-widest text-white shadow-glow disabled:opacity-50"
                style={{
                  borderColor: `${activeCat.color}99`,
                  background: `${activeCat.color}33`,
                }}
              >
                {editing ? 'Save' : 'Add'}
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
