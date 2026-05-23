import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  hover = true,
  strong = false,
  ...rest
}) {
  const base = strong ? 'glass-strong' : 'glass';
  const hoverClass = hover
    ? 'transition-transform transition-shadow duration-300 hover:-translate-y-0.5 hover:shadow-glow'
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`${base} rounded-2xl p-5 ${hoverClass} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
