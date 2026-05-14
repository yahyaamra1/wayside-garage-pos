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
};
