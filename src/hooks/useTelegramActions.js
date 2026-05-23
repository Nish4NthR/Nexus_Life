import { useCallback, useEffect, useRef, useState } from 'react';
import { useHabitsStore } from '../store/useHabitsStore.js';
import { useJournalStore } from '../store/useJournalStore.js';
import { todayKey } from '../utils/dateHelpers.js';

const API_URL = import.meta.env.VITE_TELEGRAM_API_URL;
const API_SECRET = import.meta.env.VITE_TELEGRAM_API_SECRET;

export function isTelegramConfigured() {
  return (
    Boolean(API_URL) &&
    !API_URL.includes('YOUR') &&
    Boolean(API_SECRET) &&
    API_SECRET !== 'placeholder' &&
    API_SECRET !== ''
  );
}

const headers = () => ({ 'X-API-Secret': API_SECRET || '' });

async function fetchQueue() {
  const res = await fetch(`${API_URL}/queue`, { headers: headers() });
  if (!res.ok) throw new Error(`telegram queue fetch failed: ${res.status}`);
  return res.json();
}

async function ackAction(key) {
  await fetch(`${API_URL}/queue/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: headers(),
  });
}

/**
 * Poll the Telegram reminder Worker for queued button taps and apply them
 * to the relevant stores. Designed to be called once at the layout level
 * (top of the tree) so it runs regardless of which page is mounted.
 *
 * Supported actions:
 *   habit:all      — mark every active habit complete for today
 *   mood:<id>      — set today's mood (amazing/good/okay/bad/terrible)
 *   journal:open   — no-op (just a hint to open the app; data lives in app)
 *
 * Actions are deleted from the Worker's KV queue after being applied.
 *
 * Returns { applied, polling, error, lastPolled, configured, refresh }.
 */
export function useTelegramActions({ enabled = true, intervalMs = 120_000 } = {}) {
  const [applied, setApplied] = useState(0);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [lastPolled, setLastPolled] = useState(null);

  // Don't subscribe with selectors — actions only. Calls cause re-renders for
  // every habit log change otherwise, which would feed back into the hook.
  const habitsApi = useHabitsStore;
  const journalApi = useJournalStore;

  const inFlight = useRef(false);
  const mountedRef = useRef(true);

  const applyAction = useCallback(
    async (act) => {
      if (!act?.action) return false;
      const [kind, value] = act.action.split(':');
      const today = todayKey();

      if (kind === 'habit' && value === 'all') {
        // Make sure habits are loaded first
        const st = habitsApi.getState();
        if (!st.loaded) await st.load();
        const fresh = habitsApi.getState();
        const active = fresh.habits.filter((h) => !h.archived);
        const completedToday = new Set(
          fresh.logs.filter((l) => l.date === today).map((l) => l.habitId)
        );
        for (const h of active) {
          if (!completedToday.has(h.id)) {
            // Serialize to avoid clobbering the logs array
            // eslint-disable-next-line no-await-in-loop
            await fresh.toggleLog(h.id, today);
          }
        }
        return true;
      }

      if (kind === 'mood') {
        const validMoods = ['amazing', 'good', 'okay', 'bad', 'terrible'];
        if (!validMoods.includes(value)) return false;
        const st = journalApi.getState();
        if (!st.loaded) await st.load();
        await journalApi.getState().setMood(value, today);
        return true;
      }

      if (kind === 'journal' && value === 'open') {
        // No data side-effect — just a marker. Count it as "applied" so it gets acked.
        return true;
      }

      console.warn('[telegram] unknown action', act.action);
      return false;
    },
    [habitsApi, journalApi]
  );

  const poll = useCallback(async () => {
    if (!isTelegramConfigured()) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setPolling(true);
    setError(null);
    try {
      const { actions } = await fetchQueue();
      let appliedCount = 0;
      for (const act of actions) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await applyAction(act);
        if (ok) {
          // eslint-disable-next-line no-await-in-loop
          await ackAction(act.key);
          appliedCount++;
        }
      }
      if (mountedRef.current && appliedCount > 0) {
        setApplied((n) => n + appliedCount);
      }
      if (mountedRef.current) setLastPolled(new Date());
    } catch (err) {
      console.error('[telegram] poll failed', err);
      if (mountedRef.current) setError(err.message || String(err));
    } finally {
      inFlight.current = false;
      if (mountedRef.current) setPolling(false);
    }
  }, [applyAction]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !isTelegramConfigured()) return;
    poll();
    const t = setInterval(poll, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  return {
    applied,
    polling,
    error,
    lastPolled,
    configured: isTelegramConfigured(),
    refresh: poll,
  };
}
