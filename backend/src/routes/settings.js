const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { validateSettingsInput } = require('../utils/settings');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          factoryName: 'Factory Attendance',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          lateAfter: '09:15',
          minFaceConfidence: 70,
        },
      });
    }

    res.json(settings);
  } catch (err) {
    console.error('logName=getSettingsFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const errors = validateSettingsInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }

    const data = {};
    if (req.body.factoryName !== undefined) {
      data.factoryName = String(req.body.factoryName).trim();
    }
    if (req.body.shiftStart !== undefined) data.shiftStart = req.body.shiftStart;
    if (req.body.shiftEnd !== undefined) data.shiftEnd = req.body.shiftEnd;
    if (req.body.lateAfter !== undefined) data.lateAfter = req.body.lateAfter;
    if (req.body.minFaceConfidence !== undefined) {
      data.minFaceConfidence = Number(req.body.minFaceConfidence);
    }

    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data,
      });
    }

    res.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (err) {
    console.error('logName=updateSettingsFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
