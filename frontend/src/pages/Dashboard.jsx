import { useEffect, useState } from 'react';
import { api } from '../api/client';

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className={`card ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-slate-500">Loading dashboard...</p>;
  }

  const { stats, recentAttendance, factoryName, date } = data;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{factoryName}</h2>
        <p className="text-slate-500">Today: {date}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={stats.totalEmployees} color="blue" />
        <StatCard label="Present Today" value={stats.present} color="green" />
        <StatCard label="Absent Today" value={stats.absent} color="red" />
        <StatCard label="Late Arrivals" value={stats.late} color="amber" />
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold">Recent Attendance</h3>
        {recentAttendance.length === 0 ? (
          <p className="text-slate-500">No attendance marked yet today.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAttendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{record.employeeName}</p>
                  <p className="text-sm text-slate-500">{record.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    ✔ {formatTime(record.checkIn)}
                  </p>
                  <p className="text-sm capitalize text-slate-500">
                    {record.status}
                    {record.confidence ? ` · ${record.confidence}%` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
