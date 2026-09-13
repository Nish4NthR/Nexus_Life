import { useHabitsStore } from './useHabitsStore.js';
import { useBadHabitsStore } from './useBadHabitsStore.js';
import { useExpensesStore } from './useExpensesStore.js';
import { useGoalsStore } from './useGoalsStore.js';
import { useLearningStore } from './useLearningStore.js';
import { useJournalStore } from './useJournalStore.js';

export function clearUserData() {
  useHabitsStore.setState({ habits: [], logs: [], loaded: false, error: null });
  useBadHabitsStore.setState({ badHabits: [], loaded: false, error: null });
  useExpensesStore.setState({ expenses: [], budgets: [], loaded: false, error: null });
  useGoalsStore.setState({ goals: [], loaded: false, error: null });
  useLearningStore.setState({ items: [], logs: [], loaded: false, error: null });
  useJournalStore.setState({ entries: [], moods: [], loaded: false, error: null });
}
