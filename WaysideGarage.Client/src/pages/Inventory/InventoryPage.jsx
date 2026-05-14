import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Sliders, AlertTriangle, Package, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import PartForm from './PartForm';
import StockAdjustModal from './StockAdjustModal';
import './InventoryPage.css';

export default function InventoryPage() {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editPart, setEditPart] = useState(null);   // null=hidden, 'new'=create, object=edit
  const [adjustPart, setAdjustPart] = useState(null);

  const user = JSON.parse(localStorage.getItem('wg_user') ?? '{}');
  const isAdmin = user.role === 'Admin';

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (catFilter) params.set('categoryId', catFilter);
      if (lowStockOnly) params.set('lowStockOnly', 'true');
      if (showInactive) params.set('includeInactive', 'true');
      const res = await api.listParts(params.toString());
      if (res?.success) setParts(res.data);
      else setError('Failed to load parts.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, lowStockOnly, showInactive]);

  useEffect(() => { loadParts(); }, [loadParts]);

  useEffect(() => {
    api.getCategories().then(r => { if (r?.success) setCategories(r.data); });
  }, []);

  const total = parts.length;
  const outOfStock = parts.filter(p => p.stockQty === 0 && p.isActive).length;
  const lowStock = parts.filter(p => p.stockStatus === 'Low' && p.isActive).length;

  function handleSaved() {
    setEditPart(null);
    loadParts();
  }

  function handleAdjusted(partId, newQty) {
    setParts(prev => prev.map(p => p.id === partId ? { ...p, stockQty: newQty, stockStatus: newQty === 0 ? 'OutOfStock' : newQty <= p.reorderLevel ? 'Low' : 'OK' } : p));
    setAdjustPart(null);
  }

  async function deactivate(part) {
    if (!window.confirm(`Deactivate "${part.partNo} — ${part.description}"? It will no longer appear in the POS.`)) return;
    const res = await api.deactivatePart(part.id);
    if (res?.success) loadParts();
  }

  return (
    <div className="inv-page">
      {/* Stats bar */}
      <div className="inv-stats">
        <div className="inv-stat">
          <Package size={18} className="inv-stat-icon ok" />
          <div>
            <div className="inv-stat-value">{total}</div>
            <div className="inv-stat-label">Total Parts</div>
          </div>
        </div>
        <div className="inv-stat">
          <AlertTriangle size={18} className="inv-stat-icon low" />
          <div>
            <div className="inv-stat-value">{lowStock}</div>
            <div className="inv-stat-label">Low Stock</div>
          </div>
        </div>
        <div className="inv-stat">
          <XCircle size={18} className="inv-stat-icon out" />
          <div>
            <div className="inv-stat-value">{outOfStock}</div>
            <div className="inv-stat-label">Out of Stock</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <input
          className="inv-search"
          type="text"
          placeholder="Search part number or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="inv-toggle-label">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
        <label className="inv-toggle-label">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        {isAdmin && (
          <button className="inv-add-btn" onClick={() => setEditPart('new')}>
            <Plus size={15} /> Add Part
          </button>
        )}
      </div>

      {error && <p className="ret-error inv-error">{error}</p>}

      {/* Parts table */}
      {loading ? (
        <p className="po-loading">Loading…</p>
      ) : parts.length === 0 ? (
        <p className="po-empty">No parts found.</p>
      ) : (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Cost (R)</th>
                <th>Sell (R)</th>
                <th>Stock</th>
                <th>Reorder</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id} className={!p.isActive ? 'inv-row-inactive' : ''}>
                  <td className="inv-partno">{p.partNo}</td>
                  <td>{p.description}</td>
                  <td className="inv-muted">{p.category}</td>
                  <td className="inv-muted">{p.supplier ?? '—'}</td>
                  <td>{p.costPrice.toFixed(2)}</td>
                  <td className="inv-sell">{p.sellPrice.toFixed(2)}</td>
                  <td>
                    <span className={'inv-stock-badge inv-stock-' + p.stockStatus.toLowerCase()}>
                      {p.stockQty}
                    </span>
                  </td>
                  <td className="inv-muted">{p.reorderLevel}</td>
                  {isAdmin && (
                    <td className="inv-actions-cell">
                      <button className="inv-action-btn" onClick={() => setEditPart(p)} title="Edit"><Edit2 size={13} /></button>
                      {p.isActive && (
                        <button className="inv-action-btn" onClick={() => setAdjustPart(p)} title="Adjust stock"><Sliders size={13} /></button>
                      )}
                      {p.isActive && (
                        <button className="inv-action-btn danger" onClick={() => deactivate(p)} title="Deactivate"><XCircle size={13} /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editPart && (
        <PartForm
          part={editPart === 'new' ? null : editPart}
          onSaved={handleSaved}
          onClose={() => setEditPart(null)}
        />
      )}

      {adjustPart && (
        <StockAdjustModal
          part={adjustPart}
          onClose={() => setAdjustPart(null)}
          onAdjusted={(newQty) => handleAdjusted(adjustPart.id, newQty)}
        />
      )}
    </div>
  );
}
