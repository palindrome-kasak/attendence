const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMonthRange,
  buildMonthlySummary,
  buildCsv,
} = require('../src/utils/reports');

test('getMonthRange returns correct bounds for a month', () => {
  const range = getMonthRange('2026-07');
  assert.equal(range.startDate, '2026-07-01');
  assert.equal(range.endDate, '2026-07-31');
  assert.equal(range.totalDays, 31);
});

test('buildMonthlySummary calculates attendance stats per employee', () => {
  const employees = [
    { id: 1, employeeId: 'E1', name: 'Ramesh', department: 'Ops', faceEmbedding: 'x' },
    { id: 2, employeeId: 'E2', name: 'Mohan', department: 'Ops', faceEmbedding: null },
  ];
  const records = [
    { employeeId: 1, date: '2026-07-01', status: 'present' },
    { employeeId: 1, date: '2026-07-02', status: 'late' },
  ];

  const summary = buildMonthlySummary(employees, records, 10);

  assert.equal(summary[0].presentDays, 2);
  assert.equal(summary[0].lateDays, 1);
  assert.equal(summary[0].absentDays, 8);
  assert.equal(summary[0].attendancePercent, 20);
  assert.equal(summary[1].presentDays, 0);
});

test('buildCsv returns a header row and data rows', () => {
  const csv = buildCsv([
    {
      employeeId: 'E1',
      name: 'Ramesh',
      department: 'Ops',
      presentDays: 2,
      lateDays: 1,
      absentDays: 8,
      attendancePercent: 20,
    },
  ]);

  assert.match(csv, /^Employee ID,Name,Department/);
  assert.match(csv, /E1,"Ramesh","Ops",2,1,8,20/);
});
