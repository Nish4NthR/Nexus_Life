/**
 * Last-month CSV exporter for the Analytics page.
 *
 * Builds a single CSV file with stacked sections (Habits / Expenses / Goals /
 * Learning / Bad Habits / Mood / Journal) covering the **previous** calendar
 * month. The file opens cleanly in Excel and Google Sheets.
 *
 * No runtime dependencies — pure string building + Blob download.
 */

import { dateKey, parseKey, formatMinutes } from './dateHelpers.js';

/** Quote a single CSV cell. Handles commas, quotes, and newlines per RFC 4180. */
function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells) {
  return cells.map(csvCell).join(',');
}

/**
 * { year, month (1-12), label "May 2026", firstKey, lastKey, daysInMonth }
 * for the calendar month immediately before today.
 */
export function lastMonthRange(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11; "last month" is m-1
  const lastDay = new Date(y, m, 0); // day 0 of current = last day of previous
  const firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return {
    year: lastDay.getFullYear(),
    month: lastDay.getMonth() + 1,
    label: `${monthNames[lastDay.getMonth()]} ${lastDay.getFullYear()}`,
    firstKey: dateKey(firstDay),
    lastKey: dateKey(lastDay),
    daysInMonth: lastDay.getDate(),
  };
}

const inRange = (key, firstKey, lastKey) =>
  typeof key === 'string' && key >= firstKey && key <= lastKey;

/**
 * Build the full CSV string for the previous calendar month.
 *
 * @param {object} data
 * @param {Array}  data.habits
 * @param {Array}  data.habitLogs
 * @param {Array}  data.expenses
 * @param {Array}  data.expenseCategories — [{ id, label }]
 * @param {Array}  data.goals
 * @param {Array}  data.learningItems
 * @param {Array}  data.learningLogs
 * @param {Array}  data.learningTypes — [{ id, label }]
 * @param {Array}  data.badHabits
 * @param {Array}  data.moods
 * @param {Array}  data.moodMeta — [{ id, label, value }]
 * @param {Array}  data.journalEntries
 */
