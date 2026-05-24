import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { EXPENSE_CATEGORIES, categoryMeta, formatINR } from '../../store/useExpensesStore.js';
import { lastNDays, shortLabel } from '../../utils/dateHelpers.js';

const TABS = [
  { id: 'pie',  label: 'By Category' },
  { id: 'bar',  label: 'This Month' },
  { id: 'line', label: 'Last 30 Days' },
];

export default function ExpenseChart({ expenses }) {
  const [tab, setTab] = useState('pie');

  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(yyyymm));

  // Pie — totals by category for the month
  const byCategory = useMemo(() => {
    const sums = new Map();
    for (const e of monthExpenses) {
      sums.set(e.category, (sums.get(e.category) || 0) + e.amount);
    }
    return EXPENSE_CATEGORIES.map((c) => ({
      name: c.label,
      value: Math.round(sums.get(c.id) || 0),
      color: c.color,
    })).filter((d) => d.value > 0);
  }, [monthExpenses]);

  // Bar — daily totals across this month
  const byDay = useMemo(() => {
    const sums = new Map();
    for (const e of monthExpenses) {
      sums.set(e.date, (sums.get(e.date) || 0) + e.amount);
    }
    return Array.from(sums.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date: shortLabel(date),
        value: Math.round(value),
      }));
  }, [monthExpenses]);

  // Line — last 30 days running total
  const last30 = useMemo(() => {
    const days = lastNDays(30);
    const sums = new Map(days.map((d) => [d, 0]));
    for (const e of expenses) {
      if (sums.has(e.date)) {
        sums.set(e.date, (sums.get(e.date) || 0) + e.amount);
      }
    }
    return days.map((d) => ({
      date: shortLabel(d),
      value: Math.round(sums.get(d) || 0),
    }));
  }, [expenses]);

  if (byCategory.length === 0 && byDay.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center text-sm text-slate-500">
        Log expenses to see charts.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
              tab === t.id
                ? 'border-nebula-violet/60 bg-nebula-violet/20 text-white shadow-glow'
                : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 h-72 w-full">
        {tab === 'pie' && (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                paddingAngle={2}
                labelLine={false}
                label={({ name, percent }) =>
                  percent > 0.08 ? `${name} ${Math.round(percent * 100)}%` : ''
                }
              >
                {byCategory.map((d) => (
                  <Cell key={d.name} fill={d.color} stroke="rgba(0,0,0,0.4)" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => formatINR(v)}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {tab === 'bar' && (
          <ResponsiveContainer>
            <BarChart data={byDay}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(v)} />
              <Bar dataKey="value" fill="#39ff14" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 'line' && (
          <ResponsiveContainer>
            <LineChart data={last30}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(v)} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00cc44"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#39ff14' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#000',
  border: '1px solid rgba(57,255,20,0.45)',
  borderRadius: 8,
  color: '#e7ffe7',
  fontSize: 12,
  boxShadow: '0 0 10px rgba(57,255,20,0.20)',
};
