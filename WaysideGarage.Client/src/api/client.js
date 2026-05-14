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
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Parts
  searchParts: (q) => request(`/parts/search?q=${encodeURIComponent(q)}`),

  // Customers
  searchCustomers: (q) => request(`/customers/search?q=${encodeURIComponent(q)}`),

  // Sales
  createSale: (body) =>
    request('/sales', { method: 'POST', body: JSON.stringify(body) }),

  getSale: (id) => request(`/sales/${id}`),

  lookupSale: (invoiceNo) =>
    request(`/sales/lookup?invoiceNo=${encodeURIComponent(invoiceNo)}`),

  // Returns — customer
  getSaleReturns: (saleId) => request(`/returns/customer/sale/${saleId}`),

  customerReturn: (body) =>
    request('/returns/customer', { method: 'POST', body: JSON.stringify(body) }),

  getRecentCustomerReturns: () => request('/returns/customer/recent'),

  // Returns — supplier
  supplierReturn: (body) =>
    request('/returns/supplier', { method: 'POST', body: JSON.stringify(body) }),

  getRecentSupplierReturns: () => request('/returns/supplier/recent'),

  // Suppliers
  getSuppliers: () => request('/suppliers'),
};
