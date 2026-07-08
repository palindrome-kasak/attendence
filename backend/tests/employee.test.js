const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePhone,
  validateEmployeeInput,
  sanitizeEmployeePayload,
} = require('../src/utils/employee');

test('validatePhone allows empty phone', () => {
  assert.deepEqual(validatePhone(''), { valid: true, phone: null });
  assert.deepEqual(validatePhone('   '), { valid: true, phone: null });
});

test('validatePhone rejects letters in phone', () => {
  const result = validatePhone('kasak');
  assert.equal(result.valid, false);
  assert.match(result.error, /only numbers/i);
});

test('validatePhone accepts numeric phone', () => {
  const result = validatePhone('6397435567');
  assert.deepEqual(result, { valid: true, phone: '6397435567' });
});

test('validateEmployeeInput rejects invalid phone on create', () => {
  const errors = validateEmployeeInput(
    {
      employeeId: 'E1',
      name: 'Gupta',
      phone: 'abc123',
    },
    { requireCore: true }
  );
  assert.ok(errors.length > 0);
});

test('sanitizeEmployeePayload stores null for empty phone', () => {
  const data = sanitizeEmployeePayload({
    employeeId: 'E1',
    name: 'Gupta',
    department: 'worker',
    phone: '',
  });
  assert.equal(data.phone, null);
});
