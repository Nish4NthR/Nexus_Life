import { todayKey, yesterdayKey, diffDays } from './dateHelpers.js';

/**
 * Compute the current streak (consecutive days, ending today or yesterday) for a habit.
 *
 * Rules:
 *   - Streak counts consecutive completed days ending at today.
 *   - If today is NOT yet completed but yesterday WAS, the streak is still "alive"
 *     (we count from yesterday backward). This gives the user grace to log later in the day.
 *   - Any gap of >= 1 missed day before that breaks the streak.
 *
 * @param {string[]} dateKeys  array of YYYY-MM-DD completion dates for one habit (any order)
 * @returns {number} streak length in days
 */
export function computeStreak(dateKeys) {
  if (!dateKeys || dateKeys.length === 0) return 0;

  const set = new Set(dateKeys);
  const today = todayKey();
  const yest = yesterdayKey();

  let anchor;
  if (set.has(today)) anchor = today;
  else if (set.has(yest)) anchor = yest;
  else return 0;

  let streak = 0;
  let cursor = anchor;
  while (set.has(cursor)) {
    streak++;
    // step back one day
    const [y, m, d] = cursor.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    cursor = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
      prev.getDate()
    ).padStart(2, '0')}`;
  }
  return streak;
}

/** True if there's a completion entry for today. */
export function isCompletedToday(dateKeys) {
  return Array.isArray(dateKeys) && dateKeys.includes(todayKey());
}

/**
 * Compute the longest historical streak ever achieved.
 */
export function computeLongestStreak(dateKeys) {
  if (!dateKeys || dateKeys.length === 0) return 0;
  const sorted = [...new Set(dateKeys)].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i], sorted[i - 1]) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}
