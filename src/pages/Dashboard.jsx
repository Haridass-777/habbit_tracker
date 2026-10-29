import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronLeft, ChevronRight, Flame, ListChecks, Plus, Target, Trophy } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import HabitTable from '../components/HabitTable.jsx';
import HabitFormDialog from '../components/HabitFormDialog.jsx';
import { EmptyState, SummaryCard } from '../components/ui.jsx';
import { addDays, dateRange, formatShort } from '../utils/dateUtils.js';
import { rangeStats } from '../utils/analytics.js';

const RANGES = [7, 14, 30, 60, 90];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { today, habits, sortedHabits, activeHabits, settings, overall, logMap, dayStatsFor } = useData();
  const [size, setSize] = useState(settings.defaultRange);
  const [page, setPage] = useState(0); // 0 = most recent window
  const [adding, setAdding] = useState(false);

  const newest = addDays(today, -page * size);
  const oldest = addDays(newest, -(size - 1));
  const dates = useMemo(() => dateRange(oldest, newest).reverse(), [oldest, newest]);
  const columns = useMemo(
    () => sortedHabits.filter((h) => h.startDate <= newest && (!h.archivedOn || h.archivedOn > oldest)),
    [sortedHabits, newest, oldest],
  );

  const todayStats = dayStatsFor(today);
  const week = rangeStats(addDays(today, -6), today, habits, logMap, today);
  const pctText = (p) => (p === null ? '–' : `${Math.round(p)}%`);

  return (
    <>
      <section className="page-head">
        <div>
          <h2>{greeting()}.</h2>
          <p className="muted">
            {activeHabits.length === 0
              ? 'Add your first habit to start tracking.'
              : todayStats.total > 0 && todayStats.completed === todayStats.total
                ? 'Everything is done for today.'
                : `${todayStats.completed} of ${todayStats.total} habits done today.`}
          </p>
        </div>
        <div className="actions">
          <Link to={`/day/${today}`} className="btn"><CalendarCheck size={16} aria-hidden="true" /> Today's details</Link>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Add habit</button>
        </div>
      </section>

      <section className="summary-grid" aria-label="Summary">
        <SummaryCard icon={Target} label="Today" value={pctText(todayStats.pct)}
          hint={todayStats.total ? `${todayStats.completed} of ${todayStats.total} habits` : 'No habits tracked'} />
        <SummaryCard icon={Flame} label="Current streak" value={`${overall.current} ${overall.current === 1 ? 'day' : 'days'}`}
          hint={`Days at ${settings.streakThreshold}% or more`} />
        <SummaryCard icon={Trophy} label="Longest streak" value={`${overall.longest} ${overall.longest === 1 ? 'day' : 'days'}`}
          hint={overall.currentStart ? `Current run began ${formatShort(overall.currentStart)}` : undefined} />
        <SummaryCard icon={ListChecks} label="Last 7 days" value={pctText(week.pct)}
          hint={week.total ? `${week.completed} of ${week.total} check-ins` : 'No data yet'} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Daily tracker</h2>
          <div className="actions">
            <label className="inline-field">
              <span className="muted small">Show</span>
              <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} aria-label="Days to show">
                {RANGES.map((r) => <option key={r} value={r}>{r} days</option>)}
              </select>
            </label>
            <button type="button" className="icon-btn" aria-label="Show earlier days" title="Earlier" onClick={() => setPage((p) => p + 1)}><ChevronLeft size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Show later days" title="Later" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronRight size={18} /></button>
            <button type="button" className="btn" disabled={page === 0} onClick={() => setPage(0)}>Current</button>
          </div>
        </div>
        <p className="muted small range-label">{formatShort(oldest)} to {formatShort(newest)}</p>
        {columns.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={habits.length === 0 ? 'No habits yet' : 'No habits in this period'}
            text={habits.length === 0 ? 'Create a habit and it will appear here as a column.' : 'Go to a more recent period to see your habits.'}
            action={habits.length === 0 ? <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>Add a habit</button> : null}
          />
        ) : (
          <HabitTable dates={dates} columns={columns} />
        )}
      </section>
      {adding && <HabitFormDialog onClose={() => setAdding(false)} />}
    </>
  );
}
