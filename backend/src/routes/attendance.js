const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { uploadFaceFields } = require('../middleware/upload');
const {
  recognizeFace,
  recognizeFaceLive,
  parseStoredEmbeddings,
} = require('../services/aiService');
const config = require('../config');
const { getTodayDateString, determineStatus } = require('../utils/attendance');

const router = express.Router();

router.use(authMiddleware);

function getUploadedImagePaths(req) {
  const multi = req.files?.images;
  if (multi?.length >= 2) {
    return multi.map((file) => file.path);
  }

  const single = req.files?.image?.[0] || req.file;
  return single ? [single.path] : [];
}

function buildEmployeePayload(employees) {
  return employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    employeeId: emp.employeeId,
    embeddings: parseStoredEmbeddings(emp.faceEmbedding),
  }));
}

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

router.post('/scan', uploadFaceFields, async (req, res) => {
  try {
    const imagePaths = getUploadedImagePaths(req);
    if (imagePaths.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const employees = await prisma.employee.findMany({
      where: { faceEmbedding: { not: null } },
      select: { id: true, name: true, employeeId: true, faceEmbedding: true },
    });

    if (employees.length === 0) {
      return res.status(422).json({ error: 'No employees with registered faces' });
    }

    const payload = buildEmployeePayload(employees);
    const result =
      imagePaths.length >= 2
        ? await recognizeFaceLive(imagePaths, payload)
        : await recognizeFace(imagePaths[0], payload);

    const appSettings = await prisma.settings.findFirst();
    const minConfidence =
      appSettings?.minFaceConfidence ?? config.minFaceConfidence;

    if (!result.matched) {
      return res.status(404).json({
        matched: false,
        message: result.message || 'Unknown person',
        confidence: result.confidence ?? null,
        live: result.live ?? null,
      });
    }

    if (result.confidence < minConfidence) {
      return res.status(404).json({
        matched: false,
        message: `Face matched at ${result.confidence}% but minimum is ${minConfidence}%. Re-register using Capture Face in Employees (3 live frames).`,
        confidence: result.confidence,
        minConfidence,
        live: result.live ?? null,
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
        live: result.live ?? null,
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
      live: result.live ?? null,
    });
  } catch (err) {
    console.error('logName=scanAttendanceFailed, error=', err.message);
    res.status(500).json({ error: err.message || 'Attendance scan failed' });
  }
});

module.exports = router;
