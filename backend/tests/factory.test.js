const test = require('node:test');
const assert = require('node:assert/strict');
const { getFactoryId } = require('../src/utils/factory');

test('getFactoryId returns factory id from authenticated request', () => {
  const req = { admin: { factoryId: 2 } };
  assert.equal(getFactoryId(req), 2);
});

test('getFactoryId throws when factory context is missing', () => {
  assert.throws(() => getFactoryId({ admin: {} }), /Factory context missing/);
});
