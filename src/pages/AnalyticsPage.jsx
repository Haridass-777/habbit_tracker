import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Flame, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { EmptyState, SummaryCard } from '../components/ui.jsx';
import { addDays, formatLong } from '../utils/dateUtils.js';
import { dailySeries, habitComparison, heatmapWeeks, rangeStats, weeklySeries } from '../utils/analytics.js';

const pctText = (p) => (p === null ? '–' : `${Math.round(p)}%`);

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{d.title}</strong>
      <div>{d.pct === null ? 'No habits tracked' : `${d.pct}% (${d.completed} of ${d.total})`}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="chart-box">{children}</div>
    </section>
  );
}

const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false };

function heatLevel(s) {
  if (s.status === 'future' || s.total === 0) return 0;
  if (s.completed === 0) return 1;
  if (s.pct < 50) return 2;
  if (s.pct < 100) return 3;
  return 4;
}
const HEAT_TEXT = ['Not tracked', 'None done', 'Under half done', 'Mostly done', 'All done'];

export default function AnalyticsPage() {
  const { today, habits, activeHabits, logMap, overall, dayStatsFor } = useData();
  const t = dayStatsFor(today);
  const r7 = rangeStats(addDays(today, -6), today, habits, logMap, today);
  const r30 = rangeStats(addDays(today, -29), today, habits, logMap, today);

  const daily = useMemo(() => dailySeries(30, habits, logMap, today), [habits, logMap, today]);
  const weekly = useMemo(() => weeklySeries(12, habits, logMap, today), [habits, logMap, today]);
  const compare = useMemo(() => habitComparison(habits, logMap, today, 30), [habits, logMap, today]);
  const weeks = useMemo(() => heatmapWeeks(habits, logMap, today), [habits, logMap, today]);

  const ranked = compare.filter((c) => c.pct !== null).sort((a, b) => b.pct - a.pct);
  const best = ranked[0];
  const worst = ranked.length > 1 && ranked[ranked.length - 1].pct < ranked[0].pct ? ranked[ranked.length - 1] : null;

  if (activeHabits.length === 0 && habits.length === 0) {
    return <section className="card"><EmptyState icon={BarChart3} title="No data yet" text="Add a habit and check it off for a few days to see your analytics." /></section>;
  }
  const hasHistory = r30.total > 0;

  return (
    <>
      <section className="summary-grid" aria-label="Summary">
        <SummaryCard icon={Target} label="Today" value={pctText(t.pct)} />
        <SummaryCard icon={Target} label="Last 7 days" value={pctText(r7.pct)} hint={r7.total ? `${r7.completed} of ${r7.total} check-ins` : undefined} />
        <SummaryCard icon={Target} label="Last 30 days" value={pctText(r30.pct)} hint={r30.total ? `${r30.completed} of ${r30.total} check-ins` : undefined} />
        <SummaryCard icon={Flame} label="Current streak" value={`${overall.current} ${overall.current === 1 ? 'day' : 'days'}`} />
        <SummaryCard icon={Trophy} label="Longest streak" value={`${overall.longest} ${overall.longest === 1 ? 'day' : 'days'}`} />
        <SummaryCard icon={TrendingUp} label="Most consistent (30 days)" value={best ? best.title : '–'} hint={best ? `${best.pct}% completed` : 'Not enough data'} />
        <SummaryCard icon={TrendingDown} label="Needs attention (30 days)" value={worst ? worst.title : '–'} hint={worst ? `${worst.pct}% completed` : 'Not enough data'} />
      </section>

      {!hasHistory ? (
        <section className="card"><EmptyState icon={BarChart3} title="Not enough history yet" text="Charts appear once your habits have a day or more of tracking." /></section>
      ) : (
        <div className="chart-grid">
          <ChartCard title="Daily completion, last 30 days">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="title" {...axis} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[0, 100]} unit="%" {...axis} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Weekly completion, last 12 weeks">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="short" {...axis} interval="preserveStartEnd" minTickGap={16} />
                <YAxis domain={[0, 100]} unit="%" {...axis} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="pct" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Habits compared, last 30 days">
            {compare.length === 0 ? <p className="muted">No active habits.</p> : (
              <ResponsiveContainer width="100%" height={Math.max(200, compare.length * 44)}>
                <BarChart data={compare} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
                  <YAxis type="category" dataKey="short" width={100} {...axis} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar dataKey="pct" fill="var(--success)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      <section className="card">
        <h2>Consistency over the past year</h2>
        <div className="heat-scroll">
          <div className="heatmap" role="img" aria-label="Yearly consistency heatmap. Each square is a day, darker means more habits completed.">
            {weeks.map((w, i) => (
              <div key={i} className="heat-col">
                {w.map((s) => (
                  <span key={s.date} className={`heat-cell heat-${heatLevel(s)}${s.status === 'future' ? ' heat-future' : ''}`}
                    title={s.status === 'future' ? `${formatLong(s.date)}: upcoming` : `${formatLong(s.date)}: ${s.total ? `${s.completed} of ${s.total} (${Math.round(s.pct)}%)` : 'no habits tracked'}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <ul className="legend">
          {HEAT_TEXT.map((t2, i) => <li key={t2}><span className={`swatch heat-${i}`} aria-hidden="true" />{t2}</li>)}
        </ul>
      </section>
    </>
  );
}
