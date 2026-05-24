import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';
import { todayKey } from '../utils/dateHelpers.js';

/**
 * Journal entry: { id, date, body, createdAt, updatedAt }
 * Mood entry:    { id, date, mood: 'amazing'|'good'|'okay'|'bad'|'terrible', createdAt }
 *
 * One mood per day (overwrites). Multiple journal entries per day are allowed.
 */

export const MOODS = [
  { id: 'amazing',  label: 'Amazing',  emoji: '🚀', color: '#39ff14', value: 5 },
  { id: 'good',     label: 'Good',     emoji: '✨', color: '#00cc44', value: 4 },
  { id: 'okay',     label: 'Okay',     emoji: '🌗', color: '#5eead4', value: 3 },
  { id: 'bad',      label: 'Bad',      emoji: '🌧', color: '#d29922', value: 2 },
  { id: 'terrible', label: 'Terrible', emoji: '🕳', color: '#f85149', value: 1 },
];

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useJournalStore = create((set, get) => ({
  entries: [],
  moods: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [entries, moods] = await Promise.all([
        readJSON(FILES.journal, []),
        readJSON(FILES.moods, []),
      ]);
      set({
        entries: Array.isArray(entries) ? entries : [],
        moods: Array.isArray(moods) ? moods : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[journal] load failed', err);
      set({ error: err.message || 'Failed to load journal', loading: false });
    }
  },

  addEntry: async (body, date = todayKey()) => {
    const text = body.trim();
    if (!text) return null;
    const now = new Date().toISOString();
    const entry = {
      id: uid(),
      date,
      body: text,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...get().entries, entry];
    set({ entries: next });
    await persistEntries(next, set);
    return entry;
  },

  updateEntry: async (id, body) => {
    const text = body.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const next = get().entries.map((e) =>
      e.id === id ? { ...e, body: text, updatedAt: now } : e
    );
    set({ entries: next });
    await persistEntries(next, set);
  },

  deleteEntry: async (id) => {
    const next = get().entries.filter((e) => e.id !== id);
    set({ entries: next });
    await persistEntries(next, set);
  },

  /** Set today's mood (overwrites if one exists). */
  setMood: async (mood, date = todayKey()) => {
    const without = get().moods.filter((m) => m.date !== date);
    const entry = {
      id: uid(),
      date,
      mood,
      createdAt: new Date().toISOString(),
    };
    const next = [...without, entry];
    set({ moods: next });
    await persistMoods(next, set);
  },

  getMoodFor: (date = todayKey()) => {
    return get().moods.find((m) => m.date === date) || null;
  },
}));

async function persistEntries(entries, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.journal, entries);
    set({ saving: false });
  } catch (err) {
    console.error('[journal] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save journal' });
  }
}

async function persistMoods(moods, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.moods, moods);
    set({ saving: false });
  } catch (err) {
    console.error('[moods] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save mood' });
  }
}

// ---------- helpers ----------

export function moodMeta(id) {
  return MOODS.find((m) => m.id === id);
}
