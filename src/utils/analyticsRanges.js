/**
 * Named time-range options used by analytics dropdowns and filter pills.
 * Each option resolves to a list of YYYY-MM-DD date keys (oldest first)
 * via `rangeDates(option, allDates)`.
 *
 * `allDates` is only consulted by the 'all' option — for fixed-window ranges
 * (last N days, this/previous year) it's ignored.
 */
import { dateKey, addDays, parseKey } from './dateHelpers.js';

export const RANGE_OPTIONS = [
  { id: '30d',   label: 'Last 30 days',   days: 30  },
  { id: '3m',    label: 'Last 3 months',  days: 90  },
  { id: '6m',    label: 'Last 6 months',  days: 180 },
  { id: '12m',   label: 'Last 12 months', days: 365 },
  { id: 'this',  label: 'This year'                  },
  { id: 'prev',  label: 'Previous year'              },
  { id: 'all',   label: 'All time'                   },
];

/**
 * Smaller set used by the top filter-pill bar.
 * Wraps RANGE_OPTIONS subset so the same `rangeDates` helper works for both.
 */
export const PILL_OPTIONS = [
  { id: '1d',  label: 'Day',     days: 1   },
  { id: '7d',  label: 'Week',    days: 7   },
  { id: '30d', label: 'Month',   days: 30  },
  { id: '6m',  label: '6 Months', days: 180 },
  { id: '12m', label: 'Year',    days: 365 },
  { id: 'all', label: 'All Time'           },
];

/**
 * Resolve a range option ID to an ordered array of date keys.
 * `allDates` (optional, sorted oldest-first) is used only for 'all'
 * to determine the earliest tracked date.
 */
export function rangeDates(id, allDates = []) {
  const today = new Date();
  const opt =
    RANGE_OPTIONS.find((o) => o.id === id) ||
    PILL_OPTIONS.find((o) => o.id === id);

  if (!opt) return [];

  // Fixed-window: last N days ending today.
  if (typeof opt.days === 'number') {
    const out = [];
    for (let i = opt.days - 1; i >= 0; i--) {
      out.push(dateKey(addDays(today, -i)));
    }
    return out;
  }

  if (opt.id === 'this') {
    const start = new Date(today.getFullYear(), 0, 1);
    return enumerate(start, today);
  }
  if (opt.id === 'prev') {
    const y = today.getFullYear() - 1;
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return enumerate(start, end);
  }
  if (opt.id === 'all') {
    if (allDates.length === 0) {
      // Fall back to last 12 months when there's no data yet so the grid
      // still renders something.
      const out = [];
      for (let i = 364; i >= 0; i--) out.push(dateKey(addDays(today, -i)));
      return out;
    }
    const start = parseKey(allDates[0]);
    return enumerate(start, today);
  }
  return [];
}

function enumerate(startDate, endDate) {
  const out = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    out.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Tiny localStorage wrapper for remembering the active filter selection.
 * Falls through silently if storage is unavailable (e.g. private mode).
 */
export function readStoredRange(key, fallbackId) {
  try {
    const val = localStorage.getItem(key);
    if (val) return val;
  } catch {
    // ignore
  }
  return fallbackId;
}

export function writeStoredRange(key, id) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // ignore
  }
}
