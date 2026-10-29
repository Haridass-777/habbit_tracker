import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api as realApi } from '../services/api.js';
import { createGuestApi } from '../services/guestApi.js';
import { useAuth } from './AuthContext.jsx';
import { todayISO } from '../utils/dateUtils.js';
import { buildLogMap, dayStats, logKey } from '../utils/completion.js';
import { habitStats, overallStreaks } from '../utils/streaks.js';

export const DEFAULT_SETTINGS = { theme: 'system', streakThreshold: 80, defaultRange: 14, confirmArchive: true };
const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

let toastSeq = 0;

/** Single source of truth. Every page derives its numbers from habits + logs + settings here. */
export function DataProvider({ children }) {
  const { userId, loading: authLoading } = useAuth();
  const isGuest = !userId;
  // Signed in -> real API (saved per user). Signed out -> throw-away in-memory API (nothing is saved).
  const api = useMemo(() => (userId ? realApi : createGuestApi()), [userId]);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dailyNotes, setDailyNotes] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [today, setToday] = useState(() => todayISO());
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const readyRef = useRef(false);
  const seqRef = useRef(new Map()); // latest request number per habit+date, so stale responses are ignored

  const notify = useCallback((message, type = 'success') => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3000);
  }, []);

  const load = useCallback(async () => {
    if (authLoading) return;
    try {
      const d = await api.bootstrap();
      setHabits(d.habits);
      setLogs(d.logs);
      setDailyNotes(d.dailyNotes);
      setSettings({ ...DEFAULT_SETTINGS, ...d.settings });
      readyRef.current = true;
      setStatus('ready');
      setError('');
    } catch (e) {
      if (readyRef.current) notify(e.message, 'error');
      else { setError(e.message); setStatus('error'); }
    }
  }, [api, authLoading, notify]);

  // Whenever the account changes (sign in / sign out) drop the old data and load the new account's data.
  useEffect(() => {
    readyRef.current = false;
    seqRef.current = new Map();
    setHabits([]); setLogs([]); setDailyNotes([]); setSettings(DEFAULT_SETTINGS);
    setStatus('loading'); setError('');
    load();
  }, [load]);

  // Guest data lives only in memory: warn before a refresh or tab close throws it away.
  useEffect(() => {
    if (!isGuest || (!habits.length && !logs.length)) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isGuest, habits.length, logs.length]);

  // Roll "today" over at midnight if the tab stays open.
  useEffect(() => {
    const t = setInterval(() => setToday((p) => { const n = todayISO(); return n === p ? p : n; }), 30000);
    return () => clearInterval(t);
  }, []);

  // Theme: light / dark / follow system.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : settings.theme;
      document.documentElement.dataset.theme = t;
      setResolvedTheme(t);
      try { localStorage.setItem('habit-theme', settings.theme); } catch { /* ignore */ }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    [habits],
  );
  const activeHabits = useMemo(() => sortedHabits.filter((h) => !h.archivedOn), [sortedHabits]);
  const archivedHabits = useMemo(() => sortedHabits.filter((h) => h.archivedOn), [sortedHabits]);
  const logMap = useMemo(() => buildLogMap(logs), [logs]);
  const threshold = settings.streakThreshold;
  const overall = useMemo(() => overallStreaks(habits, logMap, threshold, today), [habits, logMap, threshold, today]);
  const statsByHabit = useMemo(
    () => Object.fromEntries(habits.map((h) => [h.id, habitStats(h, logMap, today)])),
    [habits, logMap, today],
  );
  const dayStatsFor = useCallback((date) => dayStats(date, habits, logMap, today), [habits, logMap, today]);

  // ---------- actions ----------
  const addHabit = useCallback(async (input) => {
    const h = await api.createHabit(input);
    setHabits((p) => [...p, h]);
    return h;
  }, [api]);

  const updateHabit = useCallback(async (id, patch) => {
    const h = await api.updateHabit(id, patch);
    setHabits((p) => p.map((x) => (x.id === id ? h : x)));
    return h;
  }, [api]);

  const deleteHabit = useCallback(async (id) => {
    await api.deleteHabit(id);
    setHabits((p) => p.filter((h) => h.id !== id));
    setLogs((p) => p.filter((l) => l.habitId !== id));
  }, [api]);

  const reorderHabits = useCallback(async (ids) => {
    setHabits((p) => p.map((h) => { const i = ids.indexOf(h.id); return i >= 0 ? { ...h, order: i } : h; }));
    try { await api.reorder(ids); } catch (e) { notify(e.message, 'error'); load(); }
  }, [api, load, notify]);

  /** patch may hold `completed` and/or `note`; fields that are not sent are never touched. */
  const setLog = useCallback(async (habitId, date, patch) => {
    const key = logKey(habitId, date);
    const seq = (seqRef.current.get(key) || 0) + 1;
    seqRef.current.set(key, seq);
    setLogs((prev) => {
      const i = prev.findIndex((l) => l.habitId === habitId && l.date === date);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          ...(patch.completed !== undefined && { completed: patch.completed }),
          ...(patch.note !== undefined && { note: patch.note || null }),
        };
        return next;
      }
      return [...prev, { id: `tmp-${key}`, habitId, date, completed: patch.completed ?? false, note: patch.note || null }];
    });
    try {
      const saved = await api.putLog({ habitId, date, ...patch });
      if (seqRef.current.get(key) === seq) {
        setLogs((p) => p.map((l) => (l.habitId === habitId && l.date === date ? saved : l)));
      }
      return true;
    } catch (e) {
      if (seqRef.current.get(key) === seq) { notify(`Could not save: ${e.message}`, 'error'); await load(); }
      return false;
    }
  }, [api, load, notify]);

  const setDailyNote = useCallback(async (date, note) => {
    const r = await api.putNote(date, note);
    setDailyNotes((p) => { const rest = p.filter((n) => n.date !== date); return r.note ? [...rest, r] : rest; });
  }, [api]);

  const saveSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    try { await api.putSettings(patch); } catch (e) { notify(`Could not save settings: ${e.message}`, 'error'); load(); }
  }, [api, load, notify]);

  const importBackup = useCallback(async (data) => { const r = await api.importBackup(data); await load(); return r; }, [api, load]);
  const clearAll = useCallback(async () => { await api.clearAll(); await load(); }, [api, load]);

  const value = {
    api, isGuest, status, error, load, notify, toasts, today, settings, resolvedTheme,
    habits, sortedHabits, activeHabits, archivedHabits, logs, logMap, dailyNotes,
    overall, statsByHabit, dayStatsFor,
    addHabit, updateHabit, deleteHabit, reorderHabits, setLog, setDailyNote, saveSettings, importBackup, clearAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
