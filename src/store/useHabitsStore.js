import { create } from 'zustand';
import { todayKey } from '../utils/dateHelpers.js';
import { computeStreak, computeLongestStreak } from '../utils/streakLogic.js';
import { currentUser, safeMessage } from '../lib/userData.js';

const CATEGORY_COLORS = { health: '#39ff14', learning: '#00cc44', fitness: '#d29922', mindfulness: '#5eead4', productivity: '#f85149' };
const uid = () => crypto.randomUUID();
const fromHabit = (h) => ({ ...h, xpPerCompletion: h.xp_per_completion, createdAt: h.created_at });
const fromLog = (l) => ({ id: l.id, habitId: l.habit_id, date: l.date, completedAt: l.completed_at });
const toHabitPatch = (p) => ({
  ...(p.name !== undefined && { name: p.name }), ...(p.category !== undefined && { category: p.category }),
  ...(p.frequency !== undefined && { frequency: p.frequency }), ...(p.time !== undefined && { time: p.time }),
  ...(p.icon !== undefined && { icon: p.icon }), ...(p.color !== undefined && { color: p.color }),
  ...(p.archived !== undefined && { archived: p.archived }), ...(p.xpPerCompletion !== undefined && { xp_per_completion: p.xpPerCompletion }),
});

export const useHabitsStore = create((set, get) => ({
  habits: [], logs: [], loaded: false, loading: false, saving: false, error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const { client, user } = await currentUser();
      const [habits, logs] = await Promise.all([
        client.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        client.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      ]);
      if (habits.error) throw habits.error; if (logs.error) throw logs.error;
      set({ habits: (habits.data || []).map(fromHabit), logs: (logs.data || []).map(fromLog), loaded: true, loading: false });
    } catch (error) { set({ loading: false, error: safeMessage(error, 'Unable to load your habits.') }); }
  },

  addHabit: async (input) => {
    const now = new Date().toISOString();
    const habit = { id: uid(), name: input.name.trim(), category: input.category || 'productivity', frequency: input.frequency || 'daily', time: input.time || null, icon: input.icon || '✦', color: input.color || CATEGORY_COLORS[input.category] || '#39ff14', createdAt: now, archived: false, xpPerCompletion: input.xpPerCompletion || 10 };
    try {
      const { client, user } = await currentUser();
      const { data, error } = await client.from('habits').insert({ id: habit.id, user_id: user.id, name: habit.name, category: habit.category, frequency: habit.frequency, time: habit.time, icon: habit.icon, color: habit.color, archived: false, xp_per_completion: habit.xpPerCompletion }).select('*').single();
      if (error) throw error;
      const saved = fromHabit(data); set({ habits: [...get().habits, saved] }); return saved;
    } catch (error) { set({ error: safeMessage(error, 'Unable to save your habit.') }); throw error; }
  },

  updateHabit: async (id, patch) => {
    try {
      const { client, user } = await currentUser(); const { data, error } = await client.from('habits').update(toHabitPatch(patch)).eq('id', id).eq('user_id', user.id).select('*').single();
      if (error) throw error; set({ habits: get().habits.map((h) => h.id === id ? { ...h, ...patch, ...fromHabit(data) } : h) });
    } catch (error) { set({ error: safeMessage(error, 'Unable to save your habit.') }); }
  },

  archiveHabit: async (id) => get().updateHabit(id, { archived: true }),

  deleteHabit: async (id) => {
    try { const { client, user } = await currentUser(); const { error } = await client.from('habits').delete().eq('id', id).eq('user_id', user.id); if (error) throw error; set({ habits: get().habits.filter((h) => h.id !== id), logs: get().logs.filter((l) => l.habitId !== id) }); }
    catch (error) { set({ error: safeMessage(error, 'Unable to delete your habit.') }); }
  },

  toggleLog: async (habitId, date = todayKey()) => {
    const existing = get().logs.find((l) => l.habitId === habitId && l.date === date);
    try {
      const { client, user } = await currentUser();
      if (existing) { const { error } = await client.from('habit_logs').delete().eq('id', existing.id).eq('user_id', user.id); if (error) throw error; set({ logs: get().logs.filter((l) => l.id !== existing.id) }); return false; }
      const local = { id: uid(), habitId, date, completedAt: new Date().toISOString() };
      const { data, error } = await client.from('habit_logs').insert({ id: local.id, user_id: user.id, habit_id: habitId, date, completed_at: local.completedAt }).select('*').single();
      if (error) throw error; set({ logs: [...get().logs, fromLog(data)] }); return true;
    } catch (error) { set({ error: safeMessage(error, 'Unable to save your habit log.') }); return false; }
  },

  getLogsForHabit: (habitId) => get().logs.filter((l) => l.habitId === habitId).map((l) => l.date),
  getStreak: (habitId) => computeStreak(get().getLogsForHabit(habitId)),
  getLongestStreak: (habitId) => computeLongestStreak(get().getLogsForHabit(habitId)),
  isCompletedToday: (habitId) => get().logs.some((l) => l.habitId === habitId && l.date === todayKey()),
  getTotalXP: () => { const map = new Map(get().habits.map((h) => [h.id, h.xpPerCompletion || 10])); return get().logs.reduce((sum, l) => sum + (map.get(l.habitId) || 10), 0); },
  getTodayCompletionRate: () => { const active = get().habits.filter((h) => !h.archived); if (!active.length) return { done: 0, total: 0, percent: 0 }; const completed = get().logs.filter((l) => l.date === todayKey()).map((l) => l.habitId); const done = active.filter((h) => completed.includes(h.id)).length; return { done, total: active.length, percent: (done / active.length) * 100 }; },
}));

export const HABIT_CATEGORIES = Object.entries(CATEGORY_COLORS).map(([id, color]) => ({ id, label: id[0].toUpperCase() + id.slice(1), icon: '✦', color }));
