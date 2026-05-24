import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Monkeytype-style compact dropdown.
 *
 * Props:
 *   value       — current option id
 *   onChange    — (id) => void
 *   options     — [{ id, label }, ...]
 *   className   — optional extra classes on the trigger button
 *   align       — 'left' | 'right'  (menu alignment, default 'left')
 *
 * Dark surface · thin neon border · rounded · soft green glow · monospace.
 */
export default function TimeRangeSelect({
  value,
  onChange,
  options,
  className = '',
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const current = options.find((o) => o.id === value) || options[0];

  // Close when clicking outside or hitting Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'inline-flex items-center gap-2 rounded-xl border border-nebula-violet/15 bg-[#071a07]',
          'px-3.5 py-2 font-mono text-[12px] text-slate-200',
          'transition-all duration-200 hover:border-nebula-violet/50 hover:shadow-glow',
          'focus:outline-none focus:border-nebula-violet focus:shadow-glow',
          open ? 'border-nebula-violet/60 shadow-glow' : '',
        ].join(' ')}
      >
        <span className="text-nebula-violet">{current?.label || 'Select'}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`text-nebula-violet/70 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            d="M2 3.5 L5 6.5 L8 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={[
              'absolute z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl',
              'border border-nebula-violet/25 bg-black/95 p-1 shadow-glow backdrop-blur',
              align === 'right' ? 'right-0' : 'left-0',
            ].join(' ')}
          >
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left font-mono text-[12px]',
                      'transition-colors duration-150',
                      active
                        ? 'bg-nebula-violet/15 text-nebula-violet'
                        : 'text-slate-300 hover:bg-nebula-violet/10 hover:text-nebula-violet',
                    ].join(' ')}
                  >
                    <span>{opt.label}</span>
                    {active && (
                      <span aria-hidden="true" className="text-nebula-violet">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
