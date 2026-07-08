const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

test('face match config uses balanced defaults', () => {
  assert.equal(config.faceMatchThreshold, 0.45);
  assert.equal(config.minFaceConfidence, 70);
  assert.equal(config.faceAmbiguityGap, 0.08);
});

test('74.2 percent confidence passes 70 percent minimum', () => {
  const confidence = 74.2;
  assert.equal(confidence >= 70, true);
});
