import { useEffect, useState } from 'react';
import { api } from '../api/client';

const emptyForm = {
  factoryName: '',
  shiftStart: '09:00',
  shiftEnd: '18:00',
  lateAfter: '09:15',
  minFaceConfidence: 70,
};

function formatTimeLabel(time) {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function Settings() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((settings) => {
        setForm({
          factoryName: settings.factoryName,
          shiftStart: settings.shiftStart,
          shiftEnd: settings.shiftEnd,
          lateAfter: settings.lateAfter,
          minFaceConfidence: settings.minFaceConfidence ?? 70,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await api.updateSettings(form);
      setForm({
        factoryName: result.settings.factoryName,
        shiftStart: result.settings.shiftStart,
        shiftEnd: result.settings.shiftEnd,
        lateAfter: result.settings.lateAfter,
        minFaceConfidence: result.settings.minFaceConfidence ?? 70,
      });
      setMessage('Settings saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading settings...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-slate-500">
          Configure factory details, late rules, and face recognition sensitivity.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Factory Name</span>
          <input
            className="input"
            value={form.factoryName}
            onChange={(e) => setForm({ ...form, factoryName: e.target.value })}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Shift Start</span>
            <input
              className="input"
              type="time"
              value={form.shiftStart}
              onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Shift End</span>
            <input
              className="input"
              type="time"
              value={form.shiftEnd}
              onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mark as Late After</span>
          <input
            className="input"
            type="time"
            value={form.lateAfter}
            onChange={(e) => setForm({ ...form, lateAfter: e.target.value })}
            required
          />
          <p className="mt-2 text-sm text-slate-500">
            Employees checking in after{' '}
            <strong>{formatTimeLabel(form.lateAfter)}</strong> will be counted as
            late on the dashboard and in reports.
          </p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Minimum Face Match Confidence (%)
          </span>
          <input
            className="input"
            type="number"
            min={50}
            max={95}
            value={form.minFaceConfidence}
            onChange={(e) =>
              setForm({
                ...form,
                minFaceConfidence: Number(e.target.value),
              })
            }
            required
          />
          <p className="mt-2 text-sm text-slate-500">
            Attendance is marked only when face match confidence is at least{' '}
            <strong>{form.minFaceConfidence}%</strong>. Lower values (e.g. 65–70)
            work better with laptop webcams. Higher values (e.g. 80+) are stricter.
          </p>
        </label>

        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Example: if shift starts at {formatTimeLabel(form.shiftStart)} and late
          is set to {formatTimeLabel(form.lateAfter)}, anyone arriving at{' '}
          {formatTimeLabel(form.lateAfter)} or later is marked late.
        </div>

        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
