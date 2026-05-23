import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard.jsx';
import OrbitSpinner from '../ui/OrbitSpinner.jsx';
import {
  EXPENSE_CATEGORIES,
  categoryMeta,
  formatINR,
} from '../../store/useExpensesStore.js';
import { todayKey, shortLabel } from '../../utils/dateHelpers.js';

/**
 * Renders pending UPI transactions from the polling hook.
 *
 * Each pending entry shows:
 *   - parsed amount + merchant + category (editable)
 *   - the raw SMS body (collapsed by default)
 *   - Confirm (calls onConfirm with final values) / Reject (calls onReject)
 *
 * @param {Array}    pending     — from useUPIPolling().pending
 * @param {boolean}  polling     — show polling indicator
 * @param {string}   error       — show error banner
 * @param {Function} onConfirm   — async (entry, overrides) => void
 * @param {Function} onReject    — async (id) => void
 * @param {Function} onRefresh   — manual poll
 * @param {boolean}  configured  — is the worker URL set
 */
export default function PendingUPITray({
  pending = [],
  polling = false,
  error,
  onConfirm,
  onReject,
  onRefresh,
  configured = false,
  lastPolled,
}) {
  if (!configured) {
    return (
      <GlassCard hover={false} className="border-white/5">
        <div className="flex items-start gap-3">
          <span className="font-display text-xl text-slate-500">⏳</span>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              UPI Auto-Import
            </div>
            <div className="mt-1 text-sm text-slate-300">Not configured yet.</div>
            <div className="mt-1 text-xs text-slate-500">
              Set <code>VITE_UPI_API_URL</code> and{' '}
              <code>VITE_UPI_API_SECRET</code> in your <code>.env</code> after
              deploying the Cloudflare Worker.
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      hover={false}
      className={`relative overflow-hidden border-nebula-cyan/30 ${
        pending.length > 0 ? 'animate-pulse-glow' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl text-nebula-cyan">⚡</span>
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Pending UPI
          </h2>
          {pending.length > 0 && (
            <motion.span
              key={pending.length}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full border border-nebula-cyan/60 bg-nebula-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-nebula-cyan shadow-glow-cyan"
            >
              {pending.length}
            </motion.span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={polling}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300 hover:text-nebula-cyan disabled:opacity-50"
        >
          {polling ? 'Polling…' : '↻'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-nebula-red/40 bg-nebula-red/10 px-3 py-2 text-xs text-nebula-red">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">
          No pending transactions.{' '}
          {lastPolled && (
            <span className="text-[10px] uppercase tracking-widest text-slate-600">
              Last check: {lastPolled.toLocaleTimeString()}
            </span>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {pending.map((entry) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <PendingRow
                  entry={entry}
                  onConfirm={onConfirm}
                  onReject={onReject}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </GlassCard>
  );
}

function PendingRow({ entry, onConfirm, onReject }) {
  const parsed = entry.parsed || {};
  const parsedAmount = Number(parsed.amount) || 0;
  const parsedMerchant = parsed.merchant || '';
  const parsedDate = parsed.date || todayKey();

  // Category is the ONE thing the user actually picks. Defaults to parsed guess.
  const [category, setCategory] = useState(parsed.category || 'others');
  // Re-sync category once parse arrives
  if (parsed.category && category === 'others' && !entry._catHydrated) {
    entry._catHydrated = true;
    setCategory(parsed.category);
  }

  // Manual amount override — only shown if parser couldn't extract one
  const [manualAmount, setManualAmount] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  const cat = categoryMeta(category);
  const isCredit = parsed.type === 'credit';
  const amount = parsedAmount || Number(manualAmount) || 0;
  const needsManualAmount = parsedAmount === 0 && !entry.parsing;

  const confirm = async () => {
    if (!amount || amount <= 0) return;
    await onConfirm(entry, {
      amount,
      merchant: parsedMerchant,
      category,
      date: parsedDate,
      type: parsed.type || 'debit',
    });
  };

  const reject = () => onReject(entry.id);

  return (
    <div
      className="rounded-xl border border-white/5 bg-black/20 p-3"
      style={{ borderLeft: `3px solid ${cat.color}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{
            background: `${cat.color}22`,
            border: `1px solid ${cat.color}55`,
          }}
        >
          {cat.icon}
        </span>
        <div className="min-w-0 flex-1">
          {/* Header: sender + date + status badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {entry.sender || 'SMS'} · {shortLabel(parsedDate)}
            </span>
            {isCredit && (
              <span className="rounded-full border border-nebula-green/50 bg-nebula-green/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-nebula-green">
                Credit
              </span>
            )}
            {entry.parsing && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-nebula-cyan">
                <OrbitSpinner size={10} /> Parsing
              </span>
            )}
          </div>

          {/* Big amount + merchant — read-only display */}
          <div className="mt-1.5 flex items-baseline gap-3">
            <span
              className={`font-display text-3xl ${
                parsedAmount > 0 ? 'text-slate-100' : 'text-slate-500'
              }`}
            >
              {parsedAmount > 0 ? formatINR(parsedAmount) : '—'}
            </span>
            {parsedMerchant && (
              <span className="truncate text-sm text-slate-300">
                {parsedMerchant}
              </span>
            )}
          </div>

          {/* Manual amount fallback — only when parse failed */}
          {needsManualAmount && (
            <div className="mt-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-nebula-red">
                  Couldn't read amount — enter it manually
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="Amount in ₹"
                  className="mt-1 w-full rounded-lg border border-nebula-red/40 bg-black/30 px-2 py-1 text-sm text-slate-100 outline-none focus:border-nebula-cyan/60"
                />
              </label>
            </div>
          )}

          {/* Category — the only thing you actually pick */}
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              Where did you spend this?
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-widest transition ${
                    category === c.id
                      ? 'text-white'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-100'
                  }`}
                  style={
                    category === c.id
                      ? {
                          borderColor: `${c.color}99`,
                          background: `${c.color}22`,
                        }
                      : undefined
                  }
                >
                  <span>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Raw SMS peek */}
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300"
          >
            {showRaw ? '↑ Hide SMS' : '↓ Show raw SMS'}
          </button>
          {showRaw && (
            <div className="mt-1 whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-[11px] text-slate-400">
              {entry.body}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirm}
              disabled={!amount || amount <= 0}
              className="flex-1 rounded-lg border border-nebula-green/50 bg-nebula-green/15 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-nebula-green transition hover:bg-nebula-green/25 disabled:opacity-50"
            >
              {isCredit
                ? `Log credit ${amount ? formatINR(amount) : ''}`
                : `Confirm ${amount ? formatINR(amount) : ''}`}
            </button>
            <button
              onClick={reject}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-nebula-red/40 hover:text-nebula-red"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
