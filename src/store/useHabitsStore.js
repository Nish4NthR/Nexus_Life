import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';
import { todayKey } from '../utils/dateHelpers.js';
import { computeStreak, computeLongestStreak } from '../utils/streakLogic.js';

/**
 * Habit shape:
 *   {
 *     id, name, category, frequency: 'daily'|'weekly',
 *     time: '07:00' | null, icon: '🧘', color: '#39ff14',
 *     createdAt, archived: false, xpPerCompletion: 10
 *   }
 *
 * HabitLog shape:
 *   { id, habitId, date: 'YYYY-MM-DD', completedAt, note? }
 */

const CATEGORY_COLORS = {
  health: '#39ff14',
  learning: '#00cc44',
  fitness: '#d29922',
  mindfulness: '#5eead4',
  productivity: '#f85149',
};

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useHabitsStore = create((set, get) => ({
  habits: [],
  logs: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  // ---------- load ----------
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [habits, logs] = await Promise.all([
        readJSON(FILES.habits, []),
        readJSON(FILES.habitLogs, []),
      ]);
      set({
        habits: Array.isArray(habits) ? habits : [],
        logs: Array.isArray(logs) ? logs : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[habits] load failed', err);
      set({ error: err.message || 'Failed to load habits', loading: false });
    }
  },

  // ---------- mutations ----------
  addHabit: async (input) => {
    const now = new Date().toISOString();
    const habit = {
      id: uid(),
      name: input.name.trim(),
      category: input.category || 'productivity',
      frequency: input.frequency || 'daily',
      time: input.time || null,
      icon: input.icon || '✦',
      color: input.color || CATEGORY_COLORS[input.category] || '#39ff14',
      createdAt: now,
      archived: false,
      xpPerCompletion: input.xpPerCompletion || 10,
    };
    const next = [...get().habits, habit];
    set({ habits: next });
    await persistHabits(next, set);
    return habit;
  },

  updateHabit: async (id, patch) => {
    const next = get().habits.map((h) => (h.id === id ? { ...h, ...patch } : h));
    set({ habits: next });
    await persistHabits(next, set);
  },

  archiveHabit: async (id) => {
    await get().updateHabit(id, { archived: true });
  },

  deleteHabit: async (id) => {
    const habits = get().habits.filter((h) => h.id !== id);
    const logs = get().logs.filter((l) => l.habitId !== id);
    set({ habits, logs });
    await Promise.all([
      writeJSON(FILES.habits, habits),
      writeJSON(FILES.habitLogs, logs),
    ]);
  },

  /**
   * Toggle today's (or any given date's) completion for a habit.
   * If a log exists for that date, remove it; otherwise add one.
   */
  toggleLog: async (habitId, date = todayKey()) => {
    const existing = get().logs.find(
      (l) => l.habitId === habitId && l.date === date
    );
    let next;
    if (existing) {
      next = get().logs.filter((l) => l.id !== existing.id);
    } else {
      next = [
        ...get().logs,
        {
          id: uid(),
          habitId,
          date,
          completedAt: new Date().toISOString(),
        },
      ];
    }
    set({ logs: next });
    await persistLogs(next, set);
    return !existing; // true if it was just completed (added), false if it was uncompleted
  },

  // ---------- derived selectors (call as fns, no React deps here) ----------
  getLogsForHabit: (habitId) =>
    get().logs.filter((l) => l.habitId === habitId).map((l) => l.date),

  getStreak: (habitId) => computeStreak(get().getLogsForHabit(habitId)),

  getLongestStreak: (habitId) =>
    computeLongestStreak(get().getLogsForHabit(habitId)),

  isCompletedToday: (habitId) => {
    const t = todayKey();
    return get().logs.some((l) => l.habitId === habitId && l.date === t);
  },

  getTotalXP: () => {
    const map = new Map(get().habits.map((h) => [h.id, h.xpPerCompletion || 10]));
    return get().logs.reduce((sum, l) => sum + (map.get(l.habitId) || 10), 0);
  },

  getTodayCompletionRate: () => {
    const active = get().habits.filter((h) => !h.archived);
    if (active.length === 0) return { done: 0, total: 0, percent: 0 };
    const t = todayKey();
    const completed = get().logs.filter((l) => l.date === t).map((l) => l.habitId);
    const done = active.filter((h) => completed.includes(h.id)).length;
    return { done, total: active.length, percent: (done / active.length) * 100 };
  },
}));

// ---------- persistence helpers ----------
async function persistHabits(habits, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.habits, habits);
    set({ saving: false });
  } catch (err) {
    console.error('[habits] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save habits' });
  }
}

async function persistLogs(logs, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.habitLogs, logs);
    set({ saving: false });
  } catch (err) {
    console.error('[habits] save logs failed', err);
    set({ saving: false, error: err.message || 'Failed to save logs' });
  }
}

export const HABIT_CATEGORIES = [
  { id: 'health',       label: 'Health',       icon: '💚', color: CATEGORY_COLORS.health },
  { id: 'learning',     label: 'Learning',     icon: '📚', color: CATEGORY_COLORS.learning },
  { id: 'fitness',      label: 'Fitness',      icon: '💪', color: CATEGORY_COLORS.fitness },
  { id: 'mindfulness',  label: 'Mindfulness',  icon: '🧘', color: CATEGORY_COLORS.mindfulness },
  { id: 'productivity', label: 'Productivity', icon: '⚡', color: CATEGORY_COLORS.productivity },
];
