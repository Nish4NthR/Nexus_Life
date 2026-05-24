import { motion } from 'framer-motion';

/**
 * Particle burst — renders a fixed-position explosion of dots at click position.
 * Auto-unmounts via onComplete prop. Use sparingly (one at a time).
 */
export default function ParticleBurst({ x, y, color = '#58a6ff', count = 14, onComplete }) {
  const particles = Array.from({ length: count }, (_, i) => i);
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      {particles.map((i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 60 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onAnimationComplete={i === 0 ? onComplete : undefined}
            className="absolute block h-1.5 w-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}
