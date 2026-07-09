require('dotenv').config();

function normalizeServiceUrl(value) {
  const trimmed = String(value).trim().replace(/\/$/, '');
  if (!trimmed) return 'http://localhost:8001';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

const missing = requiredEnvVars.filter((name) => !process.env[name]);
if (missing.length > 0) {
  missing.forEach((envVar) => {
    console.error(`logName=requiredEnvVarMissing, envVar=${envVar}`);
  });
  process.exit(1);
}

const config = {
  port: Number(process.env.PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  aiServiceUrl: normalizeServiceUrl(
    process.env.AI_SERVICE_URL || 'http://localhost:8001'
  ),
  faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD) || 0.5,
  minFaceConfidence: Number(process.env.MIN_FACE_CONFIDENCE) || 65,
  faceAmbiguityGap: Number(process.env.FACE_AMBIGUITY_GAP) || 0.08,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 180000,
  aiRetryAttempts: Number(process.env.AI_RETRY_ATTEMPTS) || 4,
  aiRetryDelayMs: Number(process.env.AI_RETRY_DELAY_MS) || 12000,
  aiWakeMaxMs: Number(process.env.AI_WAKE_MAX_MS) || 120000,
  aiWakePollMs: Number(process.env.AI_WAKE_POLL_MS) || 8000,
  aiHealthTimeoutMs: Number(process.env.AI_HEALTH_TIMEOUT_MS) || 45000,
  get maxUploadSizeBytes() {
    return this.maxUploadSizeMb * 1024 * 1024;
  },
};

module.exports = config;
