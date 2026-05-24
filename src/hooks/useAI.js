import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isAIAvailable,
  motivationalQuote,
  reflectionPrompt,
  goalRoadmap,
  parseUPISMS,
  expenseInsights,
  studyNextMission,
  habitSuggestions,
  quitStrategy,
  weeklySummary,
} from '../ai/claude.js';

const todayKey = () => new Date().toISOString().slice(0, 10);
const cacheRead = (k) => {
  if (!k) return null;
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const cacheWrite = (k, v) => {
  if (!k) return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota / private mode — ignore */
  }
};

/**
 * Generic hook for any AI call. Returns { data, loading, error, run, available }.
 * `run(args)` triggers the call; `data` updates on success.
 *
 * @param {(args: any) => Promise<any>} fn — one of the helpers from ai/claude.js
 * @param {object} [opts]
 * @param {boolean} [opts.auto]     — call once on mount with `initialArgs`
 * @param {any}     [opts.initialArgs] — passed to fn() when auto is true
 * @param {string}  [opts.cacheKey] — if set, result is cached in localStorage
 *                                    under this key. Auto-fire is skipped when
 *                                    a cached value exists. Use a date-scoped
 *                                    key (e.g. `quote:2026-05-23`) for daily reuse.
 */
export function useAI(fn, { auto = false, initialArgs, cacheKey } = {}) {
  const [data, setData] = useState(() => cacheRead(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (args) => {
      if (!isAIAvailable()) {
        setError('AI not configured — VITE_GEMINI_PROXY_URL is missing from this build');
        return null;
      }
      if (inFlight.current) return null;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await fn(args);
        if (result === null || result === undefined) {
          setError('AI returned no result — check the browser console');
          return null;
        }
        setData(result);
        cacheWrite(cacheKey, result);
        return result;
      } catch (err) {
        setError(err.message || String(err));
        return null;
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [fn, cacheKey]
  );

  useEffect(() => {
    // Auto-fire only when explicitly requested AND we don't already have data
    // (either from a previous run this session or from the cache).
    if (auto && data === null) {
      run(initialArgs);
    }
    // Only fire once on mount; do NOT include `run` (callback identity churns).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { data, loading, error, run, available: isAIAvailable() };
}

// Convenience pre-bound hooks ---------------------------------------------

// Motivational quote & reflection prompt are cached by date — one AI call per
// day each, instead of one per Dashboard / Journal mount. Saves a LOT of quota.
export const useMotivationalQuote = (args, opts) =>
  useAI(motivationalQuote, {
    auto: true,
    initialArgs: args,
    cacheKey: `nl-ai:quote:${todayKey()}`,
    ...opts,
  });

export const useReflectionPrompt = (args, opts) =>
  useAI(reflectionPrompt, {
    auto: true,
    initialArgs: args,
    cacheKey: `nl-ai:reflection:${todayKey()}`,
    ...opts,
  });

export const useGoalRoadmap = (opts) => useAI(goalRoadmap, opts);
export const useUPIParser = (opts) => useAI(parseUPISMS, opts);
export const useExpenseInsights = (opts) => useAI(expenseInsights, opts);
export const useStudyNextMission = (opts) => useAI(studyNextMission, opts);
export const useHabitSuggestions = (opts) => useAI(habitSuggestions, opts);
export const useQuitStrategy = (opts) => useAI(quitStrategy, opts);
export const useWeeklySummary = (opts) => useAI(weeklySummary, opts);
