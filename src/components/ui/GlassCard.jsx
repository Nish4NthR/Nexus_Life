import { motion } from 'framer-motion';

/**
 * Terminal-style surface card. Flat background, thin neon border, soft
 * lift on hover.
 *
 *   strong=true  -> uses the slightly darker secondary surface (insets, headers).
 *   hover=false  -> static; no lift on hover (use for AI/quote panels, etc).
 */
export default function GlassCard({
  children,
  className = '',
  hover = true,
  strong = false,
  ...rest
}) {
  const base = strong ? 'glass-strong' : 'glass';
  const hoverClass = hover
    ? 'transition-transform transition-shadow duration-300 hover:-translate-y-[3px] hover:shadow-glow hover:border-nebula-violet/40'
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`${base} rounded-2xl p-6 ${hoverClass} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
