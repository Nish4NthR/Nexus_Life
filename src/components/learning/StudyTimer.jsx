import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Built-in study timer with a pulsing nebula ring.
 * Calls onStop(minutes) when the user stops the timer with > 0 elapsed.
 */
export default function StudyTimer({ onStop, color = '#06B6D4' }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const start = () => {
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const stop = () => {
    setRunning(false);
    const mins = Math.round(elapsed / 60);
    if (mins > 0) onStop?.(mins);
    setElapsed(0);
    startRef.current = null;
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    startRef.current = null;
  };

  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const display =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* Pulsing rings while running */}
        {running && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${color}99` }}
              animate={{ scale: [1, 1.25], opacity: [0.55, 0] }}
              transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${color}66` }}
              animate={{ scale: [1, 1.45], opacity: [0.4, 0] }}
              transition={{
                duration: 2.4,
                ease: 'easeOut',
                repeat: Infinity,
                delay: 0.6,
              }}
            />
          </>
        )}

        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid ${color}55`,
            boxShadow: `0 0 24px ${color}55, inset 0 0 24px ${color}22`,
          }}
        />

        <div className="relative text-center">
          <div className="font-display text-4xl text-slate-100" style={{ textShadow: `0 0 14px ${color}aa` }}>
            {display}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
            {running ? 'Studying' : elapsed > 0 ? 'Paused' : 'Ready'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {!running ? (
          <button
            onClick={start}
            className="rounded-xl border px-5 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-glow"
            style={{
              borderColor: `${color}99`,
              background: `${color}33`,
            }}
          >
            {elapsed > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button
            onClick={pause}
            className="rounded-xl border border-white/10 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.25em] text-slate-200 hover:text-white"
          >
            Pause
          </button>
        )}
        <button
          onClick={stop}
          disabled={elapsed === 0}
          className="rounded-xl border border-nebula-green/50 bg-nebula-green/15 px-5 py-2 text-xs uppercase tracking-[0.25em] text-nebula-green hover:bg-nebula-green/25 disabled:opacity-40"
        >
          Stop & log
        </button>
        {elapsed > 0 && (
          <button
            onClick={reset}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
