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

  // Parts — POS
  searchParts: (q) => request(`/parts/search?q=${encodeURIComponent(q)}`),

  // Parts — Inventory
  listParts: (queryString) => request(`/parts${queryString ? `?${queryString}` : ''}`),
  getPart: (id) => request(`/parts/${id}`),
  createPart: (body) => request('/parts', { method: 'POST', body: JSON.stringify(body) }),
  updatePart: (id, body) => request(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deactivatePart: (id) => request(`/parts/${id}`, { method: 'DELETE' }),
  adjustStock: (id, body) => request(`/parts/${id}/adjust`, { method: 'POST', body: JSON.stringify(body) }),
  uploadPartImage: (id, formData) => {
    const token = localStorage.getItem('wg_token');
    return fetch(`${BASE}/parts/${id}/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    }).then(r => r.json());
  },

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id, name) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),

  // Customers
  searchCustomers: (q) => request(`/customers/search?q=${encodeURIComponent(q)}`),
  listCustomers: (queryString) => request(`/customers${queryString ? `?${queryString}` : ''}`),
  getCustomer: (id) => request(`/customers/${id}`),
  getCustomerStatement: (id) => request(`/customers/${id}/statement`),
  createCustomer: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deactivateCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  recordPayment: (id, body) => request(`/customers/${id}/payment`, { method: 'POST', body: JSON.stringify(body) }),

  // Suppliers
  getSuppliers: () => request('/suppliers'),
  listSuppliers: (includeInactive = false) => request(`/suppliers${includeInactive ? '?includeInactive=true' : ''}`),
  createSupplier: (body) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  updateSupplier: (id, body) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deactivateSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Categories
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Job Cards
  listJobCards: (status, q) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    return request(`/jobcards${qs ? `?${qs}` : ''}`);
  },
  getJobCard: (id) => request(`/jobcards/${id}`),
  createJobCard: (body) => request('/jobcards', { method: 'POST', body: JSON.stringify(body) }),
  updateJobCard: (id, body) => request(`/jobcards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateJobCardStatus: (id, status) => request(`/jobcards/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Till Close
  getTillClose: (date) => request(`/reports/till-close?date=${date}`),

  // Sales
  createSale: (body) =>
    request('/sales', { method: 'POST', body: JSON.stringify(body) }),
  getSale: (id) => request(`/sales/${id}`),
  getSaleReceiptUrl: (id) => `${BASE}/sales/${id}/receipt`,
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
  downloadSupplierReturnPdf: (id) => `${BASE}/returns/supplier/${id}/pdf`,

  // Reports
  getReportSummary: (from, to) => request(`/reports/summary?from=${from}&to=${to}`),
  getReportDaily: (from, to) => request(`/reports/daily?from=${from}&to=${to}`),
  getReportTopParts: (from, to, limit = 10) => request(`/reports/top-parts?from=${from}&to=${to}&limit=${limit}`),
  getReportLowStock: () => request('/reports/low-stock'),
  getReportSupplierSpend: (from, to) => request(`/reports/supplier-spend?from=${from}&to=${to}`),
  getReportDailyItems: (from, to) => request(`/reports/daily-items?from=${from}&to=${to}`),
  getReportSalesDetail: (from, to) => request(`/reports/sales-detail?from=${from}&to=${to}`),

  // Email queue (admin)
  listEmailQueue: (status) => request(`/email-queue${status ? `?status=${status}` : ''}`),
  getEmailBody: (id) => request(`/email-queue/${id}/body`),
  approveEmail: (id) => request(`/email-queue/${id}/approve`, { method: 'POST' }),
  rejectEmail: (id) => request(`/email-queue/${id}/reject`, { method: 'POST' }),

  // Users (admin)
  listUsers: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  setUserAllowCash: (id, allowCash) => request(`/users/${id}/allowcash`, { method: 'PATCH', body: JSON.stringify({ allowCash }) }),
  setUserActive: (id, isActive) => request(`/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Purchase Orders
  listPOs: (status) =>
    request(`/purchaseorders${status ? `?status=${status}` : ''}`),
  getPO: (id) => request(`/purchaseorders/${id}`),
  createPO: (body) =>
    request('/purchaseorders', { method: 'POST', body: JSON.stringify(body) }),
  receivePOStock: (id, body) =>
    request(`/purchaseorders/${id}/receive`, { method: 'PUT', body: JSON.stringify(body) }),
  cancelPO: (id) =>
    request(`/purchaseorders/${id}/cancel`, { method: 'PUT', body: JSON.stringify({}) }),
  editPO: (id, body) =>
    request(`/purchaseorders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};
