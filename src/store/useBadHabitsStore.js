import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';
import { todayKey, diffDays, parseKey } from '../utils/dateHelpers.js';

/**
 * BadHabit shape:
 *   {
 *     id, name, why, color, icon,
 *     startedAt: 'YYYY-MM-DD' (when they started quitting),
 *     resistedDates: ['YYYY-MM-DD', ...] (days they actively said "I resisted"),
 *     relapses: [{ id, date, note? }],
 *     createdAt
 *   }
 *
 * Days clean = days since the latest of (startedAt OR last relapse).
 */

const MILESTONES = [7, 21, 30, 60, 90, 180, 365];

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useBadHabitsStore = create((set, get) => ({
  badHabits: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const list = await readJSON(FILES.badHabits, []);
      set({
        badHabits: Array.isArray(list) ? list : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[bad-habits] load failed', err);
      set({ error: err.message || 'Failed to load bad habits', loading: false });
    }
  },

  addBadHabit: async (input) => {
    const today = todayKey();
    const habit = {
      id: uid(),
      name: input.name.trim(),
      why: (input.why || '').trim(),
      color: input.color || '#EF4444',
      icon: input.icon || '⌖',
      startedAt: input.startedAt || today,
      resistedDates: [],
      relapses: [],
      createdAt: new Date().toISOString(),
    };
    const next = [...get().badHabits, habit];
    set({ badHabits: next });
    await persist(next, set);
    return habit;
  },

  updateBadHabit: async (id, patch) => {
    const next = get().badHabits.map((h) => (h.id === id ? { ...h, ...patch } : h));
    set({ badHabits: next });
    await persist(next, set);
  },

  deleteBadHabit: async (id) => {
    const next = get().badHabits.filter((h) => h.id !== id);
    set({ badHabits: next });
    await persist(next, set);
  },

  /** Log a resisted-today click. Idempotent for today's date. */
  resistToday: async (id) => {
    const today = todayKey();
    const next = get().badHabits.map((h) => {
      if (h.id !== id) return h;
      if (h.resistedDates.includes(today)) return h;
      return { ...h, resistedDates: [...h.resistedDates, today] };
    });
    set({ badHabits: next });
    await persist(next, set);
  },

  /** Log a relapse — resets the clean clock. */
  logRelapse: async (id, note = '') => {
    const next = get().badHabits.map((h) => {
      if (h.id !== id) return h;
      return {
        ...h,
        relapses: [
          ...h.relapses,
          { id: uid(), date: todayKey(), note: note.trim() || null },
        ],
      };
    });
    set({ badHabits: next });
    await persist(next, set);
  },
}));

async function persist(badHabits, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.badHabits, badHabits);
    set({ saving: false });
  } catch (err) {
    console.error('[bad-habits] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save bad habits' });
  }
}

// ---------- pure helpers ----------

/**
 * Compute days clean — days since the latest of (startedAt OR last relapse).
 * Min 0; clamps to today if startedAt is in the future.
 */
export function daysClean(habit) {
  const anchor = lastResetDate(habit);
  const today = todayKey();
  return Math.max(0, diffDays(today, anchor));
}

export function lastResetDate(habit) {
  if (!habit.relapses || habit.relapses.length === 0) return habit.startedAt;
  const lastRelapse = habit.relapses.reduce(
    (latest, r) => (r.date > latest ? r.date : latest),
    habit.relapses[0].date
  );
  return habit.startedAt > lastRelapse ? habit.startedAt : lastRelapse;
}

/** Next milestone the user is striving toward (e.g. 7, 21, 30…). */
export function nextMilestone(days) {
  for (const m of MILESTONES) if (m > days) return m;
  return null;
}

export function reachedMilestone(habit) {
  const d = daysClean(habit);
  return MILESTONES.includes(d);
}

export const MILESTONE_DAYS = MILESTONES;
