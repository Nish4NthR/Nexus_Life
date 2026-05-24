import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
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
 * Bar chart bucketing habits by their lifetime completion rate.
 * Buckets are 0-10%, 10-20%, ..., 90-100% (10 bars).
 *
 * Props:
 *   data — [{ bucket, count, percent }, ...] (one entry per bucket)
 *   totalHabits — number, used in tooltip
 */
export default function CompletionDistributionChart({ data, totalHabits }) {
  const empty = !data || data.every((d) => d.count === 0);
  return (
    <GlassCard hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-sm uppercase tracking-[0.3em] text-slate-400">
          Habit Completion Distribution
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          {totalHabits} habits · selected range
        </span>
      </div>

      {empty ? (
        <div className="mt-6 font-mono text-sm text-slate-500">
          Need at least one completion to build the distribution.
        </div>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(57,255,20,0.06)" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="#7fb67f"
                fontSize={10}
                tick={{ fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(57,255,20,0.15)' }}
                tickLine={false}
              />
              <YAxis
                stroke="#7fb67f"
                fontSize={10}
                tick={{ fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(57,255,20,0.15)' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(57,255,20,0.06)' }}
                formatter={(v, _name, item) => [
                  `${v} habit${v === 1 ? '' : 's'} · ${item.payload.percent}%`,
                  item.payload.bucket,
                ]}
                labelFormatter={() => 'Bucket'}
              />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                isAnimationActive
                animationDuration={800}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={shadeForBucket(i, data.length)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

/**
 * Soft green ramp — low buckets stay muted, top bucket peaks at neon.
 */
function shadeForBucket(i, n) {
  const t = n <= 1 ? 1 : i / (n - 1);
  // interpolate between #2b6e2b -> #39ff14 in RGB
  const r = Math.round(43 + (57 - 43) * t);
  const g = Math.round(110 + (255 - 110) * t);
  const b = Math.round(43 + (20 - 43) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
