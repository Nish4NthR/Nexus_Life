import GlassCard from '../ui/GlassCard.jsx';
import AnimatedCounter from './AnimatedCounter.jsx';

/**
 * 8-card responsive overview grid. Receives pre-computed metrics from the
 * Analytics page so it stays pure presentational.
 *
 * Props (all numbers; pass 0 when N/A):
 *   totalHabits, completed, currentStreak, bestStreak,
 *   completionRate, activeDays, productivityScore, avgDailyCompletion
 */
export default function OverviewCards({
  totalHabits,
  completed,
  currentStreak,
  bestStreak,
  completionRate,
  activeDays,
  productivityScore,
  avgDailyCompletion,
}) {
  const cards = [
    { label: 'Total Habits',        value: totalHabits,        accent: '#39ff14' },
    { label: 'Completed',           value: completed,          accent: '#00cc44', suffix: '' },
    { label: 'Current Streak',      value: currentStreak,      accent: '#39ff14', suffix: 'd' },
    { label: 'Best Streak',         value: bestStreak,         accent: '#d29922', suffix: 'd' },
    { label: 'Completion Rate',     value: completionRate,     accent: '#39ff14', suffix: '%' },
    { label: 'Active Days',         value: activeDays,         accent: '#00cc44' },
    { label: 'Productivity Score',  value: productivityScore,  accent: '#5eead4', suffix: '/100' },
    { label: 'Avg Daily Completion', value: avgDailyCompletion, accent: '#39ff14', suffix: '%' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <GlassCard
          key={c.label}
          className="!p-5 transition-transform duration-300 hover:-translate-y-[3px] hover:shadow-glow"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
            {c.label}
          </div>
          <div
            className="mt-3 font-mono text-3xl font-semibold tabular-nums"
            style={{ color: c.accent, textShadow: `0 0 12px ${c.accent}55` }}
          >
            <AnimatedCounter value={c.value} />
            {c.suffix && (
              <span className="ml-1 font-mono text-base text-slate-500">{c.suffix}</span>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
