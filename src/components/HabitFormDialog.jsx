import { useState } from 'react';
import { Modal } from './Dialogs.jsx';
import { HabitIcon, ICONS } from './ui.jsx';
import { useData } from '../context/DataContext.jsx';
import { isISODate } from '../utils/dateUtils.js';

const CATEGORIES = ['Fitness', 'Coding', 'Study', 'Finance', 'Personal development', 'Other'];

export default function HabitFormDialog({ habit, onClose }) {
  const { addHabit, updateHabit, activeHabits, today, notify } = useData();
  const [f, setF] = useState({
    name: habit?.name || '', description: habit?.description || '', category: habit?.category || '',
    icon: habit?.icon || 'Target', startDate: habit?.startDate || today,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const cats = f.category && !CATEGORIES.includes(f.category) ? [...CATEGORIES, f.category] : CATEGORIES;

  const submit = async (e) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) return setErr('Enter a habit name.');
    if (!isISODate(f.startDate)) return setErr('Pick a valid start date.');
    const dup = activeHabits.some((h) => h.id !== habit?.id && h.name.trim().toLowerCase() === name.toLowerCase());
    if (dup && !habit?.archivedOn) return setErr('You already have an active habit with this name.');
    setBusy(true);
    try {
      const payload = { name, description: f.description.trim() || null, category: f.category || null, icon: f.icon, startDate: f.startDate };
      if (habit) await updateHabit(habit.id, payload); else await addHabit(payload);
      notify(habit ? 'Habit updated' : 'Habit created');
      onClose();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  return (
    <Modal title={habit ? 'Edit habit' : 'Add a habit'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="field"><span>Name</span>
          <input autoFocus value={f.name} maxLength={60} onChange={set('name')} placeholder="e.g. LeetCode" required />
        </label>
        <label className="field"><span>Description (optional)</span>
          <input value={f.description} maxLength={300} onChange={set('description')} />
        </label>
        <div className="grid-2">
          <label className="field"><span>Category (optional)</span>
            <select value={f.category} onChange={set('category')}>
              <option value="">None</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Icon</span>
            <span className="icon-pick">
              <HabitIcon name={f.icon} />
              <select value={f.icon} onChange={set('icon')} aria-label="Icon">
                {Object.keys(ICONS).map((n) => <option key={n}>{n}</option>)}
              </select>
            </span>
          </label>
        </div>
        <label className="field"><span>Start date</span>
          <input type="date" value={f.startDate} onChange={set('startDate')} />
          <small className="muted">Days before this date are never counted as missed.</small>
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{habit ? 'Save changes' : 'Add habit'}</button>
        </div>
      </form>
    </Modal>
  );
}
