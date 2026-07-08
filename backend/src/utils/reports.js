function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeOnDate(timeStr, dateStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function determineStatus(checkIn, settings) {
  const dateStr = getTodayDateString();
  const lateThreshold = parseTimeOnDate(settings.lateAfter, dateStr);
  return checkIn > lateThreshold ? 'late' : 'present';
}

function getMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must be in YYYY-MM format');
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  const totalDays = lastDay;

  return { startDate, endDate, totalDays, month };
}

function buildMonthlySummary(employees, records, totalDays) {
  const recordsByEmployee = new Map();

  records.forEach((record) => {
    if (!recordsByEmployee.has(record.employeeId)) {
      recordsByEmployee.set(record.employeeId, []);
    }
    recordsByEmployee.get(record.employeeId).push(record);
  });

  return employees.map((employee) => {
    const employeeRecords = recordsByEmployee.get(employee.id) || [];
    const presentDays = employeeRecords.length;
    const lateDays = employeeRecords.filter((r) => r.status === 'late').length;
    const absentDays = Math.max(0, totalDays - presentDays);
    const attendancePercent =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      presentDays,
      lateDays,
      absentDays,
      attendancePercent,
      hasFaceRegistered: Boolean(employee.faceEmbedding),
    };
  });
}

function buildCsv(rows) {
  const headers = [
    'Employee ID',
    'Name',
    'Department',
    'Present Days',
    'Late Days',
    'Absent Days',
    'Attendance %',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.employeeId,
        `"${row.name.replace(/"/g, '""')}"`,
        `"${(row.department || '').replace(/"/g, '""')}"`,
        row.presentDays,
        row.lateDays,
        row.absentDays,
        row.attendancePercent,
      ].join(',')
    ),
  ];

  return `${lines.join('\n')}\n`;
}

module.exports = {
  getTodayDateString,
  determineStatus,
  getMonthRange,
  buildMonthlySummary,
  buildCsv,
};
