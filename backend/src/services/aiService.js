const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const config = require('../config');

const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 120000;

function buildImageFormData(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath), {
    filename: `face${ext || '.jpg'}`,
    contentType: mimeType,
  });
  return form;
}

function buildMultiImageFormData(imagePaths) {
  const form = new FormData();
  imagePaths.forEach((imagePath, index) => {
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    form.append('images', fs.createReadStream(imagePath), {
      filename: `frame-${index + 1}${ext || '.jpg'}`,
      contentType: mimeType,
    });
  });
  return form;
}

function mapAiError(status, body) {
  if (status === 502 || status === 503 || status === 504) {
    return 'AI service is waking up or unavailable. Wait 30 seconds and try again.';
  }
  if (status >= 500) {
    return 'AI service failed while processing the image. Please retry in a moment.';
  }
  if (body) {
    return body;
  }
  return 'AI service request failed';
}

async function postAiForm(endpoint, form) {
  let response;
  try {
    response = await fetch(`${config.aiServiceUrl}${endpoint}`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(
        'AI service timed out. It may be waking from sleep — wait 30 seconds and try again.'
      );
    }
    throw new Error(
      'Could not reach the AI service. Check that faceattend-ai is running on Render.'
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(mapAiError(response.status, body));
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
