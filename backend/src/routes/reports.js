const express = require('express');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { getFactoryId } = require('../utils/factory');
const {
  getMonthRange,
  buildMonthlySummary,
  buildCsv,
} = require('../utils/reports');

const router = express.Router();

router.use(authMiddleware);

router.get('/monthly', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const month = req.query.month;
    if (!month) {
      return res.status(400).json({ error: 'month query param is required (YYYY-MM)' });
    }

    const { startDate, endDate, totalDays } = getMonthRange(month);

    const employees = await prisma.employee.findMany({
      where: { factoryId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        faceEmbedding: true,
      },
    });

    const records = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: { factoryId },
      },
      select: {
        employeeId: true,
        date: true,
        status: true,
        checkIn: true,
      },
    });

    const summary = buildMonthlySummary(employees, records, totalDays);
    const totals = summary.reduce(
      (acc, row) => ({
        presentDays: acc.presentDays + row.presentDays,
        lateDays: acc.lateDays + row.lateDays,
        absentDays: acc.absentDays + row.absentDays,
      }),
      { presentDays: 0, lateDays: 0, absentDays: 0 }
    );

    res.json({
      month,
      totalDays,
      employeeCount: employees.length,
      totals,
      employees: summary,
    });
  } catch (err) {
    console.error('logName=getMonthlyReportFailed, error=', err.message);
    res.status(400).json({ error: err.message || 'Failed to fetch monthly report' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const month = req.query.month;
    const format = req.query.format || 'csv';

    if (!month) {
      return res.status(400).json({ error: 'month query param is required (YYYY-MM)' });
    }
    if (format !== 'csv') {
      return res.status(400).json({ error: 'Only csv export is supported' });
    }

    const { startDate, endDate, totalDays } = getMonthRange(month);

    const employees = await prisma.employee.findMany({
      where: { factoryId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        faceEmbedding: true,
      },
    });

    const records = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: { factoryId },
      },
      select: {
        employeeId: true,
        date: true,
        status: true,
      },
    });

    const summary = buildMonthlySummary(employees, records, totalDays);
    const csv = buildCsv(summary);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-${month}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error('logName=exportReportFailed, error=', err.message);
    res.status(400).json({ error: err.message || 'Failed to export report' });
  }
});

module.exports = router;
