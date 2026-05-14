const BASE = '/api';

function getToken() {
  return localStorage.getItem('wg_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('wg_token');
    localStorage.removeItem('wg_user');
    window.location.href = '/login';
    return;
  }

  return res.json();
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  searchParts: (q) => request(`/parts/search?q=${encodeURIComponent(q)}`),

  searchCustomers: (q) => request(`/customers/search?q=${encodeURIComponent(q)}`),

  createSale: (body) =>
    request('/sales', { method: 'POST', body: JSON.stringify(body) }),

  getSale: (id) => request(`/sales/${id}`),
};
