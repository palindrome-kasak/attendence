const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();

const uploadDir = path.resolve(__dirname, '../', config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'attendance-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `File too large. Maximum upload size is ${config.maxUploadSizeMb} MB.`,
    });
  }

  console.error('logName=unhandledError, error=', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(config.port, () => {
  const aiHost = new URL(config.aiServiceUrl).host;
  console.log(`logName=serverStarted, port=${config.port}, aiServiceHost=${aiHost}`);
});

module.exports = app;
