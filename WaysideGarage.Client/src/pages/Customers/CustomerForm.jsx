import { useState, useEffect } from 'react';

export default function CustomerForm({ customer, onSave, onClose }) {
  const isEdit = !!customer;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    isTradeAccount: false,
    creditLimit: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        isTradeAccount: customer.isTradeAccount,
        creditLimit: customer.creditLimit,
      });
    }
  }, [customer]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        isTradeAccount: form.isTradeAccount,
        creditLimit: form.isTradeAccount ? Number(form.creditLimit) : 0,
      });
    } catch (err) {
      setError(err.message ?? 'Save failed.');
      setSaving(false);
    }
  }

  return (
    <div className="cust-form-overlay">
      <div className="cust-form-panel">
        <div className="cust-form-header">
          <h2>{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button className="cust-form-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="cust-form-body">
          {error && <div className="cust-form-error">{error}</div>}

          <label className="cust-label">
            Name *
            <input
              className="cust-input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="cust-label">
            Phone
            <input
              className="cust-input"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="e.g. 011 555 1234"
            />
          </label>

          <label className="cust-label">
            Email
            <input
              className="cust-input"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="optional"
            />
          </label>

          <label className="cust-checkbox-label">
            <input
              type="checkbox"
              checked={form.isTradeAccount}
              onChange={e => set('isTradeAccount', e.target.checked)}
            />
            Trade Account
          </label>

          {form.isTradeAccount && (
            <label className="cust-label">
              Credit Limit (R)
              <input
                className="cust-input"
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onChange={e => set('creditLimit', e.target.value)}
              />
            </label>
          )}

          <div className="cust-form-actions">
            <button type="button" className="cust-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cust-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
