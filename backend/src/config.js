require('dotenv').config();

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
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD) || 0.45,
  minFaceConfidence: Number(process.env.MIN_FACE_CONFIDENCE) || 70,
  faceAmbiguityGap: Number(process.env.FACE_AMBIGUITY_GAP) || 0.08,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
  get maxUploadSizeBytes() {
    return this.maxUploadSizeMb * 1024 * 1024;
  },
};

module.exports = config;
