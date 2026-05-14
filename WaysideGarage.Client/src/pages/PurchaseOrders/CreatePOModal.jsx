import { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Plus } from 'lucide-react';
import { api } from '../../api/client';

export default function CreatePOModal({ onClose, onCreated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [partQuery, setPartQuery] = useState('');
  const [partResults, setPartResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    api.getSuppliers().then(res => { if (res?.success) setSuppliers(res.data); });
  }, []);

  function handlePartSearch(val) {
    setPartQuery(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setPartResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await api.searchParts(val);
      if (res?.success) setPartResults(res.data);
    }, 280);
  }

  function addLine(part) {
    if (lines.find(l => l.partId === part.id)) {
      setPartQuery('');
      setPartResults([]);
      return;
    }
    setLines(prev => [...prev, {
      partId: part.id,
      partNo: part.partNo,
      description: part.description,
      qtyOrdered: 1,
      unitCost: part.costPrice ?? 0
    }]);
    setPartQuery('');
    setPartResults([]);
  }

  function updateLine(partId, field, val) {
    setLines(prev => prev.map(l =>
      l.partId === partId ? { ...l, [field]: field === 'qtyOrdered' ? Math.max(1, parseInt(val) || 1) : Math.max(0, parseFloat(val) || 0) } : l
    ));
  }

  function removeLine(partId) {
    setLines(prev => prev.filter(l => l.partId !== partId));
  }

  async function submit() {
    setError(null);
    if (!supplierId) { setError('Select a supplier.'); return; }
    if (lines.length === 0) { setError('Add at least one part.'); return; }

    setLoading(true);
    try {
      const res = await api.createPO({
        supplierId: parseInt(supplierId),
        lines: lines.map(l => ({ partId: l.partId, qtyOrdered: l.qtyOrdered, unitCost: l.unitCost })),
        notes: notes.trim() || null
      });
      if (res?.success) onCreated(res.data.id);
      else setError(res?.error ?? 'Failed to create PO.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  const totalValue = lines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0);

  return (
    <div className="modal-overlay">
      <div className="po-create-modal">
        <h3 className="modal-title">New Purchase Order</h3>

        <div className="po-create-fields">
          <div className="modal-field">
            <label>Supplier</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.accountNo ? ` (${s.accountNo})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label>Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference, delivery instructions…" />
          </div>
        </div>

        {/* Part search */}
        <div className="po-part-search-wrap">
          <label className="modal-label">Add Parts</label>
          <div className="ret-part-bar">
            <Search size={14} className="ret-part-icon" />
            <input
              type="text"
              placeholder="Search part number or description…"
              value={partQuery}
              onChange={e => handlePartSearch(e.target.value)}
            />
          </div>
          {partResults.length > 0 && (
            <ul className="ret-part-dropdown">
              {partResults.map(p => (
                <li key={p.id} onClick={() => addLine(p)}>
                  <span className="ret-part-no">{p.partNo}</span>
                  <span>{p.description}</span>
                  <span className="ret-part-stock">Cost: R {p.costPrice?.toFixed(2) ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <table className="po-lines-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>Qty Ordered</th>
                <th>Unit Cost (R)</th>
                <th>Line Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.partId}>
                  <td className="po-partno">{l.partNo}</td>
                  <td>{l.description}</td>
                  <td>
                    <input
                      type="number" min="1"
                      className="po-num-input"
                      value={l.qtyOrdered}
                      onChange={e => updateLine(l.partId, 'qtyOrdered', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0" step="0.01"
                      className="po-num-input"
                      value={l.unitCost}
                      onChange={e => updateLine(l.partId, 'unitCost', e.target.value)}
                    />
                  </td>
                  <td>R {(l.qtyOrdered * l.unitCost).toFixed(2)}</td>
                  <td>
                    <button className="po-remove-btn" onClick={() => removeLine(l.partId)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {lines.length > 0 && (
          <div className="po-total-row">
            Total order value: <strong>R {totalValue.toFixed(2)}</strong>
          </div>
        )}

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn-primary" onClick={submit} disabled={loading || lines.length === 0}>
            {loading ? 'Creating…' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
