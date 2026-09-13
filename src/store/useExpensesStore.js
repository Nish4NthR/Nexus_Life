import { create } from 'zustand';
import { todayKey } from '../utils/dateHelpers.js';
import { currentUser, safeMessage } from '../lib/userData.js';

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍽', color: '#d29922' }, { id: 'transport', label: 'Transport', icon: '🚗', color: '#00cc44' },
  { id: 'shopping', label: 'Shopping', icon: '🛍', color: '#39ff14' }, { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#f85149' },
  { id: 'health', label: 'Health', icon: '💊', color: '#2b6e2b' }, { id: 'education', label: 'Education', icon: '📚', color: '#5eead4' }, { id: 'others', label: 'Others', icon: '✦', color: '#8bc98b' },
];
export function categoryMeta(id) { return EXPENSE_CATEGORIES.find((c) => c.id === id) || EXPENSE_CATEGORIES[6]; }
const uid = () => crypto.randomUUID();
const fromExpense = (e) => ({ ...e, createdAt: e.created_at });
const fromBudget = (b) => ({ id: b.id, category: b.category, monthlyLimit: Number(b.monthly_limit) });
const expensePatch = (p) => Object.fromEntries(Object.entries(p).filter(([key]) => ['amount', 'currency', 'category', 'merchant', 'note', 'date', 'source'].includes(key)));

export const useExpensesStore = create((set, get) => ({
  expenses: [], budgets: [], loaded: false, loading: false, saving: false, error: null,

  load: async () => {
    if (get().loading) return; set({ loading: true, error: null });
    try { const { client, user } = await currentUser(); const [expenses, budgets] = await Promise.all([client.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }), client.from('budgets').select('*').eq('user_id', user.id)]); if (expenses.error) throw expenses.error; if (budgets.error) throw budgets.error; set({ expenses: (expenses.data || []).map(fromExpense), budgets: (budgets.data || []).map(fromBudget), loaded: true, loading: false }); }
    catch (error) { set({ loading: false, error: safeMessage(error, 'Unable to load your expenses.') }); }
  },

  addExpense: async (input) => {
    const exp = { id: uid(), amount: Math.round(Number(input.amount) * 100) / 100, currency: 'INR', category: input.category || 'others', merchant: (input.merchant || '').trim(), note: (input.note || '').trim(), date: input.date || todayKey(), source: input.source || 'manual', createdAt: new Date().toISOString() };
    try { const { client, user } = await currentUser(); const { data, error } = await client.from('expenses').insert({ id: exp.id, user_id: user.id, amount: exp.amount, currency: exp.currency, category: exp.category, merchant: exp.merchant, note: exp.note, date: exp.date, source: exp.source }).select('*').single(); if (error) throw error; const saved = fromExpense(data); set({ expenses: [saved, ...get().expenses] }); return saved; }
    catch (error) { set({ error: safeMessage(error, 'Unable to save your expense.') }); throw error; }
  },

  updateExpense: async (id, patch) => { try { const { client, user } = await currentUser(); const { data, error } = await client.from('expenses').update(expensePatch(patch)).eq('id', id).eq('user_id', user.id).select('*').single(); if (error) throw error; set({ expenses: get().expenses.map((e) => e.id === id ? fromExpense(data) : e) }); } catch (error) { set({ error: safeMessage(error, 'Unable to save your expense.') }); } },
  deleteExpense: async (id) => { try { const { client, user } = await currentUser(); const { error } = await client.from('expenses').delete().eq('id', id).eq('user_id', user.id); if (error) throw error; set({ expenses: get().expenses.filter((e) => e.id !== id) }); } catch (error) { set({ error: safeMessage(error, 'Unable to delete your expense.') }); } },
  setBudget: async (category, monthlyLimit) => { try { const { client, user } = await currentUser(); const limit = Math.max(0, Math.round(Number(monthlyLimit))); if (!limit) { const { error } = await client.from('budgets').delete().eq('category', category).eq('user_id', user.id); if (error) throw error; set({ budgets: get().budgets.filter((b) => b.category !== category) }); return; } const { data, error } = await client.from('budgets').upsert({ user_id: user.id, category, monthly_limit: limit }, { onConflict: 'user_id,category' }).select('*').single(); if (error) throw error; const budget = fromBudget(data); set({ budgets: [...get().budgets.filter((b) => b.category !== category), budget] }); } catch (error) { set({ error: safeMessage(error, 'Unable to save your budget.') }); } },
}));

export function inMonth(dateKey, year, month) { return dateKey.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`); }
export function formatINR(amount) { return `₹${Math.round(amount).toLocaleString('en-IN')}`; }
