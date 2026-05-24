import { useEffect, useRef, useState } from 'react';

/**
 * Eases a numeric value from 0 → `value` on mount and whenever `value`
 * changes. Renders the integer count with the provided formatter.
 *
 * Props:
 *   value     — number target
 *   duration  — ms to animate (default 700)
 *   format    — (n) => string (default integer with thousands separators)
 *   className — passed through to the span
 */
export default function AnimatedCounter({
  value,
  duration = 700,
  format = defaultFormat,
  className = '',
}) {
  const [n, setN] = useState(value || 0);
  const fromRef = useRef(value || 0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = Number(value) || 0;
    cancelAnimationFrame(rafRef.current);

    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = easeOutCubic(k);
      const current = from + (to - from) * eased;
      setN(current);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{format(n)}</span>;
}

function defaultFormat(n) {
  return Math.round(n).toLocaleString();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
