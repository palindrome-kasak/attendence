const fs = require('fs');
const path = require('path');
const config = require('../config');

function buildImageFormData(imagePath) {
  const fileBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('image', blob, `face${ext || '.jpg'}`);
  return form;
}

async function registerFace(imagePath) {
  const form = buildImageFormData(imagePath);

  const response = await fetch(`${config.aiServiceUrl}/register`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI register failed: ${body}`);
  }

  return response.json();
}

async function recognizeFace(imagePath, employees) {
  const form = buildImageFormData(imagePath);
  form.append('employees', JSON.stringify(employees));
  form.append('threshold', String(config.faceMatchThreshold));
  form.append('ambiguity_gap', String(config.faceAmbiguityGap));

  const response = await fetch(`${config.aiServiceUrl}/recognize`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI recognize failed: ${body}`);
  }

  return response.json();
}

module.exports = { registerFace, recognizeFace };
