import { addDays, dateRange, formatShort, mondayOf } from './dateUtils.js';
import { dayStats } from './completion.js';
import { habitWindow } from './streaks.js';

/** Aggregate completion over [start, end], clipped to today (never includes the future). */
export function rangeStats(start, end, habits, logMap, today) {
  const last = end > today ? today : end;
  let completed = 0;
  let total = 0;
  if (last >= start) {
    for (const d of dateRange(start, last)) {
      const s = dayStats(d, habits, logMap, today);
      completed += s.completed;
      total += s.total;
    }
  }
  return { completed, total, pct: total ? (completed * 100) / total : null };
}

export function dailySeries(n, habits, logMap, today) {
  return dateRange(addDays(today, -(n - 1)), today).map((date) => {
    const s = dayStats(date, habits, logMap, today);
    return { date, title: formatShort(date), pct: s.total ? Math.round(s.pct) : null, completed: s.completed, total: s.total };
  });
}

export function weeklySeries(weeks, habits, logMap, today) {
  const thisMonday = mondayOf(today);
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const s = rangeStats(start, addDays(start, 6), habits, logMap, today);
    out.push({
      title: `Week of ${formatShort(start)}`, short: formatShort(start),
      pct: s.total ? Math.round(s.pct) : null, completed: s.completed, total: s.total,
    });
  }
  return out;
}

/** Per-habit completion over the last `days` days (active habits only). */
export function habitComparison(habits, logMap, today, days = 30) {
  const from = addDays(today, -(days - 1));
  return habits
    .filter((h) => !h.archivedOn)
    .map((h) => {
      const w = habitWindow(h, logMap, today, from);
      return {
        id: h.id, title: h.name, short: h.name.length > 14 ? `${h.name.slice(0, 13)}…` : h.name,
        pct: w.pct === null ? null : Math.round(w.pct), completed: w.completed, total: w.evaluated,
      };
    });
}

/** Heatmap columns (weeks, Monday first) covering the last ~52 weeks up to today. */
export function heatmapWeeks(habits, logMap, today) {
  const dates = dateRange(mondayOf(addDays(today, -364)), today);
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7).map((date) => dayStats(date, habits, logMap, today)));
  }
  return weeks;
}
