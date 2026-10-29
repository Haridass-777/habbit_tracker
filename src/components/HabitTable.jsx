import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { useHabitToggle } from '../hooks/useHabitToggle.jsx';
import { CompletionBadge, HabitCheckbox, HabitIcon } from './ui.jsx';
import { isDone, isEligible } from '../utils/completion.js';
import { formatShort, formatWeekday } from '../utils/dateUtils.js';

/** Rows = dates (newest first), columns = habits. */
export default function HabitTable({ dates, columns }) {
  const { today, logMap, dayStatsFor } = useData();
  const { toggle, dialog } = useHabitToggle();
  return (
    <>
      <div className="table-wrap" role="region" aria-label="Habit completion by date" tabIndex={0}>
        <table className="habit-table">
          <thead>
            <tr>
              <th className="sticky-col" scope="col">Date</th>
              {columns.map((h) => (
                <th key={h.id} scope="col">
                  <span className="col-head">
                    <HabitIcon name={h.icon} size={16} />
                    <span className="col-name" title={h.name}>{h.name}</span>
                    {h.archivedOn && <small className="muted">archived</small>}
                  </span>
                </th>
              ))}
              <th scope="col">Completion</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => (
              <tr key={date} className={date === today ? 'is-today' : ''}>
                <th scope="row" className="sticky-col">
                  <Link to={`/day/${date}`} className="date-link">
                    <strong>{formatShort(date)}</strong> <span className="muted">{formatWeekday(date)}</span>
                  </Link>
                  {date === today && <span className="pill">Today</span>}
                </th>
                {columns.map((h) => (
                  <td key={h.id}>
                    {isEligible(h, date)
                      ? <HabitCheckbox checked={isDone(logMap, h.id, date)} label={`${h.name} on ${formatShort(date)}`} onChange={() => toggle(h, date)} />
                      : <span className="muted" aria-label="Not tracked on this date">–</span>}
                  </td>
                ))}
                <td><CompletionBadge stats={dayStatsFor(date)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog}
    </>
  );
}
