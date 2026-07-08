const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidTime,
  validateSettingsInput,
  formatTimeLabel,
} = require('../src/utils/settings');

test('isValidTime accepts HH:MM format', () => {
  assert.equal(isValidTime('09:15'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('9:15'), false);
  assert.equal(isValidTime('25:00'), false);
});

test('validateSettingsInput rejects invalid lateAfter', () => {
  const errors = validateSettingsInput({ lateAfter: '9:15' });
  assert.ok(errors.some((e) => e.includes('lateAfter')));
});

test('validateSettingsInput rejects lateAfter before shiftStart', () => {
  const errors = validateSettingsInput({
    shiftStart: '09:00',
    lateAfter: '08:30',
  });
  assert.ok(errors.some((e) => e.includes('lateAfter')));
});

test('formatTimeLabel renders 12-hour clock', () => {
  assert.equal(formatTimeLabel('09:15'), '9:15 AM');
  assert.equal(formatTimeLabel('18:00'), '6:00 PM');
});
