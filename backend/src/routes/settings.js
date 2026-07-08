const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { getFactoryId } = require('../utils/factory');
const { validateSettingsInput } = require('../utils/settings');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    let settings = await prisma.settings.findUnique({ where: { factoryId } });

    if (!settings) {
      const factory = await prisma.factory.findUnique({ where: { id: factoryId } });
      settings = await prisma.settings.create({
        data: {
          factoryId,
          factoryName: factory?.name || 'Factory Attendance',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          lateAfter: '09:15',
          minFaceConfidence: 65,
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
    const factoryId = getFactoryId(req);
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

    const settings = await prisma.settings.upsert({
      where: { factoryId },
      update: data,
      create: {
        factoryId,
        factoryName: data.factoryName || 'Factory Attendance',
        shiftStart: data.shiftStart || '09:00',
        shiftEnd: data.shiftEnd || '18:00',
        lateAfter: data.lateAfter || '09:15',
        minFaceConfidence: data.minFaceConfidence ?? 65,
      },
    });

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
