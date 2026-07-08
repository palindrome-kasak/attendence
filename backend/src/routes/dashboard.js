const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { getTodayDateString } = require('../utils/attendance');

const router = express.Router();

router.use(authMiddleware);

async function getTodayContext() {
  const date = getTodayDateString();

  const registeredEmployees = await prisma.employee.findMany({
    where: { faceEmbedding: { not: null } },
    select: {
      id: true,
      employeeId: true,
      name: true,
      department: true,
      phone: true,
    },
    orderBy: { name: 'asc' },
  });

  const todayRecords = await prisma.attendance.findMany({
    where: { date },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          phone: true,
        },
      },
    },
    orderBy: { checkIn: 'asc' },
  });

  const presentIds = new Set(todayRecords.map((record) => record.employeeId));

  return { date, registeredEmployees, todayRecords, presentIds };
}

function mapPresent(records) {
  return records.map((record) => ({
    id: record.employee.id,
    employeeId: record.employee.employeeId,
    name: record.employee.name,
    department: record.employee.department,
    phone: record.employee.phone,
    checkIn: record.checkIn,
    status: record.status,
    confidence: record.confidence,
  }));
}

function mapAbsent(registeredEmployees, presentIds) {
  return registeredEmployees
    .filter((employee) => !presentIds.has(employee.id))
    .map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      phone: employee.phone,
    }));
}

router.get('/', async (_req, res) => {
  try {
    const { date, registeredEmployees, todayRecords, presentIds } =
      await getTodayContext();

    const present = todayRecords.length;
    const absent = Math.max(0, registeredEmployees.length - present);
    const late = todayRecords.filter((record) => record.status === 'late').length;
    const totalEmployees = await prisma.employee.count();
    const settings = await prisma.settings.findFirst();

    res.json({
      date,
      factoryName: settings?.factoryName || 'Factory Attendance',
      settings: settings
        ? {
            shiftStart: settings.shiftStart,
            shiftEnd: settings.shiftEnd,
            lateAfter: settings.lateAfter,
          }
        : null,
      stats: {
        totalEmployees,
        registeredFaces: registeredEmployees.length,
        present,
        absent,
        late,
      },
      recentAttendance: todayRecords.slice(0, 10).map((record) => ({
        id: record.id,
        employeeName: record.employee.name,
        employeeId: record.employee.employeeId,
        checkIn: record.checkIn,
        status: record.status,
        confidence: record.confidence,
      })),
    });
  } catch (err) {
    console.error('logName=getDashboardFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/today/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const allowed = ['present', 'absent', 'late'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Status must be present, absent, or late' });
    }

    const { date, registeredEmployees, todayRecords, presentIds } =
      await getTodayContext();

    let employees = [];
    if (status === 'present') {
      employees = mapPresent(todayRecords);
    } else if (status === 'absent') {
      employees = mapAbsent(registeredEmployees, presentIds);
    } else {
      employees = mapPresent(todayRecords.filter((record) => record.status === 'late'));
    }

    res.json({
      date,
      status,
      count: employees.length,
      employees,
    });
  } catch (err) {
    console.error('logName=getDashboardStatusFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch employee list' });
  }
});

module.exports = router;
