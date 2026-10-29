// All daily records use local calendar dates as "YYYY-MM-DD" strings.
// Calendar arithmetic goes through Date.UTC on the Y/M/D parts only, so daylight-saving
// changes and time zones can never shift a date.

const pad = (n) => String(n).padStart(2, '0');
const parts = (s) => s.split('-').map(Number);

export const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function todayISO(now = new Date()) {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(s, n) {
  const [y, m, d] = parts(s);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Whole calendar days from a to b (b - a). */
export function diffDays(a, b) {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 0 = Sunday ... 6 = Saturday */
export function weekdayIndex(s) {
  const [y, m, d] = parts(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const mondayOf = (s) => addDays(s, -((weekdayIndex(s) + 6) % 7));

/** Inclusive list of dates from start to end. */
export function dateRange(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Month grid cells, Monday first. null = leading blank cell. month is 1-12. */
export function monthCells(year, month) {
  const lead = (weekdayIndex(toISO(year, month, 1)) + 6) % 7;
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(toISO(year, month, d));
  return cells;
}

export function shiftMonth({ year, month }, delta) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

// Formatting uses noon local time so a DST gap at midnight can never change the day shown.
export function formatDate(s, opts) {
  const [y, m, d] = parts(s);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, opts);
}
export const formatShort = (s) => formatDate(s, { month: 'short', day: 'numeric' });
export const formatWeekday = (s) => formatDate(s, { weekday: 'short' });
export const formatLong = (s) => formatDate(s, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const formatMonth = ({ year, month }) =>
  new Date(year, month - 1, 1, 12).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
