import { addDays, dateRange } from './dateUtils.js';
import { dayStats, isDone, lastTrackedDate } from './completion.js';

/**
 * The ONE streak routine used for both the overall streak and every habit streak.
 *
 * longest : longest run of consecutive qualifying dates in [firstDate, lastDate].
 * current : the run ending at lastDate.
 *           CURRENT-DAY RULE: if lastDate is today and today does NOT (yet) qualify, the day is
 *           still in progress, so the run is counted back from yesterday instead. An unfinished
 *           today therefore never breaks a streak, but a qualifying today extends it.
 *           If lastDate is in the past (archived habit) there is no grace; the run ends there.
 *           If the most recent finished day did not qualify, current is 0.
 */
export function computeStreaks({ firstDate, lastDate, today, qualifies }) {
  if (!firstDate || !lastDate || lastDate < firstDate) return { current: 0, longest: 0, currentStart: null };

  let longest = 0;
  let run = 0;
  for (let d = firstDate; d <= lastDate; d = addDays(d, 1)) {
    if (qualifies(d)) { run += 1; if (run > longest) longest = run; } else run = 0;
  }

  let end = lastDate;
  if (lastDate === today && !qualifies(today)) end = addDays(today, -1);
  let current = 0;
  for (let d = end; d >= firstDate && qualifies(d); d = addDays(d, -1)) current += 1;

  return { current, longest, currentStart: current ? addDays(end, -(current - 1)) : null };
}

/** Overall streak: consecutive days whose completion % meets the threshold. */
export function overallStreaks(habits, logMap, threshold, today) {
  if (!habits.length) return { current: 0, longest: 0, currentStart: null };
  const firstDate = habits.reduce((min, h) => (h.startDate < min ? h.startDate : min), habits[0].startDate);
  return computeStreaks({
    firstDate, lastDate: today, today,
    qualifies: (d) => dayStats(d, habits, logMap, today).meets(threshold),
  });
}

/**
 * Stats for one habit from `from` (default: its start date) through its last tracked day.
 * Today is only counted once completed, so an unfinished day doesn't lower the rate.
 */
export function habitWindow(habit, logMap, today, from = habit.startDate) {
  const start = from > habit.startDate ? from : habit.startDate;
  const last = lastTrackedDate(habit, today);
  let completed = 0;
  let evaluated = 0;
  if (last >= start) {
    for (const d of dateRange(start, last)) {
      evaluated += 1;
      if (isDone(logMap, habit.id, d)) completed += 1;
    }
    if (last === today && !isDone(logMap, habit.id, today)) evaluated -= 1;
  }
  return { completed, evaluated, pct: evaluated > 0 ? (completed * 100) / evaluated : null };
}

export function habitStats(habit, logMap, today) {
  const streaks = computeStreaks({
    firstDate: habit.startDate, lastDate: lastTrackedDate(habit, today), today,
    qualifies: (d) => isDone(logMap, habit.id, d),
  });
  const w = habitWindow(habit, logMap, today);
  return { ...streaks, totalCompleted: w.completed, evaluatedDays: w.evaluated, rate: w.pct };
}
