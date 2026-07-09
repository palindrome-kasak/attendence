const express = require('express');
const authMiddleware = require('../middleware/auth');
const { wakeAiService } = require('../services/aiService');

const router = express.Router();

router.use(authMiddleware);

router.get('/warmup', async (_req, res) => {
  try {
    const ready = await wakeAiService();
    if (!ready) {
      return res.status(503).json({
        ready: false,
        message:
          'AI service did not wake up in time. Wait 30 seconds and try again.',
      });
    }

    res.json({
      ready: true,
      message: 'AI service is ready',
    });
  } catch (err) {
    console.error('logName=aiWarmupFailed, error=', err.message);
    res.status(500).json({
      ready: false,
      message: 'Failed to warm up AI service',
    });
  }
});

module.exports = router;
