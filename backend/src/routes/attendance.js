const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const { recognizeFace } = require('../services/aiService');
const { getTodayDateString, determineStatus } = require('../utils/attendance');

const router = express.Router();

router.use(authMiddleware);

router.get('/today', async (_req, res) => {
  try {
    const date = getTodayDateString();
    const records = await prisma.attendance.findMany({
      where: { date },
      include: {
        employee: {
          select: { id: true, employeeId: true, name: true, department: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });
    res.json(records);
  } catch (err) {
    console.error('logName=getTodayAttendanceFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const employees = await prisma.employee.findMany({
      where: { faceEmbedding: { not: null } },
      select: { id: true, name: true, employeeId: true, faceEmbedding: true },
    });

    if (employees.length === 0) {
      return res.status(422).json({ error: 'No employees with registered faces' });
    }

    const payload = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      employeeId: emp.employeeId,
      embedding: JSON.parse(emp.faceEmbedding),
    }));

    const result = await recognizeFace(req.file.path, payload);

    if (!result.matched) {
      return res.status(404).json({
        matched: false,
        message: result.message || 'Unknown person',
      });
    }

    const date = getTodayDateString();
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: result.employeeId,
          date,
        },
      },
      include: { employee: true },
    });

    if (existing) {
      return res.json({
        matched: true,
        alreadyMarked: true,
        message: 'Attendance already marked for today',
        employee: {
          id: existing.employee.id,
          name: existing.employee.name,
          employeeId: existing.employee.employeeId,
        },
        attendance: existing,
        confidence: result.confidence,
      });
    }

    const settings = await prisma.settings.findFirst();
    const checkIn = new Date();
    const status = settings ? determineStatus(checkIn, settings) : 'present';

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: result.employeeId,
        date,
        checkIn,
        status,
        confidence: result.confidence,
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, department: true },
        },
      },
    });

    res.status(201).json({
      matched: true,
      alreadyMarked: false,
      message: 'Attendance marked successfully',
      employee: attendance.employee,
      attendance: {
        id: attendance.id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        status: attendance.status,
        confidence: attendance.confidence,
      },
      confidence: result.confidence,
    });
  } catch (err) {
    console.error('logName=scanAttendanceFailed, error=', err.message);
    res.status(500).json({ error: err.message || 'Attendance scan failed' });
  }
});

module.exports = router;
