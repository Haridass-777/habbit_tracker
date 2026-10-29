export function downloadFile(filename, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Quote every field, double inner quotes, and neutralise spreadsheet formulas (=, +, -, @).
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCSV(habits, logs, dailyNotes) {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const rows = [['date', 'habit', 'completed', 'habit_note', 'habit_archived'].map(cell).join(',')];
  [...logs]
    .filter((l) => byId.has(l.habitId))
    .sort((a, b) => a.date.localeCompare(b.date) || byId.get(a.habitId).name.localeCompare(byId.get(b.habitId).name))
    .forEach((l) => {
      const h = byId.get(l.habitId);
      rows.push([l.date, h.name, l.completed ? 'yes' : 'no', l.note, h.archivedOn ? 'yes' : 'no'].map(cell).join(','));
    });
  rows.push('');
  rows.push(['journal_date', 'journal_note'].map(cell).join(','));
  [...dailyNotes].sort((a, b) => a.date.localeCompare(b.date)).forEach((n) => rows.push([n.date, n.note].map(cell).join(',')));
  return rows.join('\r\n');
}
