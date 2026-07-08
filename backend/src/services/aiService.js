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

function buildMultiImageFormData(imagePaths) {
  const form = new FormData();
  imagePaths.forEach((imagePath, index) => {
    const fileBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const blob = new Blob([fileBuffer], { type: mimeType });
    form.append('images', blob, `frame-${index + 1}${ext || '.jpg'}`);
  });
  return form;
}

async function postAiForm(endpoint, form) {
  const response = await fetch(`${config.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI request failed: ${body}`);
  }

  return response.json();
}

async function registerFace(imagePath) {
  const form = buildImageFormData(imagePath);
  return postAiForm('/register', form);
}

async function registerFaceMulti(imagePaths) {
  const form = buildMultiImageFormData(imagePaths);
  return postAiForm('/register-multi', form);
}

async function recognizeFace(imagePath, employees) {
  const form = buildImageFormData(imagePath);
  form.append('employees', JSON.stringify(employees));
  form.append('threshold', String(config.faceMatchThreshold));
  form.append('ambiguity_gap', String(config.faceAmbiguityGap));
  return postAiForm('/recognize', form);
}

async function recognizeFaceLive(imagePaths, employees) {
  const form = buildMultiImageFormData(imagePaths);
  form.append('employees', JSON.stringify(employees));
  form.append('threshold', String(config.faceMatchThreshold));
  form.append('ambiguity_gap', String(config.faceAmbiguityGap));
  return postAiForm('/recognize-live', form);
}

function parseStoredEmbeddings(faceEmbeddingRaw) {
  const parsed = JSON.parse(faceEmbeddingRaw);
  if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
    return parsed;
  }
  if (parsed?.embeddings && Array.isArray(parsed.embeddings)) {
    return parsed.embeddings;
  }
  if (Array.isArray(parsed)) {
    return [parsed];
  }
  return [];
}

function serializeEmbeddings(embeddings, fallbackEmbedding) {
  const values = embeddings?.length ? embeddings : [fallbackEmbedding];
  return JSON.stringify({ embeddings: values });
}

module.exports = {
  registerFace,
  registerFaceMulti,
  recognizeFace,
  recognizeFaceLive,
  parseStoredEmbeddings,
  serializeEmbeddings,
};
