import GlassCard from '../ui/GlassCard.jsx';

/**
 * Render a row of "smart insight" cards. Insights are pure data computed
 * upstream — this component is purely presentational.
 *
 * Props:
 *   insights — array of { icon, label, value, tone? }
 *     tone: 'up' | 'down' | 'neutral' (controls color)
 */
export default function SmartInsights({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <GlassCard hover={false}>
        <h2 className="font-mono text-sm uppercase tracking-[0.3em] text-slate-400">
          Smart Insights
        </h2>
        <p className="mt-4 font-mono text-sm text-slate-500">
          Insights light up after a week or so of habit logs.
        </p>
      </GlassCard>
    );
  }

  return (
    <div>
      <h2 className="font-mono text-sm uppercase tracking-[0.3em] text-slate-400">
        Smart Insights
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((it, i) => (
          <InsightCard key={i} {...it} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value, tone = 'neutral' }) {
  const accent =
    tone === 'up' ? '#39ff14' : tone === 'down' ? '#f85149' : '#5eead4';
  return (
    <GlassCard className="!p-4 transition-transform duration-300 hover:-translate-y-[3px] hover:shadow-glow">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}55`,
            boxShadow: `0 0 12px ${accent}33`,
          }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {label}
          </div>
          <div
            className="mt-1 font-mono text-sm font-medium"
            style={{ color: accent }}
          >
            {value}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
