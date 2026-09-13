import { create } from 'zustand';
import { currentUser, safeMessage } from '../lib/userData.js';

const CATEGORY_COLORS = { career: '#d29922', health: '#39ff14', learning: '#00cc44', financial: '#5eead4', personal: '#f85149' };
const uid = () => crypto.randomUUID();
const cleanMilestone = (m) => ({ id: m.id || uid(), title: (m.title || '').trim(), completed: !!m.completed, completedAt: m.completedAt || null });
const fromGoal = (g, milestones) => ({ id: g.id, title: g.title, description: g.description || '', category: g.category || 'personal', color: CATEGORY_COLORS[g.category] || '#39ff14', targetDate: g.target_date, status: g.status, milestones, createdAt: g.created_at, completedAt: g.status === 'completed' ? g.updated_at : null, roadmap: null });
const fromMilestone = (m) => ({ id: m.id, title: m.title, completed: m.completed, completedAt: m.completed_at });

export const useGoalsStore = create((set, get) => ({
  goals: [], loaded: false, loading: false, saving: false, error: null,

  load: async () => {
    if (get().loading) return; set({ loading: true, error: null });
    try { const { client, user } = await currentUser(); const [goals, milestones] = await Promise.all([client.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }), client.from('milestones').select('*').eq('user_id', user.id)]); if (goals.error) throw goals.error; if (milestones.error) throw milestones.error; const ms = milestones.data || []; set({ goals: (goals.data || []).map((g) => fromGoal(g, ms.filter((m) => m.goal_id === g.id).map(fromMilestone))), loaded: true, loading: false }); }
    catch (error) { set({ loading: false, error: safeMessage(error, 'Unable to load your goals.') }); }
  },

  addGoal: async (input) => {
    const goal = { id: uid(), title: input.title.trim(), description: (input.description || '').trim(), category: input.category || 'personal', color: input.color || CATEGORY_COLORS[input.category] || '#39ff14', targetDate: input.targetDate || null, status: 'active', milestones: (input.milestones || []).filter((m) => m.title?.trim()).map(cleanMilestone), createdAt: new Date().toISOString(), completedAt: null, roadmap: null };
    try { const { client, user } = await currentUser(); const { data, error } = await client.from('goals').insert({ id: goal.id, user_id: user.id, title: goal.title, description: goal.description, category: goal.category, target_date: goal.targetDate, status: goal.status }).select('*').single(); if (error) throw error; if (goal.milestones.length) { const { error: milestoneError } = await client.from('milestones').insert(goal.milestones.map((m) => ({ id: m.id, user_id: user.id, goal_id: goal.id, title: m.title, completed: m.completed, completed_at: m.completedAt }))); if (milestoneError) throw milestoneError; } const saved = fromGoal(data, goal.milestones); set({ goals: [...get().goals, saved] }); return saved; }
    catch (error) { set({ error: safeMessage(error, 'Unable to save your goal.') }); throw error; }
  },

  updateGoal: async (id, patch) => {
    try { const { client, user } = await currentUser(); const dbPatch = {}; if (patch.title !== undefined) dbPatch.title = patch.title; if (patch.description !== undefined) dbPatch.description = patch.description; if (patch.category !== undefined) dbPatch.category = patch.category; if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate; if (patch.status !== undefined) dbPatch.status = patch.status; if (Object.keys(dbPatch).length) { const { error } = await client.from('goals').update(dbPatch).eq('id', id).eq('user_id', user.id); if (error) throw error; } let milestones = get().goals.find((g) => g.id === id)?.milestones || []; if (patch.milestones) { milestones = patch.milestones.filter((m) => m.title?.trim()).map(cleanMilestone); const { error: removeError } = await client.from('milestones').delete().eq('goal_id', id).eq('user_id', user.id); if (removeError) throw removeError; if (milestones.length) { const { error: insertError } = await client.from('milestones').insert(milestones.map((m) => ({ id: m.id, user_id: user.id, goal_id: id, title: m.title, completed: m.completed, completed_at: m.completedAt }))); if (insertError) throw insertError; } } set({ goals: get().goals.map((g) => g.id === id ? { ...g, ...patch, milestones } : g) }); }
    catch (error) { set({ error: safeMessage(error, 'Unable to save your goal.') }); }
  },

  deleteGoal: async (id) => { try { const { client, user } = await currentUser(); const { error } = await client.from('goals').delete().eq('id', id).eq('user_id', user.id); if (error) throw error; set({ goals: get().goals.filter((g) => g.id !== id) }); } catch (error) { set({ error: safeMessage(error, 'Unable to delete your goal.') }); } },

  toggleMilestone: async (goalId, milestoneId) => { const goal = get().goals.find((g) => g.id === goalId); const milestone = goal?.milestones.find((m) => m.id === milestoneId); if (!goal || !milestone) return; const completed = !milestone.completed; const completedAt = completed ? new Date().toISOString() : null; try { const { client, user } = await currentUser(); const { error } = await client.from('milestones').update({ completed, completed_at: completedAt }).eq('id', milestoneId).eq('user_id', user.id); if (error) throw error; const milestones = goal.milestones.map((m) => m.id === milestoneId ? { ...m, completed, completedAt } : m); const allDone = milestones.length > 0 && milestones.every((m) => m.completed); const status = allDone ? 'completed' : goal.status === 'completed' ? 'active' : goal.status; if (status !== goal.status) await client.from('goals').update({ status }).eq('id', goalId).eq('user_id', user.id); set({ goals: get().goals.map((g) => g.id === goalId ? { ...g, milestones, status, completedAt: status === 'completed' ? g.completedAt || completedAt : null } : g) }); } catch (error) { set({ error: safeMessage(error, 'Unable to update your milestone.') }); } },
  markComplete: async (id) => get().updateGoal(id, { status: 'completed', completedAt: new Date().toISOString() }),
  reopen: async (id) => get().updateGoal(id, { status: 'active', completedAt: null }),
  abandon: async (id) => get().updateGoal(id, { status: 'abandoned' }),
  setRoadmap: async (id, roadmap) => get().updateGoal(id, { roadmap }),
}));

export const GOAL_CATEGORIES = Object.entries(CATEGORY_COLORS).map(([id, color]) => ({ id, label: id[0].toUpperCase() + id.slice(1), color }));
export function goalProgress(goal) { const total = goal.milestones?.length || 0; if (!total) return { done: 0, total: 0, percent: goal.status === 'completed' ? 100 : 0 }; const done = goal.milestones.filter((m) => m.completed).length; return { done, total, percent: (done / total) * 100 }; }
export function daysUntil(targetDate) { if (!targetDate) return null; const [y, m, d] = targetDate.split('-').map(Number); const target = new Date(y, m - 1, d); const now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((target - now) / 86400000); }
export function isOverdue(goal) { if (goal.status !== 'active') return false; const d = daysUntil(goal.targetDate); return d !== null && d < 0; }
