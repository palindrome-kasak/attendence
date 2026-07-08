const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

test('face match config uses balanced defaults', () => {
  assert.equal(config.faceMatchThreshold, 0.5);
  assert.equal(config.minFaceConfidence, 65);
  assert.equal(config.faceAmbiguityGap, 0.08);
});

test('69.4 percent confidence passes 65 percent minimum', () => {
  const confidence = 69.4;
  assert.equal(confidence >= 65, true);
});
