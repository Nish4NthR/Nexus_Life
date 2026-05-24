import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-screen comet explosion shown when a bad habit hits a milestone day.
 * Pass `open=true` to render; calls onClose after a delay or on click.
 */
export default function MilestoneCelebration({ open, days, onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 4200);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {/* Comet bursts */}
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            const dist = 280 + Math.random() * 140;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  scale: 0.2,
                  opacity: 0,
                }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
                className="absolute h-2 w-2 rounded-full"
                style={{
                  background: i % 3 === 0 ? '#39ff14' : i % 3 === 1 ? '#00cc44' : '#d29922',
                  boxShadow: '0 0 22px currentColor',
                }}
              />
            );
          })}

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: 'backOut' }}
            className="relative z-10 text-center"
          >
            <div className="font-display text-7xl font-bold text-glow sm:text-8xl">
              {days}
            </div>
            <div className="mt-2 font-display text-lg uppercase tracking-[0.5em] text-nebula-cyan">
              Days Clean
            </div>
            <div className="mt-6 max-w-md text-sm text-slate-300">
              Mission milestone reached. Hold the line, operator. 🚀
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
