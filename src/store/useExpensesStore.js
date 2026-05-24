import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';
import { todayKey } from '../utils/dateHelpers.js';

/**
 * Expense: { id, amount, currency:'INR', category, merchant, note, date, source:'manual'|'upi', createdAt }
 * Budget:  { category, monthlyLimit }
 */

export const EXPENSE_CATEGORIES = [
  { id: 'food',           label: 'Food',          icon: '🍽',  color: '#d29922' },
  { id: 'transport',      label: 'Transport',     icon: '🚗',  color: '#00cc44' },
  { id: 'shopping',       label: 'Shopping',      icon: '🛍',  color: '#39ff14' },
  { id: 'entertainment',  label: 'Entertainment', icon: '🎬',  color: '#f85149' },
  { id: 'health',         label: 'Health',        icon: '💊',  color: '#2b6e2b' },
  { id: 'education',      label: 'Education',     icon: '📚',  color: '#5eead4' },
  { id: 'others',         label: 'Others',        icon: '✦',   color: '#8bc98b' },
];

export function categoryMeta(id) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) || EXPENSE_CATEGORIES[6];
}

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useExpensesStore = create((set, get) => ({
  expenses: [],
  budgets: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [expenses, budgets] = await Promise.all([
        readJSON(FILES.expenses, []),
        readJSON(FILES.budgets, []),
      ]);
      set({
        expenses: Array.isArray(expenses) ? expenses : [],
        budgets: Array.isArray(budgets) ? budgets : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[expenses] load failed', err);
      set({ error: err.message || 'Failed to load expenses', loading: false });
    }
  },

  addExpense: async (input) => {
    const exp = {
      id: uid(),
      amount: Math.round(Number(input.amount) * 100) / 100,
      currency: 'INR',
      category: input.category || 'others',
      merchant: (input.merchant || '').trim(),
      note: (input.note || '').trim(),
      date: input.date || todayKey(),
      source: input.source || 'manual',
      createdAt: new Date().toISOString(),
    };
    const next = [...get().expenses, exp];
    set({ expenses: next });
    await persistExpenses(next, set);
    return exp;
  },

  updateExpense: async (id, patch) => {
    const next = get().expenses.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ expenses: next });
    await persistExpenses(next, set);
  },

  deleteExpense: async (id) => {
    const next = get().expenses.filter((e) => e.id !== id);
    set({ expenses: next });
    await persistExpenses(next, set);
  },

  setBudget: async (category, monthlyLimit) => {
    const limit = Math.max(0, Math.round(Number(monthlyLimit)));
    const without = get().budgets.filter((b) => b.category !== category);
    const next = limit > 0 ? [...without, { category, monthlyLimit: limit }] : without;
    set({ budgets: next });
    await persistBudgets(next, set);
  },
}));

async function persistExpenses(expenses, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.expenses, expenses);
    set({ saving: false });
  } catch (err) {
    console.error('[expenses] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save expenses' });
  }
}

async function persistBudgets(budgets, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.budgets, budgets);
    set({ saving: false });
  } catch (err) {
    console.error('[budgets] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save budgets' });
  }
}

// ---------- helpers ----------

export function inMonth(dateKey, year, month) {
  return dateKey.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
}

export function formatINR(amount) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
