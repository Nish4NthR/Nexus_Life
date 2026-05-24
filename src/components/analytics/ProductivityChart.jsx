import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
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
 * Combined bars (study minutes) + line (completion %) per day.
 *
 * Props:
 *   data — [{ label, studyMin, completion, habitsDone, total, consistency }, ...]
 */
export default function ProductivityChart({ data }) {
  const empty = !data || data.length === 0 || data.every((d) => d.studyMin === 0 && d.habitsDone === 0);

  return (
    <GlassCard hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-sm uppercase tracking-[0.3em] text-slate-400">
          Productivity Mix
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          study time × completion
        </span>
      </div>

      {empty ? (
        <div className="mt-6 font-mono text-sm text-slate-500">
          Log study sessions and habits to see them stacked together.
        </div>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
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
                yAxisId="left"
                stroke="#7fb67f"
                fontSize={10}
                tick={{ fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(57,255,20,0.15)' }}
                tickLine={false}
                tickFormatter={(v) => `${v}m`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
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
                cursor={{ fill: 'rgba(57,255,20,0.06)' }}
                content={<ProductivityTooltip />}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  paddingTop: 8,
                }}
                iconType="plainline"
              />
              <Bar
                yAxisId="left"
                dataKey="studyMin"
                name="study (min)"
                fill="rgba(0,204,68,0.55)"
                stroke="#00cc44"
                strokeWidth={1}
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={700}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="completion"
                name="completion (%)"
                stroke="#39ff14"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#39ff14' }}
                isAnimationActive
                animationDuration={900}
                animationBegin={120}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

function ProductivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div
      style={{
        ...tooltipStyle,
        padding: '8px 10px',
        minWidth: 160,
      }}
      className="font-mono"
    >
      <div className="text-[11px] text-nebula-violet">{label}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
        <span className="text-slate-500">Study</span>
        <span className="text-right text-nebula-cyan">{row.studyMin || 0} min</span>
        <span className="text-slate-500">Habits</span>
        <span className="text-right text-slate-200">
          {row.habitsDone ?? 0} / {row.total ?? 0}
        </span>
        <span className="text-slate-500">Completion</span>
        <span className="text-right text-nebula-violet">{Math.round(row.completion || 0)}%</span>
        <span className="text-slate-500">Consistency</span>
        <span className="text-right text-slate-300">{Math.round(row.consistency || 0)}%</span>
      </div>
    </div>
  );
}
