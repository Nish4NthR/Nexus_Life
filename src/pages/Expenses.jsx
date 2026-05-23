import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import ExpenseChart from '../components/expenses/ExpenseChart.jsx';
import BudgetBar from '../components/expenses/BudgetBar.jsx';
import PendingUPITray from '../components/expenses/PendingUPITray.jsx';
import {
  useExpensesStore,
  EXPENSE_CATEGORIES,
  categoryMeta,
  formatINR,
} from '../store/useExpensesStore.js';
import { useExpenseInsights } from '../hooks/useAI.js';
import { useUPIPolling } from '../hooks/useUPIPolling.js';
import { lastNDays, shortLabel } from '../utils/dateHelpers.js';

export default function Expenses() {
  const expenses = useExpensesStore((s) => s.expenses);
  const budgets = useExpensesStore((s) => s.budgets);
  const loaded = useExpensesStore((s) => s.loaded);
  const loading = useExpensesStore((s) => s.loading);
  const error = useExpensesStore((s) => s.error);
  const load = useExpensesStore((s) => s.load);
  const addExpense = useExpensesStore((s) => s.addExpense);
  const updateExpense = useExpensesStore((s) => s.updateExpense);
  const deleteExpense = useExpensesStore((s) => s.deleteExpense);
  const setBudget = useExpensesStore((s) => s.setBudget);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [budgetCat, setBudgetCat] = useState(null);

  const insights = useExpenseInsights();
  const upi = useUPIPolling();

  const onUPIConfirm = async (entry, overrides) => {
    await addExpense({
      amount: overrides.amount,
      category: overrides.category,
      merchant: overrides.merchant,
      date: overrides.date,
      note: `UPI · ${entry.sender || 'auto'}`,
      source: 'upi',
    });
    await upi.confirm(entry.id);
  };

  useEffect(() => {
    if (!loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const monthEx = expenses.filter((e) => e.date.startsWith(yyyymm));
    const last7 = new Set(lastNDays(7));
    const weekEx = expenses.filter((e) => last7.has(e.date));
    const monthTotal = monthEx.reduce((s, e) => s + e.amount, 0);
    const weekTotal = weekEx.reduce((s, e) => s + e.amount, 0);
    const today = monthEx
      .filter((e) => e.date === lastNDays(1)[0])
      .reduce((s, e) => s + e.amount, 0);
    return { monthTotal, weekTotal, today, count: monthEx.length };
  }, [expenses, yyyymm]);

  const recent = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 20),
    [expenses]
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const submit = async (form) => {
    if (editing) await updateExpense(editing.id, form);
    else await addExpense(form);
    close();
  };
  const onDelete = async (e) => {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(e.id);
    close();
  };

  const runInsights = () => {
    const last7 = new Set(lastNDays(7));
    const weekEx = expenses.filter((e) => last7.has(e.date));
    const byCategory = {};
    const merchantCounts = {};
    for (const e of weekEx) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      if (e.merchant) merchantCounts[e.merchant] = (merchantCounts[e.merchant] || 0) + 1;
    }
    const topMerchants = Object.entries(merchantCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([m]) => m)
      .slice(0, 5);
    insights.run({
      totalThisWeek: Math.round(stats.weekTotal),
      byCategory,
      topMerchants,
    });
  };

  const exportCSV = () => {
    const headers = ['date', 'amount', 'category', 'merchant', 'note', 'source'];
    const rows = expenses.map((e) =>
      headers.map((h) => `"${String(e[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexuslife-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
            Expenses
          </h1>
          <p className="mt-1 text-slate-400">
            Manual entry, ₹ INR. UPI auto-import coming once we wire up the bridge.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-xs uppercase tracking-[0.25em] text-slate-300 hover:text-white"
          >
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-white shadow-glow hover:bg-nebula-violet/30"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Today" value={formatINR(stats.today)} accent="#06B6D4" />
        <Stat label="This Week" value={formatINR(stats.weekTotal)} accent="#7C3AED" />
        <Stat label="This Month" value={formatINR(stats.monthTotal)} accent="#F59E0B" />
        <Stat label="Entries" value={stats.count} accent="#10B981" />
      </div>

      {/* Pending UPI tray — shown when configured OR when there's something pending */}
      {(upi.configured || upi.pending.length > 0) && (
        <div className="mt-6">
          <PendingUPITray
            pending={upi.pending}
            polling={upi.polling}
            error={upi.error}
            onConfirm={onUPIConfirm}
            onReject={upi.reject}
            onRefresh={upi.refresh}
            configured={upi.configured}
            lastPolled={upi.lastPolled}
          />
        </div>
      )}

      {loading && !loaded && (
        <div className="mt-12 flex justify-center">
          <OrbitSpinner size={56} />
        </div>
      )}
      {error && (
        <GlassCard hover={false} className="mt-6 border-nebula-red/40">
          <div className="text-sm text-nebula-red">
            <strong>Sync error:</strong> {error}
          </div>
          <button
            onClick={load}
            className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {loaded && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: chart + insights */}
          <div className="space-y-6 lg:col-span-2">
            <GlassCard hover={false}>
              <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
                Trends
              </h2>
              <div className="mt-3">
                <ExpenseChart expenses={expenses} />
              </div>
            </GlassCard>

            <GlassCard hover={false} className="border-nebula-cyan/30">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
                  ✺ AI Insights
                </h2>
                {insights.available && (
                  <button
                    onClick={runInsights}
                    disabled={insights.loading || expenses.length === 0}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 hover:text-nebula-cyan disabled:opacity-50"
                  >
                    {insights.loading ? 'Analyzing…' : 'Analyze week'}
                  </button>
                )}
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
                {insights.data ||
                  insights.error ||
                  (insights.available
                    ? 'Tap "Analyze week" to get 2-3 saving tips based on your last 7 days.'
                    : 'AI not configured — add VITE_GEMINI_API_KEY to .env.')}
              </div>
            </GlassCard>

            {/* Recent list */}
            <GlassCard hover={false}>
              <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
                Recent
              </h2>
              {recent.length === 0 ? (
                <div className="mt-4 text-sm text-slate-500">
                  No expenses yet. Add one to get started.
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {recent.map((e) => {
                    const cat = categoryMeta(e.category);
                    return (
                      <li key={e.id}>
                        <button
                          onClick={() => openEdit(e)}
                          className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-white/5"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                            style={{
                              background: `${cat.color}22`,
                              border: `1px solid ${cat.color}55`,
                            }}
                          >
                            {cat.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm text-slate-200">
                                {e.merchant || cat.label}
                              </div>
                              <div className="shrink-0 font-display text-sm text-slate-100">
                                {formatINR(e.amount)}
                              </div>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
                              <span>{shortLabel(e.date)}</span>
                              <span>·</span>
                              <span>{cat.label}</span>
                              {e.source === 'upi' && (
                                <>
                                  <span>·</span>
                                  <span className="text-nebula-cyan">UPI</span>
                                </>
                              )}
                            </div>
                            {e.note && (
                              <div className="mt-1 truncate text-xs text-slate-500">
                                {e.note}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </div>

          {/* Right: budgets */}
          <div className="space-y-6">
            <GlassCard hover={false}>
              <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
                Monthly Budgets
              </h2>
              <div className="mt-3">
                <BudgetBar
                  expenses={expenses}
                  budgets={budgets}
                  onEditBudget={(catId) => setBudgetCat(catId)}
                />
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      <ExpenseForm
        open={formOpen}
        expense={editing}
        onClose={close}
        onSubmit={submit}
        onDelete={editing ? onDelete : undefined}
      />

      {budgetCat && (
        <BudgetEditorDialog
          category={budgetCat}
          current={budgets.find((b) => b.category === budgetCat)?.monthlyLimit || 0}
          onSave={async (amount) => {
            await setBudget(budgetCat, amount);
            setBudgetCat(null);
          }}
          onClose={() => setBudgetCat(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <GlassCard hover={false} className="!p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div
        className="mt-1 font-display text-2xl"
        style={{ color: accent }}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function BudgetEditorDialog({ category, current, onSave, onClose }) {
  const cat = categoryMeta(category);
  const [amount, setAmount] = useState(current || '');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(Number(amount) || 0);
        }}
        className="glass-strong w-full max-w-sm rounded-2xl p-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{cat.icon}</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Monthly Budget
            </div>
            <div className="font-display text-lg text-slate-100">{cat.label}</div>
          </div>
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          placeholder="0"
          className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-display text-xl text-slate-100 outline-none focus:border-nebula-cyan/60"
        />
        <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
          Set to 0 to remove the budget.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-widest text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2 text-xs uppercase tracking-widest text-white shadow-glow hover:bg-nebula-violet/30"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
