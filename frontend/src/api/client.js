const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request('/auth/me'),

  getDashboard: () => request('/dashboard'),

  getEmployees: () => request('/employees'),

  createEmployee: (data) =>
    request('/employees', { method: 'POST', body: JSON.stringify(data) }),

  updateEmployee: (id, data) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEmployee: (id) =>
    request(`/employees/${id}`, { method: 'DELETE' }),

  registerFace: (id, imageBlob) => {
    const form = new FormData();
    form.append('image', imageBlob, 'face.jpg');
    return request(`/employees/${id}/register-face`, {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  scanAttendance: (imageBlob) => {
    const form = new FormData();
    form.append('image', imageBlob, 'scan.jpg');
    return request('/attendance/scan', {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  getTodayAttendance: () => request('/attendance/today'),
};
