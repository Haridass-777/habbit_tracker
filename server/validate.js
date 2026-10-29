import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const THEMES = ['light', 'dark', 'system'];
export const RANGES = [7, 14, 30, 60, 90];

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function isISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const okStr = (v, max) => typeof v === 'string' && v.length <= max;

/** Validates habit create (partial=false) or update (partial=true) input. */
export function validateHabitInput(b, { partial = false } = {}) {
  const errors = [];
  const value = {};
  if (!b || typeof b !== 'object') return { errors: ['Body must be an object.'], value };

  if (!partial || b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (!name || name.length > 60) errors.push('Name is required (max 60 characters).');
    else value.name = name;
  }
  for (const [key, max] of [['description', 300], ['category', 40], ['icon', 30]]) {
    if (b[key] === undefined) continue;
    if (b[key] !== null && !okStr(b[key], max)) errors.push(`${key} must be at most ${max} characters.`);
    else value[key] = (b[key] || '').trim() || null;
  }
  if (!partial || b.startDate !== undefined) {
    if (!isISODate(b.startDate)) errors.push('Start date must be a valid YYYY-MM-DD date.');
    else value.startDate = b.startDate;
  }
  if (b.archivedOn !== undefined) {
    if (b.archivedOn !== null && !isISODate(b.archivedOn)) errors.push('archivedOn must be a valid date or null.');
    else value.archivedOn = b.archivedOn;
  }
  return { errors, value };
}

export function validateLogInput(b) {
  const errors = [];
  const value = {};
  if (!b || typeof b !== 'object') return { errors: ['Body must be an object.'], value };
  if (!isUuid(b.habitId)) errors.push('habitId must be a UUID.'); else value.habitId = b.habitId;
  if (!isISODate(b.date)) errors.push('date must be a valid YYYY-MM-DD date.'); else value.date = b.date;
  if (b.completed !== undefined) {
    if (typeof b.completed !== 'boolean') errors.push('completed must be true or false.'); else value.completed = b.completed;
  }
  if (b.note !== undefined) {
    if (b.note !== null && !okStr(b.note, 2000)) errors.push('note must be at most 2000 characters.');
    else value.note = (b.note || '').trim() || null;
  }
  return { errors, value };
}

export function validateSettings(s, { partial = true } = {}) {
  const errors = [];
  const value = {};
  if (!s || typeof s !== 'object') return { errors: ['Settings must be an object.'], value };
  const rules = {
    theme: (v) => THEMES.includes(v),
    streakThreshold: (v) => Number.isInteger(v) && v >= 1 && v <= 100,
    defaultRange: (v) => RANGES.includes(v),
    confirmArchive: (v) => typeof v === 'boolean',
  };
  for (const [key, ok] of Object.entries(rules)) {
    if (s[key] === undefined) { if (!partial) errors.push(`${key} is missing.`); continue; }
    if (!ok(s[key])) errors.push(`${key} has an invalid value.`); else value[key] = s[key];
  }
  return { errors, value };
}

/** Full validation of a JSON backup. Returns { errors, clean }; clean is safe to insert. */
export function validateBackup(data) {
  const errors = [];
  const err = (m) => { if (errors.length < 10) errors.push(m); };
  const clean = { habits: [], logs: [], dailyNotes: [], settings: null };

  if (!data || typeof data !== 'object' || Array.isArray(data)) return { errors: ['Backup must be a JSON object.'], clean };
  if (data.app !== 'habit-tracker') err('This is not a My Habits backup (app field mismatch).');
  if (data.version !== 1) err(`Unsupported backup version: ${data.version}.`);
  if (!Array.isArray(data.habits) || !Array.isArray(data.logs) || !Array.isArray(data.dailyNotes)) {
    err('habits, logs and dailyNotes must all be arrays.');
    return { errors, clean };
  }
  if (data.habits.length > 500 || data.logs.length > 200000 || data.dailyNotes.length > 50000) err('Backup is too large.');

  const ids = new Set();
  const names = new Set();
  data.habits.forEach((h, i) => {
    const { errors: e, value } = validateHabitInput(h, { partial: false });
    e.forEach((m) => err(`habits[${i}]: ${m}`));
    if (!isUuid(h?.id)) err(`habits[${i}]: id must be a UUID.`);
    else if (ids.has(h.id)) err(`habits[${i}]: duplicate id.`);
    if (h?.order !== undefined && !Number.isInteger(h.order)) err(`habits[${i}]: order must be an integer.`);
    if (e.length === 0 && isUuid(h.id) && !ids.has(h.id)) {
      ids.add(h.id);
      const active = !value.archivedOn;
      const nk = value.name.toLowerCase();
      if (active && names.has(nk)) err(`habits[${i}]: duplicate active habit name "${value.name}".`);
      if (active) names.add(nk);
      clean.habits.push({
        id: h.id, name: value.name, description: value.description ?? null, category: value.category ?? null,
        icon: value.icon ?? null, startDate: value.startDate, archivedOn: value.archivedOn ?? null,
        order: Number.isInteger(h.order) ? h.order : i,
      });
    }
  });

  const seen = new Set();
  data.logs.forEach((l, i) => {
    const { errors: e, value } = validateLogInput(l);
    e.forEach((m) => err(`logs[${i}]: ${m}`));
    if (l?.id !== undefined && !isUuid(l.id)) err(`logs[${i}]: id must be a UUID.`);
    if (e.length) return;
    if (!ids.has(value.habitId)) return err(`logs[${i}]: habitId does not match any habit.`);
    const key = `${value.habitId}|${value.date}`;
    if (seen.has(key)) return err(`logs[${i}]: duplicate log for the same habit and date.`);
    seen.add(key);
    clean.logs.push({
      id: isUuid(l.id) ? l.id : randomUUID(), habitId: value.habitId, date: value.date,
      completed: value.completed ?? false, note: value.note ?? null,
    });
  });

  const noteDates = new Set();
  data.dailyNotes.forEach((n, i) => {
    if (!isISODate(n?.date)) return err(`dailyNotes[${i}]: invalid date.`);
    if (typeof n.note !== 'string' || n.note.length > 5000) return err(`dailyNotes[${i}]: note must be text up to 5000 characters.`);
    if (noteDates.has(n.date)) return err(`dailyNotes[${i}]: duplicate date.`);
    noteDates.add(n.date);
    if (n.note.trim()) clean.dailyNotes.push({ date: n.date, note: n.note.trim() });
  });

  if (data.settings !== undefined && data.settings !== null) {
    const { errors: e, value } = validateSettings(data.settings);
    e.forEach((m) => err(`settings: ${m}`));
    if (!e.length) clean.settings = value;
  }
  return { errors, clean };
}
