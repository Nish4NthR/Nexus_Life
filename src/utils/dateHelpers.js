/**
 * Date helpers — all keys are local-time YYYY-MM-DD strings.
 * Using local time (not UTC) so "today" matches the user's calendar.
 */

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function parseKey(key) {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Returns an array of last `n` date keys, oldest first. */
export function lastNDays(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(dateKey(addDays(today, -i)));
  }
  return out;
}

/** Day difference between two YYYY-MM-DD keys (a - b in days). */
export function diffDays(a, b) {
  const ms = parseKey(a).getTime() - parseKey(b).getTime();
  return Math.round(ms / 86400000);
}

/** Human-readable like "May 22" */
export function shortLabel(key) {
  const d = parseKey(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format minutes as "1h 24m" or "24m". */
export function formatMinutes(mins) {
  if (!mins || mins < 1) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
