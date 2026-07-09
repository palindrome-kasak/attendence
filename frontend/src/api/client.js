import { apiUrl } from '../utils/apiRoot';

const API_BASE = apiUrl('/api');

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

  if (options.raw) {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || 'Request failed');
    }
    return response;
  }

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

  getDashboardStatus: (status) => request(`/dashboard/today/${status}`),

  getMonthlyReport: (month) =>
    request(`/reports/monthly?month=${encodeURIComponent(month)}`),

  exportMonthlyReport: async (month) => {
    const response = await request(
      `/reports/export?month=${encodeURIComponent(month)}&format=csv`,
      { raw: true }
    );
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getEmployees: () => request('/employees'),

  createEmployee: (data) =>
    request('/employees', { method: 'POST', body: JSON.stringify(data) }),

  updateEmployee: (id, data) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEmployee: (id) =>
    request(`/employees/${id}`, { method: 'DELETE' }),

  registerFace: (id, imageBlobOrBlobs) => {
    const form = new FormData();
    const blobs = Array.isArray(imageBlobOrBlobs)
      ? imageBlobOrBlobs
      : [imageBlobOrBlobs];

    if (blobs.length >= 2) {
      blobs.forEach((blob, index) => {
        form.append('images', blob, `frame-${index + 1}.jpg`);
      });
    } else {
      form.append('image', blobs[0], 'face.jpg');
    }

    return request(`/employees/${id}/register-face`, {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  scanAttendance: (imageBlobOrBlobs) => {
    const form = new FormData();
    const blobs = Array.isArray(imageBlobOrBlobs)
      ? imageBlobOrBlobs
      : [imageBlobOrBlobs];

    if (blobs.length >= 2) {
      blobs.forEach((blob, index) => {
        form.append('images', blob, `scan-${index + 1}.jpg`);
      });
    } else {
      form.append('image', blobs[0], 'scan.jpg');
    }

    return request('/attendance/scan', {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  getTodayAttendance: () => request('/attendance/today'),

  getSettings: () => request('/settings'),

  warmupAi: () => request('/ai/warmup'),

  updateSettings: (data) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
