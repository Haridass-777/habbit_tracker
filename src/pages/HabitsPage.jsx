import { useState } from 'react';
import { Archive, ArrowDown, ArrowUp, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import HabitFormDialog from '../components/HabitFormDialog.jsx';
import { ConfirmDialog } from '../components/Dialogs.jsx';
import { EmptyState, HabitIcon } from '../components/ui.jsx';
import { addDays, formatShort } from '../utils/dateUtils.js';

function Stat({ label, value }) {
  return <div className="stat"><span className="muted small">{label}</span><strong>{value}</strong></div>;
}

function HabitCard({ habit, index, count, onEdit, onArchive, onRestore, onDelete, onMove }) {
  const { statsByHabit } = useData();
  const s = statsByHabit[habit.id];
  const archived = !!habit.archivedOn;
  return (
    <li className="card habit-card">
      <div className="habit-card-head">
        <span className="summary-icon"><HabitIcon name={habit.icon} /></span>
        <div className="habit-title">
          <h3>{habit.name} {archived && <span className="pill">Archived</span>}</h3>
          {habit.description && <p className="muted small">{habit.description}</p>}
          {habit.category && <p className="muted small">{habit.category}</p>}
        </div>
        <div className="actions">
          {!archived && (
            <>
              <button type="button" className="icon-btn" aria-label={`Move ${habit.name} up`} title="Move up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={16} /></button>
              <button type="button" className="icon-btn" aria-label={`Move ${habit.name} down`} title="Move down" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={16} /></button>
            </>
          )}
          <button type="button" className="icon-btn" aria-label={`Edit ${habit.name}`} title="Edit" onClick={onEdit}><Pencil size={16} /></button>
          {archived
            ? <button type="button" className="icon-btn" aria-label={`Restore ${habit.name}`} title="Restore" onClick={onRestore}><RotateCcw size={16} /></button>
            : <button type="button" className="icon-btn" aria-label={`Archive ${habit.name}`} title="Archive" onClick={onArchive}><Archive size={16} /></button>}
          <button type="button" className="icon-btn danger" aria-label={`Delete ${habit.name} permanently`} title="Delete permanently" onClick={onDelete}><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="stat-row">
        <Stat label="Current streak" value={`${s.current} ${s.current === 1 ? 'day' : 'days'}`} />
        <Stat label="Longest streak" value={`${s.longest} ${s.longest === 1 ? 'day' : 'days'}`} />
        <Stat label="Days completed" value={s.totalCompleted} />
        <Stat label="Completion rate" value={s.rate === null ? '–' : `${Math.round(s.rate)}%`} />
        <Stat label="Started" value={formatShort(habit.startDate)} />
      </div>
    </li>
  );
}

export default function HabitsPage() {
  const { activeHabits, archivedHabits, updateHabit, deleteHabit, reorderHabits, settings, today, notify } = useData();
  const [form, setForm] = useState(null); // null | 'new' | habit
  const [confirm, setConfirm] = useState(null); // { kind, habit }
  const [busy, setBusy] = useState(false);

  const move = (i, d) => {
    const ids = activeHabits.map((h) => h.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorderHabits(ids);
  };

  // Archived habits are tracked through today, then stop (tracking covers dates before archivedOn).
  const doArchive = async (h) => {
    await updateHabit(h.id, { archivedOn: addDays(today, 1) });
    notify(`${h.name} archived. Its history is kept.`);
  };

  const run = async () => {
    const { kind, habit } = confirm;
    setBusy(true);
    try {
      if (kind === 'archive') await doArchive(habit);
      if (kind === 'restore') { await updateHabit(habit.id, { archivedOn: null }); notify(`${habit.name} restored`); }
      if (kind === 'delete') { await deleteHabit(habit.id); notify(`${habit.name} deleted`); }
      setConfirm(null);
    } catch (e) { notify(e.message, 'error'); setConfirm(null); }
    setBusy(false);
  };

  const dialogs = {
    archive: (h) => ({ title: `Archive ${h.name}?`, message: 'It will stop appearing among your active habits. Past logs, notes and streak history are kept.', label: 'Archive', danger: false }),
    restore: (h) => ({ title: `Restore ${h.name}?`, message: 'It becomes active again. Days between archiving and restoring will count as missed for this habit.', label: 'Restore', danger: false }),
    delete: (h) => ({ title: `Delete ${h.name} permanently?`, message: 'This also deletes every log and note recorded for this habit. This cannot be undone. To keep the history, archive it instead.', label: 'Delete permanently', danger: true }),
  };
  const cd = confirm ? dialogs[confirm.kind](confirm.habit) : null;

  return (
    <>
      <section className="page-head">
        <div>
          <h2>Your habits</h2>
          <p className="muted">Every active habit is expected daily from its start date.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setForm('new')}><Plus size={16} aria-hidden="true" /> Add habit</button>
      </section>

      {activeHabits.length === 0 ? (
        <section className="card">
          <EmptyState icon={ListChecks} title="No active habits" text="Add a habit such as Gym, Reading or LeetCode to begin."
            action={<button type="button" className="btn btn-primary" onClick={() => setForm('new')}>Add a habit</button>} />
        </section>
      ) : (
        <ul className="habit-list">
          {activeHabits.map((h, i) => (
            <HabitCard key={h.id} habit={h} index={i} count={activeHabits.length}
              onEdit={() => setForm(h)} onMove={(d) => move(i, d)}
              onArchive={() => (settings.confirmArchive ? setConfirm({ kind: 'archive', habit: h }) : doArchive(h).catch((e) => notify(e.message, 'error')))}
              onDelete={() => setConfirm({ kind: 'delete', habit: h })} />
          ))}
        </ul>
      )}

      {archivedHabits.length > 0 && (
        <>
          <h2 className="section-title">Archived</h2>
          <ul className="habit-list">
            {archivedHabits.map((h) => (
              <HabitCard key={h.id} habit={h} index={0} count={1}
                onEdit={() => setForm(h)} onRestore={() => setConfirm({ kind: 'restore', habit: h })}
                onDelete={() => setConfirm({ kind: 'delete', habit: h })} />
            ))}
          </ul>
        </>
      )}

      {form && <HabitFormDialog habit={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {confirm && (
        <ConfirmDialog title={cd.title} message={cd.message} confirmLabel={cd.label} danger={cd.danger} busy={busy}
          onConfirm={run} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
