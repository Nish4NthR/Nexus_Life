import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';
import { todayKey } from '../utils/dateHelpers.js';
import { computeStreak } from '../utils/streakLogic.js';

/**
 * LearningItem:
 *   {
 *     id, title, type:'course'|'book'|'coding',
 *     platform, url, author,
 *     totalTopics, topics:[{id, title, completed}],
 *     status:'active'|'completed',
 *     color, icon,
 *     createdAt, completedAt?
 *   }
 *
 * LearningLog: { id, itemId, date, minutes, topicsCompleted, createdAt }
 */

export const LEARNING_TYPES = [
  { id: 'course', label: 'Course',  icon: '📺', color: '#79c0ff' },
  { id: 'book',   label: 'Book',    icon: '📚', color: '#F59E0B' },
  { id: 'coding', label: 'Coding',  icon: '💻', color: '#58a6ff' },
];

export function learningTypeMeta(id) {
  return LEARNING_TYPES.find((t) => t.id === id) || LEARNING_TYPES[0];
}

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const cleanTopic = (t) => ({
  id: t.id || uid(),
  title: (t.title || '').trim(),
  completed: !!t.completed,
});

export const useLearningStore = create((set, get) => ({
  items: [],
  logs: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [items, logs] = await Promise.all([
        readJSON(FILES.learning, []),
        readJSON(FILES.learningLogs, []),
      ]);
      set({
        items: Array.isArray(items) ? items : [],
        logs: Array.isArray(logs) ? logs : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[learning] load failed', err);
      set({ error: err.message || 'Failed to load learning items', loading: false });
    }
  },

  addItem: async (input) => {
    const t = learningTypeMeta(input.type || 'course');
    const item = {
      id: uid(),
      title: input.title.trim(),
      type: input.type || 'course',
      platform: (input.platform || '').trim(),
      url: (input.url || '').trim(),
      author: (input.author || '').trim(),
      topics: (input.topics || [])
        .filter((tp) => tp.title && tp.title.trim())
        .map(cleanTopic),
      status: 'active',
      color: input.color || t.color,
      icon: input.icon || t.icon,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const next = [...get().items, item];
    set({ items: next });
    await persistItems(next, set);
    return item;
  },

  updateItem: async (id, patch) => {
    const next = get().items.map((it) => {
      if (it.id !== id) return it;
      const merged = { ...it, ...patch };
      if (patch.topics) {
        merged.topics = patch.topics
          .filter((tp) => tp.title && tp.title.trim())
          .map(cleanTopic);
      }
      return merged;
    });
    set({ items: next });
    await persistItems(next, set);
  },

  deleteItem: async (id) => {
    const items = get().items.filter((it) => it.id !== id);
    const logs = get().logs.filter((l) => l.itemId !== id);
    set({ items, logs });
    await Promise.all([
      writeJSON(FILES.learning, items),
      writeJSON(FILES.learningLogs, logs),
    ]);
  },

  toggleTopic: async (itemId, topicId) => {
    const next = get().items.map((it) => {
      if (it.id !== itemId) return it;
      const topics = it.topics.map((tp) =>
        tp.id === topicId ? { ...tp, completed: !tp.completed } : tp
      );
      const allDone = topics.length > 0 && topics.every((tp) => tp.completed);
      return {
        ...it,
        topics,
        status: allDone ? 'completed' : it.status === 'completed' ? 'active' : it.status,
        completedAt:
          allDone && !it.completedAt
            ? new Date().toISOString()
            : !allDone
              ? null
              : it.completedAt,
      };
    });
    set({ items: next });
    await persistItems(next, set);
  },

  logSession: async (itemId, minutes, topicsCompleted = 0) => {
    const log = {
      id: uid(),
      itemId,
      date: todayKey(),
      minutes: Math.max(0, Math.round(minutes)),
      topicsCompleted: Math.max(0, Math.round(topicsCompleted)),
      createdAt: new Date().toISOString(),
    };
    const next = [...get().logs, log];
    set({ logs: next });
    await persistLogs(next, set);
    return log;
  },
}));

async function persistItems(items, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.learning, items);
    set({ saving: false });
  } catch (err) {
    console.error('[learning] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save learning' });
  }
}

async function persistLogs(logs, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.learningLogs, logs);
    set({ saving: false });
  } catch (err) {
    console.error('[learning] save logs failed', err);
    set({ saving: false, error: err.message || 'Failed to save learning logs' });
  }
}

// ---------- pure helpers ----------

export function itemProgress(item) {
  const total = item.topics?.length || 0;
  if (total === 0) return { done: 0, total: 0, percent: item.status === 'completed' ? 100 : 0 };
  const done = item.topics.filter((t) => t.completed).length;
  return { done, total, percent: (done / total) * 100 };
}

export function studyStreak(logs) {
  // Distinct dates only — multiple sessions per day count once
  const dates = Array.from(new Set(logs.map((l) => l.date)));
  return computeStreak(dates);
}

export function totalMinutes(logs, dateFilter) {
  return logs
    .filter((l) => (dateFilter ? dateFilter(l.date) : true))
    .reduce((s, l) => s + l.minutes, 0);
}

export function lastStudiedFor(logs, itemId) {
  const dates = logs
    .filter((l) => l.itemId === itemId)
    .map((l) => l.date)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}
