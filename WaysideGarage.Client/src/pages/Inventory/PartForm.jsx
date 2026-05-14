import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function PartForm({ part, onSaved, onClose }) {
  const isEdit = !!part;
  const [form, setForm] = useState({
    partNo: part?.partNo ?? '',
    description: part?.description ?? '',
    categoryId: part?.categoryId ?? '',
    supplierId: part?.supplierId ?? '',
    costPrice: part?.costPrice ?? '',
    sellPrice: part?.sellPrice ?? '',
    reorderLevel: part?.reorderLevel ?? 0,
    initialStock: 0
  });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    api.getCategories().then(r => { if (r?.success) setCategories(r.data); });
    api.getSuppliers().then(r => { if (r?.success) setSuppliers(r.data); });
  }, []);

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const res = await api.createCategory(newCatName.trim());
    if (res?.success) {
      setCategories(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      set('categoryId', res.data.id);
      setNewCatName('');
      setAddingCat(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        partNo: form.partNo,
        description: form.description,
        categoryId: parseInt(form.categoryId),
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        costPrice: parseFloat(form.costPrice) || 0,
        sellPrice: parseFloat(form.sellPrice) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        initialStock: isEdit ? null : parseInt(form.initialStock) || 0
      };

      const res = isEdit
        ? await api.updatePart(part.id, body)
        : await api.createPart(body);

      if (res?.success) onSaved();
      else setError(res?.error ?? 'Save failed.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inv-form-overlay">
      <div className="inv-form-panel">
        <div className="inv-form-header">
          <h3>{isEdit ? `Edit — ${part.partNo}` : 'New Part'}</h3>
          <button className="inv-form-close" onClick={onClose}>✕</button>
        </div>

        <form className="inv-form" onSubmit={submit}>
          <div className="inv-form-row">
            <div className="inv-field">
              <label>Part Number *</label>
              <input value={form.partNo} onChange={e => set('partNo', e.target.value)} placeholder="e.g. BP-4321" required />
            </div>
            <div className="inv-field" style={{ flex: 2 }}>
              <label>Description *</label>
              <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Front Brake Pad Set" required />
            </div>
          </div>

          <div className="inv-form-row">
            <div className="inv-field">
              <label>Category *</label>
              {addingCat ? (
                <div className="inv-cat-add-row">
                  <input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="New category name"
                    autoFocus
                  />
                  <button type="button" className="inv-btn-sm-primary" onClick={addCategory}>Add</button>
                  <button type="button" className="inv-btn-sm" onClick={() => setAddingCat(false)}>✕</button>
                </div>
              ) : (
                <div className="inv-cat-row">
                  <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="inv-btn-sm" onClick={() => setAddingCat(true)} title="Add new category">+</button>
                </div>
              )}
            </div>
            <div className="inv-field">
              <label>Supplier</label>
              <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="inv-form-row">
            <div className="inv-field">
              <label>Cost Price (R)</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0.00" />
            </div>
            <div className="inv-field">
              <label>Sell Price (R)</label>
              <input type="number" min="0" step="0.01" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} placeholder="0.00" required />
            </div>
            <div className="inv-field">
              <label>Reorder Level</label>
              <input type="number" min="0" value={form.reorderLevel} onChange={e => set('reorderLevel', e.target.value)} />
            </div>
          </div>

          {!isEdit && (
            <div className="inv-form-row">
              <div className="inv-field">
                <label>Opening Stock</label>
                <input type="number" min="0" value={form.initialStock} onChange={e => set('initialStock', e.target.value)} />
              </div>
              <div className="inv-field inv-field-hint">
                <p>Opening stock can only be set on creation. Use stock adjustment to correct stock later.</p>
              </div>
            </div>
          )}

          {form.costPrice && form.sellPrice && (
            <p className="inv-margin-hint">
              Margin: R {(parseFloat(form.sellPrice) - parseFloat(form.costPrice)).toFixed(2)}
              {' '}({parseFloat(form.costPrice) > 0
                ? (((parseFloat(form.sellPrice) - parseFloat(form.costPrice)) / parseFloat(form.costPrice)) * 100).toFixed(1)
                : '—'}%)
            </p>
          )}

          {error && <p className="ret-error">{error}</p>}

          <div className="inv-form-footer">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
