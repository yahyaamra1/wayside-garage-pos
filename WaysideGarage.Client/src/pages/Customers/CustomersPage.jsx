import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import CustomerDetail from './CustomerDetail';
import CustomerForm from './CustomerForm';
import './CustomersPage.css';

function useDebounce(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');
  const [tradeOnly, setTradeOnly] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const debouncedQ = useDebounce(q);

  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const user = JSON.parse(localStorage.getItem('wg_user') ?? '{}');
  const isAdmin = user.role === 'Admin';

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set('q', debouncedQ);
      if (tradeOnly) params.set('tradeOnly', 'true');
      if (includeInactive) params.set('includeInactive', 'true');
      const res = await api.listCustomers(params.toString());
      if (!res?.success) throw new Error(res?.error ?? 'Failed to load customers.');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, tradeOnly, includeInactive]);

  useEffect(() => { loadList(); }, [loadList]);

  function openCreate() {
    setEditCustomer(null);
    setShowForm(true);
  }

  function openEdit(customer) {
    setEditCustomer(customer);
    setShowForm(true);
  }

  async function handleSave(body) {
    let res;
    if (editCustomer) {
      res = await api.updateCustomer(editCustomer.id, body);
    } else {
      res = await api.createCustomer(body);
    }
    if (!res?.success) throw new Error(res?.error ?? 'Save failed.');
    setShowForm(false);
    setEditCustomer(null);
    await loadList();
    if (!editCustomer && res.data?.id) setSelectedId(res.data.id);
  }

  async function handleDeactivate(customer) {
    if (!confirm(`Deactivate "${customer.name}"?`)) return;
    const res = await api.deactivateCustomer(customer.id);
    if (res?.success) {
      if (selectedId === customer.id) setSelectedId(null);
      await loadList();
    } else {
      alert(res?.error ?? 'Deactivate failed.');
    }
  }

  return (
    <div className="cust-page">
      <div className="cust-sidebar">
        <div className="cust-sidebar-header">
          <h1 className="cust-title">Customers</h1>
          <button className="cust-btn-primary" onClick={openCreate}>+ New</button>
        </div>

        <div className="cust-filters">
          <input
            className="cust-search"
            placeholder="Search name, phone, email…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="cust-check-row">
            <label className="toggle-label">
              <input type="checkbox" checked={tradeOnly} onChange={e => setTradeOnly(e.target.checked)} />
              Trade only
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
              Include inactive
            </label>
          </div>
        </div>

        {loading ? (
          <div className="cust-list-loading">Loading…</div>
        ) : error ? (
          <div className="cust-list-error">{error}</div>
        ) : customers.length === 0 ? (
          <div className="cust-list-empty">No customers found.</div>
        ) : (
          <ul className="cust-list">
            {customers.map(c => (
              <li
                key={c.id}
                className={`cust-list-item ${selectedId === c.id ? 'active' : ''} ${!c.isActive ? 'inactive' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="cust-list-name">
                  {c.name}
                  {c.isTradeAccount && <span className="cust-badge-trade">Trade</span>}
                </div>
                <div className="cust-list-sub">
                  {c.phone && <span>{c.phone}</span>}
                  {c.isTradeAccount && (
                    <span className={c.balance > 0 ? 'cust-text-warning' : ''}>
                      R {c.balance.toFixed(2)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cust-main">
        {selectedId ? (
          <CustomerDetail
            key={selectedId}
            customerId={selectedId}
            onEdit={openEdit}
            onDeactivate={handleDeactivate}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="cust-main-empty">
            <p>Select a customer to view details</p>
            <button className="cust-btn-primary" onClick={openCreate}>+ Add Customer</button>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditCustomer(null); }}
        />
      )}
    </div>
  );
}
