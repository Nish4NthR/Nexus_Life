import { motion } from 'framer-motion';
import { EXPENSE_CATEGORIES, categoryMeta, formatINR } from '../../store/useExpensesStore.js';

/**
 * Per-category budget bars for the current month.
 * Color-coded: green <60%, amber 60-90%, red >90%.
 */
export default function BudgetBar({ expenses, budgets, onEditBudget }) {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const spentByCat = new Map();
  for (const e of expenses) {
    if (e.date.startsWith(yyyymm)) {
      spentByCat.set(e.category, (spentByCat.get(e.category) || 0) + e.amount);
    }
  }

  const budgetByCat = new Map(budgets.map((b) => [b.category, b.monthlyLimit]));

  // Only show categories that have either a budget or spending
  const rows = EXPENSE_CATEGORIES.filter(
    (c) => budgetByCat.has(c.id) || spentByCat.has(c.id)
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-500">
        No budgets set yet — tap any category to set a monthly limit.
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onEditBudget?.(c.id)}
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-100"
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((c) => {
        const spent = spentByCat.get(c.id) || 0;
        const limit = budgetByCat.get(c.id) || 0;
        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
        const over = limit > 0 && spent > limit;
        const warnColor =
          !limit ? '#8bc98b' :
          pct > 90 ? '#f85149' :
          pct > 60 ? '#d29922' :
          '#39ff14';

        return (
          <button
            key={c.id}
            onClick={() => onEditBudget?.(c.id)}
            className="w-full rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-white/15"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-lg">{c.icon}</span>
                <span className="truncate text-sm text-slate-200">{c.label}</span>
              </div>
              <div className="shrink-0 text-right text-xs">
                <span className="text-slate-300">{formatINR(spent)}</span>
                {limit > 0 && (
                  <>
                    <span className="text-slate-500"> / </span>
                    <span className="text-slate-400">{formatINR(limit)}</span>
                  </>
                )}
                {!limit && (
                  <span className="ml-1 text-[10px] uppercase tracking-widest text-slate-500">
                    no limit
                  </span>
                )}
              </div>
            </div>

            {limit > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    background: `linear-gradient(90deg, ${warnColor}, ${warnColor}aa)`,
                    boxShadow: `0 0 10px ${warnColor}66`,
                  }}
                />
              </div>
            )}
            {over && (
              <div className="mt-1 text-[10px] uppercase tracking-widest text-nebula-red">
                Over budget by {formatINR(spent - limit)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
