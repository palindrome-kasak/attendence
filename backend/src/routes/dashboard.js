const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { getTodayDateString } = require('../utils/attendance');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    const date = getTodayDateString();
    const totalEmployees = await prisma.employee.count();
    const registeredFaces = await prisma.employee.count({
      where: { faceEmbedding: { not: null } },
    });

    const todayRecords = await prisma.attendance.findMany({
      where: { date },
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, department: true },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    const presentIds = new Set(todayRecords.map((r) => r.employeeId));
    const present = todayRecords.length;
    const absent = Math.max(0, registeredFaces - present);
    const late = todayRecords.filter((r) => r.status === 'late').length;

    const settings = await prisma.settings.findFirst();

    res.json({
      date,
      factoryName: settings?.factoryName || 'Factory Attendance',
      stats: {
        totalEmployees,
        registeredFaces,
        present,
        absent,
        late,
      },
      recentAttendance: todayRecords.slice(0, 10).map((r) => ({
        id: r.id,
        employeeName: r.employee.name,
        employeeId: r.employee.employeeId,
        checkIn: r.checkIn,
        status: r.status,
        confidence: r.confidence,
      })),
    });
  } catch (err) {
    console.error('logName=getDashboardFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
