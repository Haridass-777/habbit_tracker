import { addDays } from './dateUtils.js';

export const logKey = (habitId, date) => `${habitId}|${date}`;

export function buildLogMap(logs) {
  const map = new Map();
  for (const l of logs) map.set(logKey(l.habitId, l.date), l);
  return map;
}

export const isDone = (logMap, habitId, date) => !!logMap.get(logKey(habitId, date))?.completed;

/**
 * A habit is tracked from its start date up to (not including) its archive date.
 * Dates before the start date are never counted as missed, so adding a habit later
 * never changes the past.
 */
export const isEligible = (habit, date) =>
  date >= habit.startDate && (!habit.archivedOn || date < habit.archivedOn);

export const eligibleHabits = (habits, date) => habits.filter((h) => isEligible(h, date));

/** Last date on which the habit is tracked, given today. */
export function lastTrackedDate(habit, today) {
  if (!habit.archivedOn) return today;
  const lastBeforeArchive = addDays(habit.archivedOn, -1);
  return lastBeforeArchive < today ? lastBeforeArchive : today;
}

/**
 * Completion for one date. Status values:
 *  future   - after today (never counted as missed)
 *  none     - no habits were tracked that day (never shown as a success)
 *  complete - every tracked habit done
 *  partial  - some done
 *  pending  - today, nothing done yet (day still in progress, so not "missed")
 *  missed   - a past day with tracked habits and zero completed
 * meets(threshold) compares with integers to avoid floating-point surprises.
 */
export function dayStats(date, habits, logMap, today) {
  const eligible = eligibleHabits(habits, date);
  const total = eligible.length;
  const completed = eligible.filter((h) => isDone(logMap, h.id, date)).length;
  let status;
  if (date > today) status = 'future';
  else if (total === 0) status = 'none';
  else if (completed === total) status = 'complete';
  else if (completed > 0) status = 'partial';
  else status = date === today ? 'pending' : 'missed';
  return {
    date, total, completed, status,
    pct: total ? (completed * 100) / total : null,
    meets: (threshold) => total > 0 && completed * 100 >= threshold * total,
  };
}
