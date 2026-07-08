import { useEffect, useState } from 'react';
import { api } from '../api/client';

function currentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export default function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getMonthlyReport(month)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await api.exportMonthlyReport(month);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-slate-500">Monthly attendance summary</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Select Month</span>
            <input
              className="input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <p className="text-slate-500">Loading report...</p>}

      {report && !loading && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card bg-blue-50 text-blue-700">
              <p className="text-sm opacity-80">Employees</p>
              <p className="mt-1 text-3xl font-bold">{report.employeeCount}</p>
            </div>
            <div className="card bg-green-50 text-green-700">
              <p className="text-sm opacity-80">Total Present Days</p>
              <p className="mt-1 text-3xl font-bold">{report.totals.presentDays}</p>
            </div>
            <div className="card bg-amber-50 text-amber-700">
              <p className="text-sm opacity-80">Total Late Days</p>
              <p className="mt-1 text-3xl font-bold">{report.totals.lateDays}</p>
            </div>
            <div className="card bg-red-50 text-red-700">
              <p className="text-sm opacity-80">Total Absent Days</p>
              <p className="mt-1 text-3xl font-bold">{report.totals.absentDays}</p>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <h3 className="mb-4 text-lg font-semibold">
              Monthly Report — {report.month} ({report.totalDays} days)
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4">Employee ID</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Present</th>
                  <th className="pb-3 pr-4">Late</th>
                  <th className="pb-3 pr-4">Absent</th>
                  <th className="pb-3">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {report.employees.map((row) => (
                  <tr key={row.employeeId} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{row.employeeId}</td>
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4">{row.department || '—'}</td>
                    <td className="py-3 pr-4">{row.presentDays}</td>
                    <td className="py-3 pr-4">{row.lateDays}</td>
                    <td className="py-3 pr-4">{row.absentDays}</td>
                    <td className="py-3">{row.attendancePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.employees.length === 0 && (
              <p className="py-6 text-center text-slate-500">No employees found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
