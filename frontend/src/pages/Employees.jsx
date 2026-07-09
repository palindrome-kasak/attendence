import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { apiUrl } from '../utils/apiRoot';
import WebcamCapture from '../components/WebcamCapture';
import { warmupAiService } from '../utils/warmupAi';

const emptyForm = { employeeId: '', name: '', department: '', phone: '' };

const MAX_UPLOAD_SIZE_MB = 10;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registeringId, setRegisteringId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [warmingAiId, setWarmingAiId] = useState(null);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

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

  function handlePhoneChange(value) {
    setForm({ ...form, phone: value.replace(/\D/g, '') });
  }

  function validateForm() {
    if (form.phone && !/^\d{10,15}$/.test(form.phone)) {
      setError('Phone must contain only numbers (10-15 digits), or leave it empty');
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!validateForm()) return;
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
    setError('');
    setMessage(`Editing ${employee.name}. Update the form above and click Update.`);

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  async function handleFaceRegister(capture) {
    setCameraOpen(false);
    setError('');
    setMessage('');
    try {
      await api.registerFace(registeringId, capture);
      setMessage(
        Array.isArray(capture)
          ? 'Face registered from live captures'
          : 'Face registered successfully'
      );
      setRegisteringId(null);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  function openUploadPicker(employeeId) {
    setUploadTargetId(employeeId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function openFaceCapture(employeeId) {
    setError('');
    setMessage('');
    setWarmingAiId(employeeId);
    try {
      await warmupAiService((status) => setMessage(status));
      setRegisteringId(employeeId);
      setCameraOpen(true);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setWarmingAiId(null);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    const employeeId = uploadTargetId;
    e.target.value = '';

    if (!file || !employeeId) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(
        `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${MAX_UPLOAD_SIZE_MB} MB.`
      );
      setUploadTargetId(null);
      return;
    }

    setError('');
    setMessage('');
    setWarmingAiId(employeeId);
    try {
      await warmupAiService((status) => setMessage(status));
      setMessage('');
      await api.registerFace(employeeId, file);
      setMessage('Face registered from photo');
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setWarmingAiId(null);
      setUploadTargetId(null);
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileUpload}
      />

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

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`card mb-8 ${editingId ? 'ring-2 ring-brand-500' : ''}`}
      >
        <h3 className="mb-4 text-lg font-semibold">
          {editingId ? 'Edit Employee' : 'Add Employee'}
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          For best recognition, use <strong>Capture Face</strong> (3 live webcam
          frames). Uploaded photos work but may match less reliably at the
          attendance kiosk. Upload limit: {MAX_UPLOAD_SIZE_MB} MB (JPEG, PNG, or
          WebP).
        </p>
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
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            inputMode="numeric"
            pattern="\d*"
            maxLength={15}
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
            multiFrameCount={3}
            captureLabel="Register Face"
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
                      src={apiUrl(emp.photoPath)}
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
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => startEdit(emp)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => openUploadPicker(emp.id)}
                    >
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={warmingAiId === emp.id}
                      onClick={() => openFaceCapture(emp.id)}
                    >
                      {warmingAiId === emp.id ? 'Starting AI...' : 'Capture Face'}
                    </button>
                    <button
                      type="button"
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
