import { useEffect, useState } from 'react';
import { api } from '../api/client';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const titles = {
  present: 'Present Today',
  absent: 'Absent Today',
  late: 'Late Arrivals Today',
};

export default function EmployeeListModal({ status, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!status) return undefined;

    setLoading(true);
    setError('');

    api
      .getDashboardStatus(status)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (!status) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[80vh] w-full max-w-2xl overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{titles[status]}</h3>
            {data?.date && <p className="text-sm text-slate-500">{data.date}</p>}
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="text-slate-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && data?.employees?.length === 0 && (
          <p className="text-slate-500">No employees in this list.</p>
        )}

        {!loading && !error && data?.employees?.length > 0 && (
          <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
            {data.employees.map((employee) => (
              <div
                key={`${employee.id}-${employee.employeeId}`}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{employee.name}</p>
                  <p className="text-sm text-slate-500">
                    {employee.employeeId}
                    {employee.department ? ` · ${employee.department}` : ''}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  {status !== 'absent' && employee.checkIn && (
                    <p>Check-in {formatTime(employee.checkIn)}</p>
                  )}
                  {employee.status && (
                    <p className="capitalize">{employee.status}</p>
                  )}
                  {employee.confidence != null && (
                    <p>{employee.confidence}% confidence</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
