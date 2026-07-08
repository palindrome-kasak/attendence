const test = require('node:test');
const assert = require('node:assert/strict');
const { getTodayDateString, determineStatus } = require('../src/utils/attendance');

test('getTodayDateString returns YYYY-MM-DD format', () => {
  const date = getTodayDateString();
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
});

test('determineStatus marks check-in before late threshold as present', () => {
  const dateStr = getTodayDateString();
  const checkIn = new Date(`${dateStr}T09:00:00`);
  const settings = { lateAfter: '09:15' };
  assert.equal(determineStatus(checkIn, settings), 'present');
});

test('determineStatus marks check-in after late threshold as late', () => {
  const dateStr = getTodayDateString();
  const checkIn = new Date(`${dateStr}T09:30:00`);
  const settings = { lateAfter: '09:15' };
  assert.equal(determineStatus(checkIn, settings), 'late');
});