export function buildMonthlyReportCSV(data) {
  const range = lastMonthRange();
  const lines = [];

  const section = (title) => {
    if (lines.length) lines.push('');
    lines.push(csvRow([title]));
  };

  // Header
  lines.push(csvRow(['NexusLife monthly report']));
  lines.push(csvRow(['Period', range.label]));
  lines.push(csvRow(['From', range.firstKey, 'To', range.lastKey]));
  lines.push(csvRow(['Generated', dateKey(new Date())]));

  // --- Habits ---
  section('HABITS');
  lines.push(csvRow(['Habit', 'Category', 'Completions', 'Days in month', 'Completion %']));
  const activeHabits = (data.habits || []).filter((h) => !h.archived);
  for (const h of activeHabits) {
    const count = (data.habitLogs || []).filter(
      (l) => l.habitId === h.id && inRange(l.date, range.firstKey, range.lastKey)
    ).length;
    const pct = Math.round((count / range.daysInMonth) * 100);
    lines.push(csvRow([h.name, h.category || '', count, range.daysInMonth, `${pct}%`]));
  }

  // --- Expenses ---
  section('EXPENSES — TOTALS BY CATEGORY (INR)');
  lines.push(csvRow(['Category', 'Total', 'Entries']));
  const monthExpenses = (data.expenses || []).filter((e) =>
    inRange(e.date, range.firstKey, range.lastKey)
  );
  const byCat = {};
  for (const e of monthExpenses) {
    const k = e.category || 'others';
    byCat[k] = byCat[k] || { total: 0, count: 0 };
    byCat[k].total += Number(e.amount) || 0;
    byCat[k].count += 1;
  }
  const catLabel = (id) =>
    (data.expenseCategories || []).find((c) => c.id === id)?.label || id;
  let monthTotal = 0;
  for (const [id, agg] of Object.entries(byCat)) {
    monthTotal += agg.total;
    lines.push(csvRow([catLabel(id), Math.round(agg.total), agg.count]));
  }
  lines.push(csvRow(['TOTAL', Math.round(monthTotal), monthExpenses.length]));

  section('EXPENSES — ALL ENTRIES');
  lines.push(csvRow(['Date', 'Category', 'Amount (INR)', 'Merchant', 'Note']));
  const sorted = [...monthExpenses].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    lines.push(csvRow([
      e.date,
      catLabel(e.category),
      Math.round(Number(e.amount) || 0),
      e.merchant || '',
      e.note || '',
    ]));
  }

  // --- Goals ---
  section('GOALS — SNAPSHOT');
  lines.push(csvRow(['Title', 'Category', 'Status', 'Progress %', 'Target date']));
  for (const g of data.goals || []) {
    const milestones = g.milestones || [];
    const done = milestones.filter((m) => m.completed).length;
    const pct = milestones.length
      ? Math.round((done / milestones.length) * 100)
      : g.status === 'completed' ? 100 : 0;
    lines.push(csvRow([
      g.title || '',
      g.category || '',
      g.status || 'active',
      `${pct}%`,
      g.targetDate || '',
    ]));
  }

  // --- Learning ---
  section('LEARNING — MINUTES BY ITEM');
  lines.push(csvRow(['Item', 'Type', 'Minutes (month)', 'Sessions (month)', 'Status']));
  const typeLabel = (id) =>
    (data.learningTypes || []).find((t) => t.id === id)?.label || id;
  for (const it of data.learningItems || []) {
    const myLogs = (data.learningLogs || []).filter(
      (l) => l.itemId === it.id && inRange(l.date, range.firstKey, range.lastKey)
    );
    const mins = myLogs.reduce((a, l) => a + (Number(l.minutes) || 0), 0);
    lines.push(csvRow([
      it.title || '',
      typeLabel(it.type),
      mins,
      myLogs.length,
      it.status || 'active',
    ]));
  }

  const totalLearnMin = (data.learningLogs || [])
    .filter((l) => inRange(l.date, range.firstKey, range.lastKey))
    .reduce((a, l) => a + (Number(l.minutes) || 0), 0);
  lines.push(csvRow(['TOTAL', '', totalLearnMin, '', formatMinutes(totalLearnMin)]));

  // --- Bad habits ---
  section('BAD HABITS — DAYS CLEAN AT MONTH END');
  lines.push(csvRow(['Name', 'Started', 'Days clean (month end)', 'Relapses in month']));
  const monthEnd = parseKey(range.lastKey);
  for (const b of data.badHabits || []) {
    // Anchor = max(startedAt, last relapse on or before month-end). If anchor
    // is after month-end, the habit hadn't started — show "".
    const relapseDates = (b.relapses || []).map((r) => r.date).filter(Boolean);
    const relapsesOnOrBefore = relapseDates.filter((d) => d <= range.lastKey);
    const lastReset = relapsesOnOrBefore.length
      ? relapsesOnOrBefore.reduce((a, d) => (d > a ? d : a))
      : null;
    const anchor =
      lastReset && b.startedAt
        ? (lastReset > b.startedAt ? lastReset : b.startedAt)
        : (lastReset || b.startedAt || null);
    let days = '';
    if (anchor && anchor <= range.lastKey) {
      const a = parseKey(anchor);
      days = Math.max(0, Math.round((monthEnd - a) / 86400000));
    }
    const relapsesInMonth = relapseDates.filter(
      (d) => inRange(d, range.firstKey, range.lastKey)
    ).length;
    lines.push(csvRow([
      b.name || '',
      b.startedAt || '',
      days,
      relapsesInMonth,
    ]));
  }

  // --- Mood ---
  section('MOOD — ENTRIES');
  lines.push(csvRow(['Date', 'Mood', 'Score (1-5)']));
  const moodScore = (id) =>
    (data.moodMeta || []).find((m) => m.id === id)?.value ?? '';
  const moodName = (id) =>
    (data.moodMeta || []).find((m) => m.id === id)?.label ?? id;
  const monthMoods = (data.moods || [])
    .filter((m) => inRange(m.date, range.firstKey, range.lastKey))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const m of monthMoods) {
    lines.push(csvRow([m.date, moodName(m.mood), moodScore(m.mood)]));
  }

  // --- Journal ---
  section('JOURNAL — ENTRIES');
  lines.push(csvRow(['Date', 'Body']));
  const monthJournal = (data.journalEntries || [])
    .filter((e) => inRange(e.date, range.firstKey, range.lastKey))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const e of monthJournal) {
    lines.push(csvRow([e.date, e.body || '']));
  }

  return { csv: lines.join('\r\n'), range };
}

/** Trigger a browser download of the given CSV string. */
export function downloadCSV(filename, csv) {
  // Prepend UTF-8 BOM so Excel detects encoding and renders ₹/non-ASCII correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
