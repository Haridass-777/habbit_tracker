// DB rows (snake_case) <-> API objects (camelCase)
export const habitOut = (r) => ({
  id: r.id, name: r.name, description: r.description, category: r.category, icon: r.icon,
  startDate: r.start_date, archivedOn: r.archived_on, order: r.sort_order, createdAt: r.created_at,
});
export const habitCols = (v) => {
  const m = { id: 'id', name: 'name', description: 'description', category: 'category', icon: 'icon',
    startDate: 'start_date', archivedOn: 'archived_on', order: 'sort_order' };
  const out = {};
  for (const [k, col] of Object.entries(m)) if (v[k] !== undefined) out[col] = v[k];
  return out;
};
export const logOut = (r) => ({
  id: r.id, habitId: r.habit_id, date: r.log_date, completed: r.completed, note: r.note, updatedAt: r.updated_at,
});
export const noteOut = (r) => ({ date: r.note_date, note: r.note, updatedAt: r.updated_at });
export const settingsOut = (r) => ({
  theme: r.theme, streakThreshold: r.streak_threshold, defaultRange: r.default_range, confirmArchive: r.confirm_archive,
});
export const settingsCols = (v) => {
  const m = { theme: 'theme', streakThreshold: 'streak_threshold', defaultRange: 'default_range', confirmArchive: 'confirm_archive' };
  const out = {};
  for (const [k, col] of Object.entries(m)) if (v[k] !== undefined) out[col] = v[k];
  return out;
};
