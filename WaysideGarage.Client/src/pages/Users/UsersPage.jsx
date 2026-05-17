import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import './UsersPage.css';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listUsers();
      if (!res?.success) throw new Error(res?.error ?? 'Failed to load users.');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAllowCash(user) {
    const res = await api.setUserAllowCash(user.id, !user.allowCash);
    if (res?.success) load();
    else alert(res?.error ?? 'Update failed.');
  }

  async function toggleActive(user) {
    const res = await api.setUserActive(user.id, !user.isActive);
    if (res?.success) load();
    else alert(res?.error ?? 'Update failed.');
  }

  return (
    <div className="usr-page">
      <div className="usr-header">
        <h1 className="usr-title">User Management</h1>
        <button className="usr-btn-primary" onClick={() => setShowForm(true)}>+ New User</button>
      </div>

      {loading ? (
        <div className="usr-loading">Loading…</div>
      ) : error ? (
        <div className="usr-error">{error}</div>
      ) : (
        <div className="usr-table-wrap">
          <table className="usr-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Cash Payments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.isActive ? 'usr-row-inactive' : ''}>
                  <td>{u.fullName}</td>
                  <td className="usr-username">{u.username}</td>
                  <td>
                    <span className={`usr-role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td>
                    <button
                      className={`usr-toggle ${u.allowCash ? 'on' : 'off'}`}
                      onClick={() => toggleAllowCash(u)}
                      title={u.allowCash ? 'Click to restrict to card only' : 'Click to allow cash'}
                    >
                      {u.allowCash ? 'Allowed' : 'Card only'}
                    </button>
                  </td>
                  <td>
                    <span className={`usr-status ${u.isActive ? 'active' : 'inactive'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`usr-btn-sm ${u.isActive ? 'danger' : 'success'}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NewUserForm
          onSaved={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function NewUserForm({ onSaved, onClose }) {
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'Cashier', allowCash: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.createUser(form);
      if (res?.success) onSaved();
      else setError(res?.error ?? 'Create failed.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="usr-overlay">
      <div className="usr-form-panel">
        <div className="usr-form-header">
          <h3>New User</h3>
          <button className="usr-form-close" onClick={onClose}>✕</button>
        </div>
        <form className="usr-form" onSubmit={submit}>
          <div className="usr-field">
            <label>Full Name *</label>
            <input value={form.fullName} onChange={e => set('fullName', e.target.value)} required placeholder="e.g. Jane Smith" />
          </div>
          <div className="usr-field">
            <label>Username *</label>
            <input value={form.username} onChange={e => set('username', e.target.value)} required placeholder="e.g. jsmith" autoCapitalize="none" />
          </div>
          <div className="usr-field">
            <label>Password *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Min 6 characters" />
          </div>
          <div className="usr-form-row">
            <div className="usr-field">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="Cashier">Cashier</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="usr-field">
              <label>Cash Payments</label>
              <select value={form.allowCash ? 'true' : 'false'} onChange={e => set('allowCash', e.target.value === 'true')}>
                <option value="true">Allowed</option>
                <option value="false">Card only</option>
              </select>
            </div>
          </div>
          {error && <p className="usr-error-msg">{error}</p>}
          <div className="usr-form-footer">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
