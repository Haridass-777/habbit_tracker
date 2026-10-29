import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, diffDays, monthCells, shiftMonth, isISODate, mondayOf } from './dateUtils.js';
import { buildLogMap, dayStats } from './completion.js';
import { computeStreaks, overallStreaks, habitStats } from './streaks.js';

const mk = (id, startDate = '2026-10-01', archivedOn = null) => ({ id, name: id, startDate, archivedOn });
const logs = (...entries) => buildLogMap(entries.map(([habitId, date, completed = true]) => ({ habitId, date, completed })));
const TODAY = '2026-10-26';

test('calendar day arithmetic is DST-safe', () => {
  assert.equal(addDays('2026-03-07', 2), '2026-03-09');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(diffDays('2026-10-01', '2026-10-26'), 25);
  assert.equal(mondayOf('2026-10-26'), '2026-10-26');
  assert.equal(mondayOf('2026-10-25'), '2026-10-19');
});
test('month helpers', () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  assert.equal(monthCells(2026, 10).filter(Boolean).length, 31);
  assert.equal(monthCells(2026, 10).findIndex(Boolean), 3);
  assert.equal(isISODate('2026-02-30'), false);
});
test('4/5 qualifies and 3/5 fails at an 80% threshold', () => {
  const hs = ['a', 'b', 'c', 'd', 'e'].map((id) => mk(id));
  const four = logs(['a', '2026-10-20'], ['b', '2026-10-20'], ['c', '2026-10-20'], ['d', '2026-10-20']);
  const three = logs(['a', '2026-10-20'], ['b', '2026-10-20'], ['c', '2026-10-20']);
  assert.equal(dayStats('2026-10-20', hs, four, TODAY).meets(80), true);
  assert.equal(dayStats('2026-10-20', hs, three, TODAY).meets(80), false);
});
test('integer comparison avoids float errors (7/10 at 70%)', () => {
  const hs = Array.from({ length: 10 }, (_, i) => mk(`h${i}`));
  const m = logs(...hs.slice(0, 7).map((h) => [h.id, '2026-10-20']));
  assert.equal(dayStats('2026-10-20', hs, m, TODAY).meets(70), true);
});
test('no habits never produces a misleading 100%', () => {
  const s = dayStats('2026-10-20', [], logs(), TODAY);
  assert.equal(s.pct, null);
  assert.equal(s.status, 'none');
  assert.equal(s.meets(1), false);
});
test('future is never missed; past empty is missed; today with nothing is pending', () => {
  const hs = [mk('a')];
  assert.equal(dayStats('2026-10-27', hs, logs(), TODAY).status, 'future');
  assert.equal(dayStats('2026-10-25', hs, logs(), TODAY).status, 'missed');
  assert.equal(dayStats('2026-10-26', hs, logs(), TODAY).status, 'pending');
});
test('a new habit does not affect dates before its start date', () => {
  const hs = [mk('old', '2026-10-01'), mk('new', '2026-10-20')];
  const before = dayStats('2026-10-10', hs, logs(['old', '2026-10-10']), TODAY);
  assert.equal(before.total, 1);
  assert.equal(before.status, 'complete');
});
test('archived habits keep history but are not tracked afterwards', () => {
  const hs = [mk('a', '2026-10-01', '2026-10-15')];
  assert.equal(dayStats('2026-10-14', hs, logs(), TODAY).total, 1);
  assert.equal(dayStats('2026-10-15', hs, logs(), TODAY).total, 0);
});
test('overall streak: unfinished today keeps it, finished today extends it', () => {
  const hs = [mk('a', '2026-10-20')];
  const m = logs(['a', '2026-10-23'], ['a', '2026-10-24'], ['a', '2026-10-25']);
  let s = overallStreaks(hs, m, 80, TODAY);
  assert.equal(s.current, 3);
  assert.equal(s.currentStart, '2026-10-23');
  s = overallStreaks(hs, logs(['a', '2026-10-23'], ['a', '2026-10-24'], ['a', '2026-10-25'], ['a', TODAY]), 80, TODAY);
  assert.equal(s.current, 4);
});
test('overall streak is 0 if yesterday failed', () => {
  const hs = [mk('a', '2026-10-20')];
  const s = overallStreaks(hs, logs(['a', '2026-10-23'], ['a', '2026-10-24']), 80, TODAY);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 2);
});
test('editing a past day updates the streak', () => {
  const hs = [mk('a', '2026-10-20')];
  const base = [['a', '2026-10-22'], ['a', '2026-10-23'], ['a', '2026-10-25']];
  assert.equal(overallStreaks(hs, logs(...base), 80, TODAY).current, 1);
  assert.equal(overallStreaks(hs, logs(...base, ['a', '2026-10-24']), 80, TODAY).current, 4);
});
test('individual habit streaks differ per habit', () => {
  const a = mk('a', '2026-10-20');
  const b = mk('b', '2026-10-20');
  const m = logs(['a', '2026-10-24'], ['a', '2026-10-25'], ['b', '2026-10-25']);
  assert.equal(habitStats(a, m, TODAY).current, 2);
  assert.equal(habitStats(b, m, TODAY).current, 1);
  assert.equal(habitStats(a, m, TODAY).totalCompleted, 2);
});
test('habit rate excludes an unfinished today and dates before the start', () => {
  const s = habitStats(mk('a', '2026-10-24'), logs(['a', '2026-10-24']), TODAY);
  assert.equal(s.evaluatedDays, 2);
  assert.equal(s.rate, 50);
});
test('archived habit keeps its final streak', () => {
  const a = mk('a', '2026-10-10', '2026-10-15');
  const m = logs(['a', '2026-10-12'], ['a', '2026-10-13'], ['a', '2026-10-14']);
  assert.equal(habitStats(a, m, TODAY).current, 3);
});
test('computeStreaks handles empty ranges', () => {
  assert.deepEqual(computeStreaks({ firstDate: '2026-10-30', lastDate: TODAY, today: TODAY, qualifies: () => true }),
    { current: 0, longest: 0, currentStart: null });
});
