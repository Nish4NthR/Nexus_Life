/**
 * XP / leveling — RPG-style curve, quadratic so early levels are quick
 * and later levels feel earned.
 *
 *   xpForLevel(L) = 50 * L * (L + 1)   →   L1: 100, L2: 300, L3: 600, L5: 1500, L10: 5500
 *
 * That means total XP needed to GO FROM level L-1 to level L is 100 * L.
 */

export function xpForLevel(level) {
  return 50 * level * (level + 1);
}

export function levelForXP(xp) {
  if (xp < 100) return 0;
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

/**
 * Progress within the current level: { level, xpInLevel, xpToNext, percent }.
 */
export function progressForXP(xp) {
  const level = levelForXP(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpInLevel = xp - base;
  const xpToNext = next - base;
  const percent = xpToNext > 0 ? Math.min(100, (xpInLevel / xpToNext) * 100) : 0;
  return { level, xpInLevel, xpToNext, percent };
}

/** Default XP rewarded for completing a single habit log. */
export const HABIT_XP = 10;

/** XP for a study session: 1 XP per minute, +5 per topic completed. */
export function studySessionXP({ minutes = 0, topicsCompleted = 0 } = {}) {
  return Math.round(minutes) + topicsCompleted * 5;
}
