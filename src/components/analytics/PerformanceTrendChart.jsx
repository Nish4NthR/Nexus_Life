import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import GlassCard from '../ui/GlassCard.jsx';

const tooltipStyle = {
  background: '#000',
  border: '1px solid rgba(57,255,20,0.45)',
  borderRadius: 8,
  color: '#e7ffe7',
  fontSize: 12,
  boxShadow: '0 0 10px rgba(57,255,20,0.20)',
};

/**
 * Three-line trend chart: completion %, 7-day rolling consistency %,
 * and a composite productivity score. Pre-sampled into ≤60 buckets by
 * the page so longer ranges still render smoothly.
 *
 * Props:
 *   data — [{ label, completion, consistency, productivity }, ...]
 */
export default function PerformanceTrendChart({ data }) {
  const empty = !data || data.length === 0;
  return (
    <GlassCard hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-sm uppercase tracking-[0.3em] text-slate-400">
          Habit Performance Trend
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          completion · consistency · score
        </span>
      </div>

      {empty ? (
        <div className="mt-6 font-mono text-sm text-slate-500">
          Log a few habits to start charting your trend.
        </div>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(57,255,20,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#7fb67f"
                fontSize={10}
                tick={{ fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(57,255,20,0.15)' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke="#7fb67f"
                fontSize={10}
                tick={{ fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(57,255,20,0.15)' }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: 'rgba(57,255,20,0.20)' }}
                formatter={(v, name) => [`${Math.round(v)}%`, name]}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  paddingTop: 8,
                }}
                iconType="plainline"
              />
              <Line
                type="monotone"
                dataKey="completion"
                name="completion"
                stroke="#39ff14"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#39ff14' }}
                isAnimationActive
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="consistency"
                name="consistency"
                stroke="#00cc44"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#00cc44' }}
                isAnimationActive
                animationDuration={900}
                animationBegin={120}
              />
              <Line
                type="monotone"
                dataKey="productivity"
                name="score"
                stroke="#5eead4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#5eead4' }}
                isAnimationActive
                animationDuration={900}
                animationBegin={240}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
