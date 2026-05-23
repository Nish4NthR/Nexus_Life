export default function StreakBadge({ streak, color = '#F59E0B' }) {
  if (!streak || streak < 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400">
        no streak
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: `${color}1f`,
        color,
        border: `1px solid ${color}59`,
        boxShadow: streak >= 7 ? `0 0 12px ${color}66` : 'none',
      }}
    >
      <span aria-hidden="true">🔥</span> {streak}d
    </span>
  );
}
