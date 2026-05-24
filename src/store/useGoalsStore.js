import { create } from 'zustand';
import { readJSON, writeJSON, FILES } from '../drive/driveClient.js';

/**
 * Goal shape:
 *   {
 *     id, title, description, category,
 *     targetDate: 'YYYY-MM-DD' | null,
 *     status: 'active' | 'completed' | 'abandoned',
 *     milestones: [{ id, title, completed, completedAt }],
 *     createdAt, completedAt?, roadmap: string|null
 *   }
 */

const CATEGORY_COLORS = {
  career: '#F59E0B',
  health: '#238636',
  learning: '#79c0ff',
  financial: '#58a6ff',
  personal: '#EF4444',
};

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const cleanMilestone = (m) => ({
  id: m.id || uid(),
  title: (m.title || '').trim(),
  completed: !!m.completed,
  completedAt: m.completedAt || null,
});

export const useGoalsStore = create((set, get) => ({
  goals: [],
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  // ---------- load ----------
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const goals = await readJSON(FILES.goals, []);
      set({
        goals: Array.isArray(goals) ? goals : [],
        loaded: true,
        loading: false,
      });
    } catch (err) {
      console.error('[goals] load failed', err);
      set({ error: err.message || 'Failed to load goals', loading: false });
    }
  },

  // ---------- mutations ----------
  addGoal: async (input) => {
    const now = new Date().toISOString();
    const milestones = (input.milestones || [])
      .filter((m) => m.title && m.title.trim())
      .map(cleanMilestone);

    const goal = {
      id: uid(),
      title: input.title.trim(),
      description: (input.description || '').trim(),
      category: input.category || 'personal',
      color: input.color || CATEGORY_COLORS[input.category] || '#58a6ff',
      targetDate: input.targetDate || null,
      status: 'active',
      milestones,
      createdAt: now,
      completedAt: null,
      roadmap: null,
    };
    const next = [...get().goals, goal];
    set({ goals: next });
    await persist(next, set);
    return goal;
  },

  updateGoal: async (id, patch) => {
    const next = get().goals.map((g) => {
      if (g.id !== id) return g;
      const merged = { ...g, ...patch };
      // Re-clean milestones if they're being patched in
      if (patch.milestones) {
        merged.milestones = patch.milestones
          .filter((m) => m.title && m.title.trim())
          .map(cleanMilestone);
      }
      return merged;
    });
    set({ goals: next });
    await persist(next, set);
  },

  deleteGoal: async (id) => {
    const next = get().goals.filter((g) => g.id !== id);
    set({ goals: next });
    await persist(next, set);
  },

  toggleMilestone: async (goalId, milestoneId) => {
    const now = new Date().toISOString();
    const next = get().goals.map((g) => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map((m) => {
        if (m.id !== milestoneId) return m;
        const completed = !m.completed;
        return {
          ...m,
          completed,
          completedAt: completed ? now : null,
        };
      });
      // Auto-complete the goal if all milestones are done
      const allDone =
        milestones.length > 0 && milestones.every((m) => m.completed);
      const status =
        g.status === 'completed' && !allDone
          ? 'active'
          : allDone
            ? 'completed'
            : g.status;
      return {
        ...g,
        milestones,
        status,
        completedAt: status === 'completed' ? g.completedAt || now : null,
      };
    });
    set({ goals: next });
    await persist(next, set);
  },

  markComplete: async (id) => {
    const now = new Date().toISOString();
    await get().updateGoal(id, { status: 'completed', completedAt: now });
  },

  reopen: async (id) => {
    await get().updateGoal(id, { status: 'active', completedAt: null });
  },

  abandon: async (id) => {
    await get().updateGoal(id, { status: 'abandoned' });
  },

  setRoadmap: async (id, roadmap) => {
    await get().updateGoal(id, { roadmap });
  },
}));

async function persist(goals, set) {
  set({ saving: true });
  try {
    await writeJSON(FILES.goals, goals);
    set({ saving: false });
  } catch (err) {
    console.error('[goals] save failed', err);
    set({ saving: false, error: err.message || 'Failed to save goals' });
  }
}

export const GOAL_CATEGORIES = [
  { id: 'career', label: 'Career', color: CATEGORY_COLORS.career },
  { id: 'health', label: 'Health', color: CATEGORY_COLORS.health },
  { id: 'learning', label: 'Learning', color: CATEGORY_COLORS.learning },
  { id: 'financial', label: 'Financial', color: CATEGORY_COLORS.financial },
  { id: 'personal', label: 'Personal', color: CATEGORY_COLORS.personal },
];

// ---------- pure helpers (use these from components, not store methods) ----------

export function goalProgress(goal) {
  const total = goal.milestones?.length || 0;
  if (total === 0) return { done: 0, total: 0, percent: goal.status === 'completed' ? 100 : 0 };
  const done = goal.milestones.filter((m) => m.completed).length;
  return { done, total, percent: (done / total) * 100 };
}

export function daysUntil(targetDate) {
  if (!targetDate) return null;
  const [y, m, d] = targetDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function isOverdue(goal) {
  if (goal.status !== 'active') return false;
  const d = daysUntil(goal.targetDate);
  return d !== null && d < 0;
}
