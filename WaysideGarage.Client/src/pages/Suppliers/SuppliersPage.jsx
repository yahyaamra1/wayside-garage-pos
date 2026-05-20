import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import './SuppliersPage.css';

const EMPTY_FORM = { name: '', contactName: '', phone: '', email: '', accountNo: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null); // null = closed, 'new' = new, obj = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listSuppliers(includeInactive);
      if (res?.success) setSuppliers(res.data);
      else setError('Failed to load suppliers.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  }, [includeInactive]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditSupplier('new');
  }

  function openEdit(s) {
    setForm({ name: s.name, contactName: s.contactName ?? '', phone: s.phone ?? '', email: s.email ?? '', accountNo: s.accountNo ?? '' });
    setFormError(null);
    setEditSupplier(s);
  }

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { name: form.name, contactName: form.contactName || null, phone: form.phone || null, email: form.email || null, accountNo: form.accountNo || null };
      const res = editSupplier === 'new'
        ? await api.createSupplier(body)
        : await api.updateSupplier(editSupplier.id, body);
      if (!res?.success) { setFormError(res?.error ?? 'Save failed.'); return; }
      setEditSupplier(null);
      load();
    } catch { setFormError('Cannot reach server.'); }
    finally { setSaving(false); }
  }

  async function deactivate(s) {
    if (!window.confirm(`Deactivate supplier "${s.name}"?`)) return;
    const res = await api.deactivateSupplier(s.id);
    if (res?.success) load();
    else setError(res?.error ?? 'Failed.');
  }

  return (
    <div className="sup-page">
      <div className="sup-header">
        <h2 className="sup-title">Suppliers</h2>
        <div className="sup-header-actions">
          <label className="sup-toggle-label">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
            Show inactive
          </label>
          <button className="sup-add-btn" onClick={openNew}><Plus size={15} /> Add Supplier</button>
        </div>
      </div>

      {error && <p className="ret-error">{error}</p>}

      {loading ? <p className="po-loading">Loading…</p> : suppliers.length === 0 ? (
        <p className="po-empty">No suppliers found.</p>
      ) : (
        <div className="sup-table-wrap">
          <table className="sup-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Account No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className={!s.isActive ? 'sup-row-inactive' : ''}>
                  <td className="sup-name">{s.name}</td>
                  <td className="sup-muted">{s.contactName ?? '—'}</td>
                  <td className="sup-muted">{s.phone ?? '—'}</td>
                  <td className="sup-muted">{s.email ?? '—'}</td>
                  <td className="sup-muted">{s.accountNo ?? '—'}</td>
                  <td className="sup-actions-cell">
                    <button className="sup-action-btn" onClick={() => openEdit(s)} title="Edit"><Edit2 size={13} /></button>
                    {s.isActive && <button className="sup-action-btn danger" onClick={() => deactivate(s)} title="Deactivate"><XCircle size={13} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editSupplier !== null && (
        <div className="sup-overlay">
          <div className="sup-panel">
            <div className="sup-panel-header">
              <h3>{editSupplier === 'new' ? 'New Supplier' : `Edit — ${editSupplier.name}`}</h3>
              <button className="sup-panel-close" onClick={() => setEditSupplier(null)}>✕</button>
            </div>
            <form className="sup-form" onSubmit={submit}>
              <div className="sup-field">
                <label>Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. AutoZone SA" />
              </div>
              <div className="sup-field">
                <label>Contact Person</label>
                <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div className="sup-form-row">
                <div className="sup-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="011 123 4567" />
                </div>
                <div className="sup-field">
                  <label>Account No</label>
                  <input value={form.accountNo} onChange={e => set('accountNo', e.target.value)} placeholder="AZ-001" />
                </div>
              </div>
              <div className="sup-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="orders@supplier.co.za" />
              </div>
              {formError && <p className="ret-error">{formError}</p>}
              <div className="sup-form-footer">
                <button type="button" className="modal-btn-secondary" onClick={() => setEditSupplier(null)}>Cancel</button>
                <button type="submit" className="modal-btn-primary" disabled={saving}>{saving ? 'Saving…' : editSupplier === 'new' ? 'Create Supplier' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
