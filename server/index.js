import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { supabase } from './supabase.js';
import { habitCols, habitOut, logOut, noteOut, settingsCols, settingsOut } from './mappers.js';
import {
  isISODate, isUuid, validateBackup, validateHabitInput, validateLogInput, validateSettings,
} from './validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));

// ---------- helpers ----------
class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Throws a friendly HttpError for a Supabase error, otherwise returns data. */
function check({ data, error }) {
  if (!error) return data;
  if (error.code === '23505') throw new HttpError(409, 'You already have an active habit with this name.');
  if (error.code === '23503') throw new HttpError(404, 'That habit no longer exists.');
  if (error.code === 'PGRST116') throw new HttpError(404, 'Not found.');
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703') {
    throw new HttpError(500, 'Database tables are missing or outdated. Run server/schema.sql (see README) in the Supabase SQL editor.');
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(error.message || '')) {
    throw new HttpError(500, 'Cannot reach Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (/invalid api key|jwt/i.test(error.message || '')) {
    throw new HttpError(500, 'Supabase rejected the key. Use the service_role key from Project Settings -> API.');
  }
  throw new HttpError(500, error.message || 'Database error.');
}

/**
 * Supabase returns at most 1000 rows per request, so read big tables page by page.
 * Ordering must be unique across pages, so every call ends with a unique tie-breaker column.
 */
async function fetchAll(table, uid, orderCols) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = supabase.from(table).select('*').eq('user_id', uid);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const rows = check(await q.range(from, from + size - 1));
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

async function insertChunked(table, rows) {
  for (let i = 0; i < rows.length; i += 500) check(await supabase.from(table).insert(rows.slice(i, i + 500)));
}

const DEFAULT_SETTINGS_ROW = { theme: 'system', streak_threshold: 80, default_range: 14, confirm_archive: true };

async function loadSettings(uid) {
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', uid).maybeSingle();
  if (error) check({ error });
  if (data) return settingsOut(data);
  const row = { ...DEFAULT_SETTINGS_ROW, user_id: uid };
  check(await supabase.from('settings').upsert(row, { onConflict: 'user_id' }));
  return settingsOut(row);
}

async function wipeAll(uid) {
  check(await supabase.from('habit_logs').delete().eq('user_id', uid));
  check(await supabase.from('daily_notes').delete().eq('user_id', uid));
  check(await supabase.from('habits').delete().eq('user_id', uid));
}

// ---------- Auth ----------
/** Verifies the Supabase access token sent by the browser and exposes the user id as req.userId. */
const requireUser = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Please sign in to save your data.');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  req.userId = data.user.id;
  next();
});

// ---------- API ----------
const api = express.Router();

api.get('/health', (_req, res) => res.json({ ok: true }));

// Everything below belongs to one signed-in user and is always filtered by req.userId.
api.use(requireUser);

api.get('/bootstrap', wrap(async (req, res) => {
  const uid = req.userId;
  const [habits, logs, notes, settings] = await Promise.all([
    fetchAll('habits', uid, ['sort_order', 'id']),
    fetchAll('habit_logs', uid, ['log_date', 'id']),
    fetchAll('daily_notes', uid, ['note_date']),
    loadSettings(uid),
  ]);
  res.json({ habits: habits.map(habitOut), logs: logs.map(logOut), dailyNotes: notes.map(noteOut), settings });
}));

api.post('/habits', wrap(async (req, res) => {
  const uid = req.userId;
  const { errors, value } = validateHabitInput(req.body);
  if (errors.length) throw new HttpError(400, errors[0], errors);
  const last = check(await supabase.from('habits').select('sort_order').eq('user_id', uid)
    .order('sort_order', { ascending: false }).limit(1));
  const order = last.length ? last[0].sort_order + 1 : 0;
  const row = check(await supabase.from('habits')
    .insert({ ...habitCols(value), user_id: uid, sort_order: order }).select().single());
  res.status(201).json(habitOut(row));
}));

// Must be registered before "/habits/:id" style routes.
api.post('/habits/reorder', wrap(async (req, res) => {
  const uid = req.userId;
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(isUuid) || new Set(ids).size !== ids.length) {
    throw new HttpError(400, 'ids must be a list of unique habit ids.');
  }
  await Promise.all(ids.map(async (id, i) =>
    check(await supabase.from('habits').update({ sort_order: i }).eq('id', id).eq('user_id', uid))));
  res.json({ ok: true });
}));

api.patch('/habits/:id', wrap(async (req, res) => {
  const uid = req.userId;
  if (!isUuid(req.params.id)) throw new HttpError(400, 'Invalid habit id.');
  const { errors, value } = validateHabitInput(req.body, { partial: true });
  if (errors.length) throw new HttpError(400, errors[0], errors);
  const cols = habitCols(value);
  delete cols.id;
  if (!Object.keys(cols).length) throw new HttpError(400, 'Nothing to update.');
  const row = check(await supabase.from('habits').update(cols).eq('id', req.params.id).eq('user_id', uid).select().single());
  res.json(habitOut(row));
}));

