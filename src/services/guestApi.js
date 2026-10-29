// In-memory stand-in for the real API, used while nobody is signed in.
// Nothing here touches the network, localStorage or the database, so a refresh or sign-in
// discards everything. It exposes the same functions as services/api.js.

const DEFAULT_SETTINGS = { theme: 'system', streakThreshold: 80, defaultRange: 14, confirmArchive: true };
const uid = () => globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fail = (message) => { throw new Error(message); };

export function createGuestApi() {
  let habits = [];
  let logs = [];
  let notes = [];
  let settings = { ...DEFAULT_SETTINGS };

  const nameTaken = (name, exceptId) => habits.some(
    (h) => h.id !== exceptId && !h.archivedOn && h.name.trim().toLowerCase() === String(name).trim().toLowerCase(),
  );
  const snapshot = () => ({
    habits: habits.map((h) => ({ ...h })),
    logs: logs.map((l) => ({ ...l })),
    dailyNotes: notes.map((n) => ({ ...n })),
    settings: { ...settings },
  });

  return {
    bootstrap: async () => snapshot(),

    createHabit: async (b) => {
      if (nameTaken(b.name)) fail('You already have an active habit with this name.');
      const h = {
        id: uid(), name: b.name, description: b.description ?? null, category: b.category ?? null,
        icon: b.icon ?? null, startDate: b.startDate, archivedOn: null,
        order: habits.length ? Math.max(...habits.map((x) => x.order)) + 1 : 0,
        createdAt: new Date().toISOString(),
      };
      habits.push(h);
      return { ...h };
    },

    updateHabit: async (id, patch) => {
      const i = habits.findIndex((h) => h.id === id);
      if (i < 0) fail('Not found.');
      const next = { ...habits[i], ...patch };
      if (!next.archivedOn && nameTaken(next.name, id)) fail('You already have an active habit with this name.');
      habits[i] = next;
      return { ...next };
    },

    deleteHabit: async (id) => {
      habits = habits.filter((h) => h.id !== id);
      logs = logs.filter((l) => l.habitId !== id);
      return { ok: true };
    },

    reorder: async (ids) => {
      habits = habits.map((h) => { const i = ids.indexOf(h.id); return i >= 0 ? { ...h, order: i } : h; });
      return { ok: true };
    },

    // Only the fields that are sent change, exactly like the server.
    putLog: async ({ habitId, date, completed, note }) => {
      const i = logs.findIndex((l) => l.habitId === habitId && l.date === date);
      const cur = i >= 0 ? logs[i] : { id: uid(), habitId, date, completed: false, note: null };
      const next = {
        ...cur,
        ...(completed !== undefined && { completed }),
        ...(note !== undefined && { note: (note || '').trim() || null }),
      };
      if (i >= 0) logs[i] = next; else logs.push(next);
      return { ...next };
    },

    putNote: async (date, note) => {
      const text = (note || '').trim();
      notes = notes.filter((n) => n.date !== date);
      if (!text) return { date, note: '' };
      const r = { date, note: text };
      notes.push(r);
      return { ...r };
    },

    putSettings: async (b) => { settings = { ...settings, ...b }; return { ...settings }; },

    exportAll: async () => {
      const s = snapshot();
      return { app: 'habit-tracker', version: 1, exportedAt: new Date().toISOString(), ...s };
    },

    importBackup: async () => fail('Sign in with Google to import a backup.'),

    clearAll: async () => { habits = []; logs = []; notes = []; settings = { ...DEFAULT_SETTINGS }; return { ok: true }; },
  };
}
