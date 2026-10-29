// The only file that talks to the backend. The API lives on the same server as the website under /api.
// Every request carries the signed-in user's Supabase access token; the server uses it to find the user.
import { supabase } from './supabaseClient.js';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeaders()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running (npm run dev / npm start).');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const e = new Error(data?.error || `Request failed (${res.status})`);
    e.details = data?.details;
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  bootstrap: () => req('/bootstrap'),
  createHabit: (b) => req('/habits', { method: 'POST', body: b }),
  updateHabit: (id, b) => req(`/habits/${id}`, { method: 'PATCH', body: b }),
  deleteHabit: (id) => req(`/habits/${id}`, { method: 'DELETE' }),
  reorder: (ids) => req('/habits/reorder', { method: 'POST', body: { ids } }),
  putLog: (b) => req('/logs', { method: 'PUT', body: b }),
  putNote: (date, note) => req(`/daily-notes/${date}`, { method: 'PUT', body: { note } }),
  putSettings: (b) => req('/settings', { method: 'PUT', body: b }),
  exportAll: () => req('/export'),
  importBackup: (data, dryRun = false) => req(`/import${dryRun ? '?dryRun=true' : ''}`, { method: 'POST', body: data }),
  clearAll: () => req('/data', { method: 'DELETE' }),
};
