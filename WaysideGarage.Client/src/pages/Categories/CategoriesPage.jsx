import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Trash2, Edit2 } from 'lucide-react';
import { api } from '../../api/client';
import './CategoriesPage.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCategories();
      if (res?.success) setCategories(res.data);
      else setError('Failed to load categories.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await api.updateCategory(id, editName.trim());
    setSaving(false);
    if (res?.success) { setEditingId(null); load(); }
    else setError(res?.error ?? 'Save failed.');
  }

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await api.createCategory(newName.trim());
    setSaving(false);
    if (res?.success) { setNewName(''); setAddingNew(false); load(); }
    else setError(res?.error ?? 'Save failed.');
  }

  async function deleteCategory(cat) {
    if (cat.partCount > 0) {
      setError(`Cannot delete "${cat.name}" — it has ${cat.partCount} part(s) assigned.`);
      return;
    }
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    const res = await api.deleteCategory(cat.id);
    if (res?.success) load();
    else setError(res?.error ?? 'Delete failed.');
  }

  return (
    <div className="cat-page">
      <div className="cat-header">
        <h2 className="cat-title">Categories</h2>
        <button className="cat-add-btn" onClick={() => { setAddingNew(true); setNewName(''); }}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      {error && <p className="ret-error" style={{ flexShrink: 0 }}>{error}</p>}

      {loading ? <p className="po-loading">Loading…</p> : (
        <div className="cat-list-wrap">
          <ul className="cat-list">
            {addingNew && (
              <li className="cat-item cat-item-new">
                <input
                  className="cat-edit-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Category name…"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingNew(false); }}
                />
                <div className="cat-item-actions">
                  <button className="cat-icon-btn confirm" onClick={addCategory} disabled={saving}><Check size={14} /></button>
                  <button className="cat-icon-btn" onClick={() => setAddingNew(false)}><X size={14} /></button>
                </div>
              </li>
            )}
            {categories.map(cat => (
              <li key={cat.id} className="cat-item">
                {editingId === cat.id ? (
                  <>
                    <input
                      className="cat-edit-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <div className="cat-item-actions">
                      <button className="cat-icon-btn confirm" onClick={() => saveEdit(cat.id)} disabled={saving}><Check size={14} /></button>
                      <button className="cat-icon-btn" onClick={() => setEditingId(null)}><X size={14} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cat-item-info">
                      <span className="cat-item-name">{cat.name}</span>
                      <span className="cat-item-count">{cat.partCount} part{cat.partCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="cat-item-actions">
                      <button className="cat-icon-btn" onClick={() => startEdit(cat)} title="Rename"><Edit2 size={13} /></button>
                      <button className="cat-icon-btn danger" onClick={() => deleteCategory(cat)} title="Delete" disabled={cat.partCount > 0}><Trash2 size={13} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
