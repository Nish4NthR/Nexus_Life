/**
 * Monkeytype-style pill bar for picking a time range.
 *
 * Props:
 *   value, onChange, options
 *
 * Wraps horizontally on small screens. Active pill glows neon green.
 */
export default function TimeFilterPills({ value, onChange, options }) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-nebula-violet/15 bg-[#071a07] p-1"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={[
              'rounded-lg px-3 py-1.5 font-mono text-[12px] transition-all duration-200',
              active
                ? 'bg-nebula-violet/15 text-nebula-violet shadow-glow'
                : 'text-slate-400 hover:text-nebula-violet hover:bg-nebula-violet/5',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