api.delete('/habits/:id', wrap(async (req, res) => {
  const uid = req.userId;
  if (!isUuid(req.params.id)) throw new HttpError(400, 'Invalid habit id.');
  check(await supabase.from('habits').delete().eq('id', req.params.id).eq('user_id', uid)); // logs go via ON DELETE CASCADE
  res.json({ ok: true });
}));

// Only the fields that are sent are written, so ticking a habit never wipes its note (and vice versa).
api.put('/logs', wrap(async (req, res) => {
  const uid = req.userId;
  const { errors, value } = validateLogInput(req.body);
  if (errors.length) throw new HttpError(400, errors[0], errors);
  const owned = check(await supabase.from('habits').select('id').eq('id', value.habitId).eq('user_id', uid).maybeSingle());
  if (!owned) throw new HttpError(404, 'That habit no longer exists.');
  const row = { user_id: uid, habit_id: value.habitId, log_date: value.date, updated_at: new Date().toISOString() };
  if (value.completed !== undefined) row.completed = value.completed;
  if (value.note !== undefined) row.note = value.note;
  const saved = check(await supabase.from('habit_logs').upsert(row, { onConflict: 'habit_id,log_date' }).select().single());
  res.json(logOut(saved));
}));

api.put('/daily-notes/:date', wrap(async (req, res) => {
  const uid = req.userId;
  const { date } = req.params;
  if (!isISODate(date)) throw new HttpError(400, 'Invalid date.');
  const note = req.body?.note;
  if (typeof note !== 'string' || note.length > 5000) throw new HttpError(400, 'note must be text up to 5000 characters.');
  const text = note.trim();
  if (!text) {
    check(await supabase.from('daily_notes').delete().eq('user_id', uid).eq('note_date', date));
    return res.json({ date, note: '' });
  }
  const row = check(await supabase.from('daily_notes')
    .upsert({ user_id: uid, note_date: date, note: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,note_date' })
    .select().single());
  res.json(noteOut(row));
}));

api.put('/settings', wrap(async (req, res) => {
  const uid = req.userId;
  const { errors, value } = validateSettings(req.body);
  if (errors.length) throw new HttpError(400, errors[0], errors);
  const cols = settingsCols(value);
  if (!Object.keys(cols).length) throw new HttpError(400, 'Nothing to update.');
  check(await supabase.from('settings').upsert({ user_id: uid, ...cols }, { onConflict: 'user_id' }));
  res.json(await loadSettings(uid));
}));

api.get('/export', wrap(async (req, res) => {
  const uid = req.userId;
  const [habits, logs, notes, settings] = await Promise.all([
    fetchAll('habits', uid, ['sort_order', 'id']),
    fetchAll('habit_logs', uid, ['log_date', 'id']),
    fetchAll('daily_notes', uid, ['note_date']),
    loadSettings(uid),
  ]);
  res.json({
    app: 'habit-tracker', version: 1, exportedAt: new Date().toISOString(),
    habits: habits.map(habitOut),
    logs: logs.map(({ id, habit_id, log_date, completed, note }) => ({ id, habitId: habit_id, date: log_date, completed, note })),
    dailyNotes: notes.map((n) => ({ date: n.note_date, note: n.note })),
    settings,
  });
}));

api.post('/import', wrap(async (req, res) => {
  const uid = req.userId;
  const { errors, clean } = validateBackup(req.body);
  if (errors.length) throw new HttpError(400, 'This backup file is not valid.', errors);
  const summary = { habits: clean.habits.length, logs: clean.logs.length, dailyNotes: clean.dailyNotes.length };
  if (req.query.dryRun === 'true') return res.json({ ok: true, dryRun: true, summary });

  // Fresh ids on import: ids are global primary keys, so a backup exported by another account
  // (or an older single-user install) can never collide with rows that belong to someone else.
  const idMap = new Map(clean.habits.map((h) => [h.id, randomUUID()]));
  await wipeAll(uid);
  await insertChunked('habits', clean.habits.map((h) => ({ ...habitCols({ ...h, id: idMap.get(h.id) }), user_id: uid })));
  await insertChunked('habit_logs', clean.logs.map((l) => ({
    id: randomUUID(), user_id: uid, habit_id: idMap.get(l.habitId), log_date: l.date, completed: l.completed, note: l.note,
  })));
  await insertChunked('daily_notes', clean.dailyNotes.map((n) => ({ user_id: uid, note_date: n.date, note: n.note })));
  if (clean.settings) check(await supabase.from('settings').upsert({ user_id: uid, ...settingsCols(clean.settings) }, { onConflict: 'user_id' }));
  res.json({ ok: true, summary });
}));

api.delete('/data', wrap(async (req, res) => {
  const uid = req.userId;
  await wipeAll(uid);
  check(await supabase.from('settings').upsert({ ...DEFAULT_SETTINGS_ROW, user_id: uid }, { onConflict: 'user_id' }));
  res.json({ ok: true });
}));

api.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));
app.use('/api', api);

// ---------- Serve the built React app (production) ----------
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (_req, res) => res.type('text').send('API is running. Run "npm run build" to build the website, or "npm run dev" for development.'));
}

// ---------- Errors ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error.', details: err.details });
});

app.listen(PORT, () => console.log(`My Habits running on http://localhost:${PORT}`));
