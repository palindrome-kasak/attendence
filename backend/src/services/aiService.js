const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const config = require('../config');

const AI_REQUEST_TIMEOUT_MS = config.aiRequestTimeoutMs;
const AI_RETRY_ATTEMPTS = config.aiRetryAttempts;
const AI_RETRY_DELAY_MS = config.aiRetryDelayMs;
const AI_WAKE_MAX_MS = config.aiWakeMaxMs;
const AI_WAKE_POLL_MS = config.aiWakePollMs;
const AI_HEALTH_TIMEOUT_MS = config.aiHealthTimeoutMs;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function isRetryableStatus(status) {
  return status === 502 || status === 503 || status === 504;
}

function mapAiError(status, body) {
  if (isRetryableStatus(status)) {
    return 'AI service is still waking up on Render. Please wait and try again.';
  }
  if (status >= 500) {
    return 'AI service failed while processing the image. Please retry in a moment.';
  }
  if (body) {
    return body;
  }
  return 'AI service request failed';
}

function isRetryableRequestError(err) {
  return (
    err?.name === 'TimeoutError' ||
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'EAI_AGAIN'
  );
}

async function wakeAiService() {
  const deadline = Date.now() + AI_WAKE_MAX_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${config.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(AI_HEALTH_TIMEOUT_MS),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          return true;
        }
      }
    } catch (_err) {
      // Render free tier cold starts can take 30-60 seconds.
    }

    if (Date.now() + AI_WAKE_POLL_MS >= deadline) {
      break;
    }

    await sleep(AI_WAKE_POLL_MS);
  }

  return false;
}

async function postAiForm(endpoint, buildForm) {
  let lastError = new Error('AI service request failed');

  for (let attempt = 1; attempt <= AI_RETRY_ATTEMPTS; attempt += 1) {
    const form = buildForm();

    try {
      const response = await fetch(`${config.aiServiceUrl}${endpoint}`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
        signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        return response.json();
      }

      const body = await response.text();
      lastError = new Error(mapAiError(response.status, body));

      if (isRetryableStatus(response.status) && attempt < AI_RETRY_ATTEMPTS) {
        await sleep(AI_RETRY_DELAY_MS);
        continue;
      }

      throw lastError;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('AI service')) {
        lastError = err;
      } else if (isRetryableRequestError(err)) {
        lastError = new Error(
          'AI service is still waking up on Render. Please wait and try again.'
        );
      } else if (err?.name === 'TimeoutError') {
        lastError = new Error(
          'AI service timed out while processing the image. Please try again.'
        );
      } else {
        lastError = new Error(
          'Could not reach the AI service. Check that faceattend-ai is running on Render.'
        );
      }

      if (attempt < AI_RETRY_ATTEMPTS) {
        await sleep(AI_RETRY_DELAY_MS);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

async function registerFace(imagePath) {
  return postAiForm('/register', () => buildImageFormData(imagePath));
}

async function registerFaceMulti(imagePaths) {
  return postAiForm('/register-multi', () => buildMultiImageFormData(imagePaths));
}

async function recognizeFace(imagePath, employees) {
  return postAiForm('/recognize', () => {
    const form = buildImageFormData(imagePath);
    form.append('employees', JSON.stringify(employees));
    form.append('threshold', String(config.faceMatchThreshold));
    form.append('ambiguity_gap', String(config.faceAmbiguityGap));
    return form;
  });
}

async function recognizeFaceLive(imagePaths, employees) {
  return postAiForm('/recognize-live', () => {
    const form = buildMultiImageFormData(imagePaths);
    form.append('employees', JSON.stringify(employees));
    form.append('threshold', String(config.faceMatchThreshold));
    form.append('ambiguity_gap', String(config.faceAmbiguityGap));
    return form;
  });
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
  wakeAiService,
  registerFace,
  registerFaceMulti,
  recognizeFace,
  recognizeFaceLive,
  parseStoredEmbeddings,
  serializeEmbeddings,
};
