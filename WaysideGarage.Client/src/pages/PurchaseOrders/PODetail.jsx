import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { api } from '../../api/client';

const STATUS_CLASS = {
  Open: 'po-badge-open',
  PartialReceived: 'po-badge-partial',
  Received: 'po-badge-received',
  Cancelled: 'po-badge-cancelled'
};

const STATUS_LABEL = {
  Open: 'Open',
  PartialReceived: 'Partial',
  Received: 'Received',
  Cancelled: 'Cancelled'
};

export default function PODetail({ po, onRefresh, onEdit }) {
  const [receiveQtys, setReceiveQtys] = useState({});
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canReceive = po.status === 'Open' || po.status === 'PartialReceived';
  const canCancel = po.status === 'Open';

  function setLineReceive(lineId, val, max) {
    const n = Math.min(max, Math.max(0, parseInt(val) || 0));
    setReceiveQtys(prev => ({ ...prev, [lineId]: n }));
  }

  async function receiveStock() {
    const lines = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ lineId: parseInt(id), qtyReceiving: qty }));

    if (lines.length === 0) { setError('Enter quantity to receive for at least one line.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.receivePOStock(po.id, { lines });
      if (res?.success) {
        setSuccess(`Stock received. Order is now: ${res.data.status}`);
        setReceiveQtys({});
        onRefresh();
      } else {
        setError(res?.error ?? 'Receive failed.');
      }
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  async function cancelPO() {
    if (!window.confirm('Cancel this purchase order?')) return;
    setCancelling(true);
    try {
      const res = await api.cancelPO(po.id);
      if (res?.success) onRefresh();
      else setError(res?.error ?? 'Cancel failed.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="po-detail">
      <div className="po-detail-header">
        <div className="po-detail-title-row">
          <h3 className="po-detail-title">PO #{String(po.id).padStart(5, '0')}</h3>
          <span className={'po-badge ' + STATUS_CLASS[po.status]}>{STATUS_LABEL[po.status]}</span>
        </div>
        <div className="po-detail-meta">
          <span><strong>Supplier:</strong> {po.supplier.name}{po.supplier.accountNo ? ` (${po.supplier.accountNo})` : ''}</span>
          <span><strong>Date:</strong> {new Date(po.date).toLocaleDateString()}</span>
          <span><strong>Created by:</strong> {po.createdBy}</span>
          {po.notes && <span><strong>Notes:</strong> {po.notes}</span>}
        </div>
      </div>

      {success && (
        <div className="ret-success">
          {success}
          <button className="ret-success-dismiss" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {error && <p className="ret-error">{error}</p>}

      <table className="po-lines-table">
        <thead>
          <tr>
            <th>Part No</th>
            <th>Description</th>
            <th>Unit Cost</th>
            <th>Ordered</th>
            <th>Received</th>
            <th>Remaining</th>
            {canReceive && <th>Receive Now</th>}
          </tr>
        </thead>
        <tbody>
          {po.lines.map(l => (
            <tr key={l.id} className={l.remaining === 0 ? 'po-line-done' : ''}>
              <td className="po-partno">{l.partNo}</td>
              <td>{l.description}</td>
              <td>R {l.unitCost.toFixed(2)}</td>
              <td>{l.qtyOrdered}</td>
              <td>{l.qtyReceived > 0 ? <span className="po-received-qty">{l.qtyReceived}</span> : '—'}</td>
              <td>{l.remaining > 0 ? <span className="po-remaining-qty">{l.remaining}</span> : <span className="po-done-tick">✓</span>}</td>
              {canReceive && (
                <td>
                  {l.remaining > 0
                    ? <input
                        type="number"
                        className="po-num-input"
                        min="0"
                        max={l.remaining}
                        value={receiveQtys[l.id] ?? ''}
                        placeholder="0"
                        onChange={e => setLineReceive(l.id, e.target.value, l.remaining)}
                      />
                    : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="po-detail-totals">
        <span>Total order value: <strong>R {po.totalValue.toFixed(2)}</strong></span>
      </div>

      {(canReceive || canCancel) && (
        <div className="po-detail-actions">
          {canCancel && onEdit && (
            <button className="po-edit-btn" onClick={onEdit}>
              <Edit2 size={14} /> Edit PO
            </button>
          )}
          {canCancel && (
            <button className="po-cancel-btn" onClick={cancelPO} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
          {canReceive && (
            <button className="po-receive-btn" onClick={receiveStock} disabled={loading}>
              {loading ? 'Processing…' : 'Confirm Receipt'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
