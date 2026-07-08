import { useEffect, useState } from 'react';
import { api } from '../api/client';
import EmployeeListModal from '../components/EmployeeListModal';

function StatCard({ label, value, color, onClick, clickable }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  const className = clickable
    ? `card ${colors[color]} cursor-pointer transition hover:shadow-md hover:ring-2 hover:ring-current/20`
    : `card ${colors[color]}`;

  const content = (
    <>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {clickable && (
        <p className="mt-2 text-xs font-medium opacity-70">Click to view list</p>
      )}
    </>
  );

  if (clickable) {
    return (
      <button type="button" className={`${className} text-left`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
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
  const [activeStatus, setActiveStatus] = useState(null);

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

  const { stats, recentAttendance, factoryName, date, settings } = data;

  function formatTimeLabel(time) {
    if (!time) return '';
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{factoryName}</h2>
        <p className="text-slate-500">Today: {date}</p>
        {settings?.lateAfter && (
          <p className="mt-1 text-sm text-amber-700">
            Late rule: check-in after {formatTimeLabel(settings.lateAfter)} counts
            as late
          </p>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={stats.totalEmployees} color="blue" />
        <StatCard
          label="Present Today"
          value={stats.present}
          color="green"
          clickable
          onClick={() => setActiveStatus('present')}
        />
        <StatCard
          label="Absent Today"
          value={stats.absent}
          color="red"
          clickable
          onClick={() => setActiveStatus('absent')}
        />
        <StatCard
          label="Late Arrivals"
          value={stats.late}
          color="amber"
          clickable
          onClick={() => setActiveStatus('late')}
        />
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

      <EmployeeListModal
        status={activeStatus}
        onClose={() => setActiveStatus(null)}
      />
    </div>
  );
}
