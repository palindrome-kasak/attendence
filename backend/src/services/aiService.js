const FormData = require('form-data');
const fs = require('fs');
const config = require('../config');

async function registerFace(imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));

  const response = await fetch(`${config.aiServiceUrl}/register`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI register failed: ${body}`);
  }

  return response.json();
}

async function recognizeFace(imagePath, employees) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  form.append('employees', JSON.stringify(employees));
  form.append('threshold', String(config.faceMatchThreshold));

  const response = await fetch(`${config.aiServiceUrl}/recognize`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI recognize failed: ${body}`);
  }

  return response.json();
}

module.exports = { registerFace, recognizeFace };
