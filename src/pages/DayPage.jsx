import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useHabitToggle } from '../hooks/useHabitToggle.jsx';
import { EmptyState, HabitCheckbox, HabitIcon } from '../components/ui.jsx';
import { eligibleHabits, isDone, logKey } from '../utils/completion.js';
import { addDays, formatDate, formatLong, isISODate } from '../utils/dateUtils.js';

function Journal({ date }) {
  const { dailyNotes, setDailyNote, notify } = useData();
  const saved = dailyNotes.find((n) => n.date === date)?.note || '';
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== saved;
  const save = async () => {
    setBusy(true);
    try { await setDailyNote(date, text); notify(text.trim() ? 'Journal saved' : 'Journal cleared'); }
    catch (e) { notify(`Could not save journal: ${e.message}`, 'error'); }
    setBusy(false);
  };
  return (
    <section className="card">
      <h2>Daily journal</h2>
      <label className="field">
        <span className="muted small">What went well today? What can I improve tomorrow?</span>
        <textarea rows={5} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn btn-primary" disabled={!dirty || busy} onClick={save}>Save journal</button>
      </div>
    </section>
  );
}

export default function DayPage() {
  const { date } = useParams();
  const navigate = useNavigate();
  const { sortedHabits, logMap, today, dayStatsFor } = useData();
  const { toggle, editNote, dialog } = useHabitToggle();

  if (!isISODate(date)) return <Navigate to="/" replace />;
  const future = date > today;
  const stats = dayStatsFor(date);
  const list = eligibleHabits(sortedHabits, date);

  return (
    <>
      <section className="page-head">
        <button type="button" className="btn" onClick={() => navigate('/')}><ArrowLeft size={16} aria-hidden="true" /> Dashboard</button>
        <div className="actions">
          <Link className="icon-btn" aria-label="Previous day" title="Previous day" to={`/day/${addDays(date, -1)}`}><ChevronLeft size={18} /></Link>
          {date < today
            ? <Link className="icon-btn" aria-label="Next day" title="Next day" to={`/day/${addDays(date, 1)}`}><ChevronRight size={18} /></Link>
            : <span className="icon-btn is-disabled" aria-disabled="true" aria-label="Next day unavailable"><ChevronRight size={18} /></span>}
        </div>
      </section>

      <section className="card day-head">
        <p className="muted">{formatDate(date, { weekday: 'long' })}</p>
        <h2>{formatLong(date)}</h2>
        {future ? (
          <p className="muted">This day hasn't happened yet. Habits can be marked once it begins.</p>
        ) : stats.total === 0 ? (
          <p className="muted">No habits were tracked on this day.</p>
        ) : (
          <>
            <div className="progress" role="progressbar" aria-valuenow={Math.round(stats.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Daily progress">
              <span style={{ width: `${stats.pct}%` }} />
            </div>
            <p><strong>Daily progress: {Math.round(stats.pct)}%</strong> <span className="muted">{stats.completed} of {stats.total} habits completed, {stats.total - stats.completed} not completed</span></p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Habits</h2>
        {list.length === 0 ? (
          <EmptyState title="Nothing to track" text="No habits were active on this date." />
        ) : (
          <ul className="day-list">
            {list.map((h) => {
              const done = isDone(logMap, h.id, date);
              const note = logMap.get(logKey(h.id, date))?.note;
              return (
                <li key={h.id} className="day-row">
                  <HabitCheckbox checked={done} disabled={future} label={`${h.name}, ${formatLong(date)}`} onChange={() => toggle(h, date)} />
                  <span className="day-name"><HabitIcon name={h.icon} size={16} /> {h.name}</span>
                  <span className={`state ${done ? 'state-done' : 'state-open'}`}>{done ? 'Completed' : 'Not completed'}</span>
                  <button type="button" className="icon-btn" disabled={future} aria-label={`${note ? 'Edit' : 'Add'} note for ${h.name}`} title={note ? 'Edit note' : 'Add note'} onClick={() => editNote(h, date)}>
                    <MessageSquare size={16} />
                  </button>
                  {note && <p className="day-note muted">{note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!future && <Journal key={date} date={date} />}
      {dialog}
    </>
  );
}
