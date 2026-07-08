import { useEffect, useState } from 'react';
import { api } from '../api/client';
import WebcamCapture from '../components/WebcamCapture';

const emptyForm = { employeeId: '', name: '', department: '', phone: '' };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registeringId, setRegisteringId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function loadEmployees() {
    const data = await api.getEmployees();
    setEmployees(data);
  }

  useEffect(() => {
    loadEmployees().catch((err) => setError(err.message));
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await api.updateEmployee(editingId, form);
        setMessage('Employee updated');
      } else {
        await api.createEmployee(form);
        setMessage('Employee created');
      }
      resetForm();
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(employee) {
    setEditingId(employee.id);
    setForm({
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department || '',
      phone: employee.phone || '',
    });
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this employee?')) return;
    try {
      await api.deleteEmployee(id);
      await loadEmployees();
      setMessage('Employee deleted');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFaceRegister(blob) {
    setCameraOpen(false);
    setError('');
    try {
      await api.registerFace(registeringId, blob);
      setMessage('Face registered successfully');
      setRegisteringId(null);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFileUpload(e, employeeId) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await api.registerFace(employeeId, file);
      setMessage('Face registered from photo');
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Employees</h2>

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

      <form onSubmit={handleSubmit} className="card mb-8">
        <h3 className="mb-4 text-lg font-semibold">
          {editingId ? 'Edit Employee' : 'Add Employee'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button className="btn-primary" type="submit">
            {editingId ? 'Update' : 'Save'}
          </button>
          {editingId && (
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {cameraOpen && (
        <div className="mb-8">
          <WebcamCapture
            active={cameraOpen}
            onCapture={handleFaceRegister}
            onCancel={() => {
              setCameraOpen(false);
              setRegisteringId(null);
            }}
          />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-4">Photo</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">ID</th>
              <th className="pb-3 pr-4">Department</th>
              <th className="pb-3 pr-4">Face</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-slate-100">
                <td className="py-3 pr-4">
                  {emp.photoPath ? (
                    <img
                      src={emp.photoPath}
                      alt={emp.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs">
                      N/A
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4 font-medium">{emp.name}</td>
                <td className="py-3 pr-4">{emp.employeeId}</td>
                <td className="py-3 pr-4">{emp.department || '—'}</td>
                <td className="py-3 pr-4">
                  {emp.hasFaceRegistered ? (
                    <span className="text-green-600">Registered</span>
                  ) : (
                    <span className="text-amber-600">Pending</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => startEdit(emp)}
                    >
                      Edit
                    </button>
                    <label className="btn-secondary cursor-pointer text-xs">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, emp.id)}
                      />
                    </label>
                    <button
                      className="btn-primary text-xs"
                      onClick={() => {
                        setRegisteringId(emp.id);
                        setCameraOpen(true);
                      }}
                    >
                      Capture Face
                    </button>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => handleDelete(emp.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="py-6 text-center text-slate-500">No employees yet.</p>
        )}
      </div>
    </div>
  );
}
