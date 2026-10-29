import test from 'node:test';
import assert from 'node:assert/strict';
import { isISODate, validateBackup, validateLogInput } from './validate.js';

const H1 = '11111111-1111-4111-8111-111111111111';
const good = () => ({
  app: 'habit-tracker', version: 1,
  habits: [{ id: H1, name: 'Gym', startDate: '2026-10-01', order: 0 }],
  logs: [{ habitId: H1, date: '2026-10-02', completed: true, note: 'legs' }],
  dailyNotes: [{ date: '2026-10-02', note: 'good day' }],
  settings: { theme: 'dark', streakThreshold: 80 },
});

test('isISODate rejects impossible dates', () => {
  assert.equal(isISODate('2026-02-29'), false);
  assert.equal(isISODate('2028-02-29'), true);
  assert.equal(isISODate('2026-13-01'), false);
});
test('valid backup passes', () => assert.deepEqual(validateBackup(good()).errors, []));
test('log pointing at a missing habit is rejected', () => {
  const b = good(); b.logs[0].habitId = '22222222-2222-4222-8222-222222222222';
  assert.ok(validateBackup(b).errors.length > 0);
});
test('duplicate (habit,date) logs are rejected', () => {
  const b = good(); b.logs.push({ ...b.logs[0] });
  assert.ok(validateBackup(b).errors.length > 0);
});
test('wrong app / version is rejected', () => {
  assert.ok(validateBackup({ ...good(), version: 2 }).errors.length > 0);
  assert.ok(validateBackup({ ...good(), app: 'x' }).errors.length > 0);
});
test('log input keeps note optional', () => {
  const r = validateLogInput({ habitId: H1, date: '2026-10-02', completed: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.value.note, undefined);
});
