import { useCallback, useEffect, useRef, useState } from 'react';
import { parseUPISMS } from '../ai/claude.js';

const API_URL = import.meta.env.VITE_UPI_API_URL;
const API_SECRET = import.meta.env.VITE_UPI_API_SECRET;

export function isUPIConfigured() {
  return (
    Boolean(API_URL) &&
    !API_URL.includes('placeholder') &&
    Boolean(API_SECRET) &&
    API_SECRET !== 'placeholder'
  );
}

const headers = () => ({
  'X-API-Secret': API_SECRET || '',
});

async function fetchPending() {
  const res = await fetch(`${API_URL}/sms`, { headers: headers() });
  if (!res.ok) throw new Error(`UPI fetch failed: ${res.status}`);
  return res.json();
}

async function deletePending(id) {
  await fetch(`${API_URL}/sms/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
}

/**
 * Poll the UPI Cloudflare Worker for pending SMS entries.
 *
 * Each entry gets parsed by Claude on arrival and surfaced with the parsed
 * fields. The caller (Expenses page) reads `pending` and calls
 * `confirm(entry, overrides)` or `reject(id)`.
 *
 * Pending shape per entry:
 *   { id, body, sender, receivedAt, parsing, parsed, parseError }
 */
export function useUPIPolling({ enabled = true, intervalMs = 60_000 } = {}) {
  const [pending, setPending] = useState([]); // array of enriched entries
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [lastPolled, setLastPolled] = useState(null);

  // Track which IDs we've already attempted to parse so we don't double-parse
  const parsedIds = useRef(new Set());
  // Track IDs the user dismissed locally (so they don't reappear during the
  // brief window between DELETE call and the next poll)
  const dismissedIds = useRef(new Set());
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isUPIConfigured()) return;
    if (polling) return;
    setPolling(true);
    setError(null);
    try {
      const { entries } = await fetchPending();
      const visible = entries.filter((e) => !dismissedIds.current.has(e.id));

      // Merge: keep existing parsed data for entries we've seen
      setPending((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        return visible.map((e) => {
          const existing = byId.get(e.id);
          if (existing) return existing;
          return { ...e, parsing: false, parsed: null, parseError: null };
        });
      });
      setLastPolled(new Date());

      // Trigger parse for any new entry (regex fallback runs even without AI)
      for (const entry of visible) {
        if (parsedIds.current.has(entry.id)) continue;
        parsedIds.current.add(entry.id);
        // Fire and forget — UI will update when each one resolves
        (async () => {
          setPending((prev) =>
            prev.map((p) => (p.id === entry.id ? { ...p, parsing: true } : p))
          );
          try {
            const parsed = await parseUPISMS(entry.body);
            if (!mountedRef.current) return;
            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id
                  ? { ...p, parsing: false, parsed, parseError: parsed ? null : 'parse failed' }
                  : p
              )
            );
          } catch (err) {
            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id
                  ? { ...p, parsing: false, parseError: err.message || String(err) }
                  : p
              )
            );
          }
        })();
      }
    } catch (err) {
      console.error('[upi] poll failed', err);
      setError(err.message || String(err));
    } finally {
      setPolling(false);
    }
  }, [polling]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !isUPIConfigured()) return;
    poll();
    const t = setInterval(poll, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  /**
   * Remove from worker + from local state. Caller is responsible for actually
   * adding to expenses (we don't want this hook to know about the expenses store).
   */
  const confirm = useCallback(async (id) => {
    dismissedIds.current.add(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePending(id);
    } catch (err) {
      console.error('[upi] delete failed', err);
    }
  }, []);

  const reject = confirm; // identical mechanics — just drop the entry

  return {
    pending,
    polling,
    error,
    lastPolled,
    configured: isUPIConfigured(),
    refresh: poll,
    confirm,
    reject,
  };
}
