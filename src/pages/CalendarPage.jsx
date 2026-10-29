import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { STATUS_LABEL } from '../components/ui.jsx';
import { formatLong, formatMonth, monthCells, shiftMonth } from '../utils/dateUtils.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEGEND = [
  ['complete', 'All habits done'], ['partial', 'Some habits done'], ['missed', 'None done'],
  ['pending', 'Today, in progress'], ['none', 'Not tracked or upcoming'],
];

export default function CalendarPage() {
  const { today, dayStatsFor } = useData();
  const navigate = useNavigate();
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const cells = monthCells(view.year, view.month);
  const isCurrent = view.year === Number(today.slice(0, 4)) && view.month === Number(today.slice(5, 7));

  return (
    <section className="card">
      <div className="card-head">
        <h2>{formatMonth(view)}</h2>
        <div className="actions">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setView((v) => shiftMonth(v, -1))}><ChevronLeft size={18} /></button>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setView((v) => shiftMonth(v, 1))}><ChevronRight size={18} /></button>
          <button type="button" className="btn" disabled={isCurrent} onClick={() => setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })}>Today</button>
        </div>
      </div>

      <div className="cal-grid" role="grid" aria-label={formatMonth(view)}>
        {WEEKDAYS.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} className="cal-blank" aria-hidden="true" />;
          const s = dayStatsFor(date);
          const shown = s.status === 'future' || s.status === 'none' ? 'none' : s.status;
          const label = `${formatLong(date)}. ${STATUS_LABEL[s.status]}${s.total ? `, ${Math.round(s.pct)} percent, ${s.completed} of ${s.total}` : ''}`;
          return (
            <button
              key={date} type="button" role="gridcell"
              className={`cal-day status-${shown}${date === today ? ' is-today' : ''}${s.status === 'future' ? ' is-future' : ''}`}
              aria-label={label} aria-current={date === today ? 'date' : undefined}
              onClick={() => navigate(`/day/${date}`)}
            >
              <span className="cal-num">{Number(date.slice(8))}</span>
              {s.total > 0 && s.status !== 'future' && <span className="cal-pct">{Math.round(s.pct)}%</span>}
            </button>
          );
        })}
      </div>

      <ul className="legend" aria-label="Legend">
        {LEGEND.map(([k, t]) => <li key={k}><span className={`swatch status-${k}`} aria-hidden="true" />{t}</li>)}
        <li><span className="swatch today-swatch" aria-hidden="true" />Today</li>
      </ul>
    </section>
  );
}
