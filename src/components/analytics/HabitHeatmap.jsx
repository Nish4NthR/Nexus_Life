import { useEffect, useMemo, useRef, useState } from 'react';
import { todayKey } from '../../utils/dateHelpers.js';

/**
 * Premium GitHub-style heatmap with gradient cells, hover scale + glow,
 * real (non-`title`) tooltip, motion entry, and theme-aware colors.
 *
 * Props:
 *   days     — array of { date, count, total, pct } (oldest first)
 *   cellSize — px, defaults to 14 (small enough to fit a year on desktop)
 *   onCellHover(cell|null) — optional, lets parent surface extra context
 */
export default function HabitHeatmap({ days, cellSize = 14, onCellHover }) {
  const today = todayKey();
  const scrollerRef = useRef(null);
  const [hovered, setHovered] = useState(null); // { cell, x, y }

  // Build cells grouped by week (column)
  const { cols, labelForCol } = useMemo(() => {
    const firstDate = days[0]?.date;
    let firstDay = new Date();
    if (firstDate) {
      const [y, m, d] = firstDate.split('-').map(Number);
      firstDay = new Date(y, m - 1, d);
    }
    const startWeekday = firstDay.getDay(); // 0=Sun

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (const d of days) cells.push(d);
    const numCols = Math.ceil(cells.length / 7);
    while (cells.length < numCols * 7) cells.push(null);

    const cols = [];
    for (let c = 0; c < numCols; c++) {
      const col = [];
      for (let r = 0; r < 7; r++) col.push(cells[c * 7 + r] || null);
      cols.push(col);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const colMonths = cols.map((col) => {
      const firstCell = col.find(Boolean);
      if (!firstCell) return null;
      const [, m] = firstCell.date.split('-').map(Number);
      return m - 1;
    });
    const labelForCol = colMonths.map((m, i) => {
      if (m == null) return '';
      if (i === 0) return monthNames[m];
      const prev = colMonths[i - 1];
      return prev !== m ? monthNames[m] : '';
    });

    return { cols, labelForCol };
  }, [days]);

  // Auto-scroll right so today lands in view (older months scroll left)
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  // Theme-aware cell tint: pulls from --heat-* CSS vars (flip with theme)
  const cellStyle = (pct) => {
    if (pct == null) {
      return { background: 'transparent' };
    }
    if (pct === 0) {
      return { background: 'var(--heat-empty)' };
    }
    // Linear gradient gives the cells a bit of depth versus a flat fill
    let tint = 'var(--heat-1)';
    if (pct >= 1) tint = 'var(--heat-peak)';
    else if (pct >= 0.75) tint = 'var(--heat-3)';
    else if (pct >= 0.5) tint = 'var(--heat-2)';
    else if (pct >= 0.25) tint = 'var(--heat-1)';

    return {
      background: `linear-gradient(155deg, ${tint}, color-mix(in srgb, ${tint} 70%, transparent))`,
      boxShadow: pct >= 1
        ? '0 0 8px rgb(var(--nebula-violet) / 0.7), inset 0 0 0 1px rgb(var(--nebula-violet) / 0.5)'
        : 'inset 0 0 0 1px rgb(var(--nebula-violet) / 0.08)',
    };
  };

  const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleEnter = (cell, ev) => {
    if (!cell) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const containerRect = scrollerRef.current?.getBoundingClientRect();
    setHovered({
      cell,
      x: rect.left + rect.width / 2 - (containerRect?.left || 0),
      y: rect.top - (containerRect?.top || 0),
    });
    if (onCellHover) onCellHover(cell);
  };
  const handleLeave = () => {
    setHovered(null);
    if (onCellHover) onCellHover(null);
  };

  return (
    <div
      ref={scrollerRef}
      className="relative mt-5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="inline-flex gap-3">
        {/* Sticky left rail: day-of-week labels */}
        <div
          className="sticky left-0 z-10 flex flex-col bg-space-700 pr-2 pt-[26px]"
          style={{ gap: 3 }}
        >
          {dowLabels.map((d, i) => (
            <div
              key={d}
              className="text-[11px] font-medium uppercase tracking-wider text-slate-400"
              style={{
                height: cellSize,
                lineHeight: `${cellSize}px`,
                visibility: i % 2 === 1 ? 'visible' : 'hidden',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid with month-label row above */}
        <div className="flex flex-col">
          <div
            className="mb-2 flex text-[11px] font-medium uppercase tracking-wider text-slate-400"
            style={{ gap: 3 }}
          >
            {labelForCol.map((label, i) => (
              <div key={i} className="shrink-0" style={{ width: cellSize }}>
                {label}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: 3 }}>
            {cols.map((col, ci) => (
              <div key={ci} className="flex flex-col" style={{ gap: 3 }}>
                {col.map((cell, ri) => {
                  if (!cell) {
                    return (
                      <div
                        key={ri}
                        className="rounded-md"
                        style={{ width: cellSize, height: cellSize, background: 'transparent' }}
                      />
                    );
                  }
                  const isToday = cell.date === today;
                  // Stagger fade-in across the grid for a "loading in" feel
                  const delay = Math.min(0.6, (ci * 7 + ri) * 0.0015);
                  return (
                    <div
                      key={ri}
                      onMouseEnter={(e) => handleEnter(cell, e)}
                      onMouseLeave={handleLeave}
                      onFocus={(e) => handleEnter(cell, e)}
                      onBlur={handleLeave}
                      tabIndex={0}
                      role="gridcell"
                      aria-label={`${cell.date}: ${cell.count} of ${cell.total} habits`}
                      className={`heatmap-cell rounded-md transition-transform duration-150 hover:scale-[1.6] hover:z-20 focus:scale-[1.6] focus:outline-none ${
                        isToday
                          ? 'ring-1 ring-offset-1 ring-offset-space-700 ring-nebula-violet'
                          : ''
                      }`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        animation: `heatmap-fade-in 0.4s ease-out ${delay}s both`,
                        ...cellStyle(cell.pct),
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating tooltip — positioned over the hovered cell */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          <div className="whitespace-nowrap rounded-lg border border-nebula-violet/40 bg-space-900/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur-sm">
            <div className="font-semibold text-slate-100">{formatTooltipDate(hovered.cell.date)}</div>
            <div className="text-slate-400">
              {hovered.cell.count} / {hovered.cell.total} habits
              {hovered.cell.pct >= 1 && (
                <span className="ml-2 text-nebula-violet">✓ all done</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTooltipDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
