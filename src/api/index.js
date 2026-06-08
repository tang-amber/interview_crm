const API_BASE = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const token = getToken();
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${url}`, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// Auth
export const authAPI = {
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
};

// Companies
export const companiesAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/companies${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/companies/${id}`),
  create: (data) => request('/companies', { method: 'POST', body: data }),
  update: (id, data) => request(`/companies/${id}`, { method: 'PUT', body: data }),
  updateStatus: (id, status) => request(`/companies/${id}/status`, { method: 'PATCH', body: { status } }),
  delete: (id) => request(`/companies/${id}`, { method: 'DELETE' }),
};

// Interactions
export const interactionsAPI = {
  list: (companyId) => request(`/companies/${companyId}/interactions`),
  create: (companyId, data) => request(`/companies/${companyId}/interactions`, { method: 'POST', body: data }),
  delete: (id) => request(`/interactions/${id}`, { method: 'DELETE' }),
};

// Interviews
export const interviewsAPI = {
  list: (companyId) => request(`/companies/${companyId}/interviews`),
  create: (companyId, data) => request(`/companies/${companyId}/interviews`, { method: 'POST', body: data }),
  update: (id, data) => request(`/interviews/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/interviews/${id}`, { method: 'DELETE' }),
  upcoming: () => request('/interviews/upcoming'),
  calendar: (year, month) => request(`/interviews/calendar?year=${year}&month=${month}`),
};

// Templates
export const templatesAPI = {
  list: () => request('/templates'),
  create: (data) => request('/templates', { method: 'POST', body: data }),
  update: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
};

// Tags
export const tagsAPI = {
  list: () => request('/tags'),
  create: (name) => request('/tags', { method: 'POST', body: { name } }),
  delete: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
};

// Dashboard
export const dashboardAPI = {
  get: () => request('/dashboard'),
};

// Admin
export const adminAPI = {
  users: () => request('/admin/users'),
  toggleBan: (id) => request(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  stats: () => request('/admin/stats'),
  createTag: (name) => request('/admin/tags', { method: 'POST', body: { name } }),
  deleteTag: (id) => request(`/admin/tags/${id}`, { method: 'DELETE' }),
  updateTemplate: (id, data) => request(`/admin/templates/${id}`, { method: 'PUT', body: data }),
};
