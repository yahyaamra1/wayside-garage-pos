import { useState } from 'react';
import { api } from '../../api/client';

export default function StockAdjustModal({ part, onClose, onAdjusted }) {
  const [adjustQty, setAdjustQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const qty = parseInt(adjustQty) || 0;
  const newStock = part.stockQty + qty;

  async function confirm() {
    setError(null);
    if (qty === 0) { setError('Enter a non-zero adjustment.'); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }
    if (newStock < 0) { setError(`Result would be negative stock (${newStock}).`); return; }

    setLoading(true);
    try {
      const res = await api.adjustStock(part.id, { adjustmentQty: qty, reason });
      if (res?.success) onAdjusted(res.data.newQty);
      else setError(res?.error ?? 'Adjustment failed.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ width: 380 }}>
        <h3 className="modal-title">Stock Adjustment</h3>

        <div className="inv-adjust-info">
          <div><span>Part</span><strong>{part.partNo}</strong></div>
          <div><span>Description</span><span>{part.description}</span></div>
          <div><span>Current stock</span><strong>{part.stockQty}</strong></div>
        </div>

        <div className="modal-field">
          <label>Adjustment (+/−)</label>
          <input
            type="number"
            value={adjustQty}
            onChange={e => setAdjustQty(e.target.value)}
            placeholder="e.g. +5 or -2"
            autoFocus
          />
          <p className="inv-adjust-hint">
            Use positive to increase stock, negative to decrease.
          </p>
        </div>

        {qty !== 0 && (
          <div className={'inv-adjust-preview ' + (newStock < 0 ? 'negative' : newStock <= part.reorderLevel ? 'low' : 'ok')}>
            New stock will be: <strong>{newStock}</strong>
          </div>
        )}

        <div className="modal-field">
          <label>Reason *</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Stock take, damage, write-off…"
          />
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="modal-btn-primary" onClick={confirm} disabled={loading || newStock < 0}>
            {loading ? 'Adjusting…' : 'Confirm Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
