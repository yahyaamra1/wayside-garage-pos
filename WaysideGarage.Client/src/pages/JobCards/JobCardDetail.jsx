import { useState } from 'react';
import { Edit2, Car } from 'lucide-react';
import { api } from '../../api/client';

const STATUS_CLASS = { Open: 'jc-badge-open', InProgress: 'jc-badge-inprogress', Completed: 'jc-badge-completed', Cancelled: 'jc-badge-cancelled' };
const STATUS_LABEL = { Open: 'Open', InProgress: 'In Progress', Completed: 'Completed', Cancelled: 'Cancelled' };

const TRANSITIONS = {
  Open: ['InProgress', 'Cancelled'],
  InProgress: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: []
};

const TRANSITION_LABELS = { InProgress: 'Mark In Progress', Completed: 'Mark Completed', Cancelled: 'Cancel Job' };
const TRANSITION_CLASS = { InProgress: 'jc-btn-inprogress', Completed: 'jc-btn-completed', Cancelled: 'jc-btn-cancel' };

export default function JobCardDetail({ card, onRefresh, onEdit }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function updateStatus(status) {
    if (status === 'Cancelled' && !window.confirm('Cancel this job card?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.updateJobCardStatus(card.id, status);
      if (res?.success) onRefresh();
      else setError(res?.error ?? 'Failed to update status.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  }

  const transitions = TRANSITIONS[card.status] ?? [];
  const total = card.lines.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="jc-detail">
      <div className="jc-detail-header">
        <div className="jc-detail-title-row">
          <h3 className="jc-detail-title">{card.jobNo}</h3>
          <span className={'jc-badge ' + STATUS_CLASS[card.status]}>{STATUS_LABEL[card.status]}</span>
        </div>
        <div className="jc-detail-meta">
          <span><Car size={13} /> <strong>{card.vehicleReg}</strong> — {card.vehicleMake} {card.vehicleModel}</span>
          {card.mileage && <span>Mileage: {card.mileage.toLocaleString()} km</span>}
          {card.customer && <span>Customer: {card.customer.name}{card.customer.phone ? ` (${card.customer.phone})` : ''}</span>}
          <span>Created: {new Date(card.createdAt).toLocaleDateString()} by {card.createdBy}</span>
          {card.completedAt && <span>Completed: {new Date(card.completedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {error && <p className="ret-error">{error}</p>}

      {card.notes && (
        <div className="jc-detail-notes">{card.notes}</div>
      )}

      <table className="jc-lines-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {card.lines.length === 0 ? (
            <tr><td colSpan={5} className="jc-lines-empty">No lines added yet.</td></tr>
          ) : card.lines.map(l => (
            <tr key={l.id}>
              <td><span className={'jc-type-badge jc-type-' + l.type.toLowerCase()}>{l.type}</span></td>
              <td>
                {l.description}
                {l.partNo && <span className="jc-partno"> ({l.partNo})</span>}
              </td>
              <td>R {l.unitPrice.toFixed(2)}</td>
              <td>{l.qty}</td>
              <td className="jc-line-total-cell">R {l.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {card.lines.length > 0 && (
        <div className="jc-detail-total">
          <span>Total</span>
          <strong>R {total.toFixed(2)}</strong>
        </div>
      )}

      <div className="jc-detail-actions">
        {card.status !== 'Cancelled' && card.status !== 'Completed' && (
          <button className="jc-btn-edit" onClick={onEdit} disabled={loading}>
            <Edit2 size={14} /> Edit
          </button>
        )}
        {transitions.map(t => (
          <button key={t} className={'jc-btn-status ' + TRANSITION_CLASS[t]} onClick={() => updateStatus(t)} disabled={loading}>
            {TRANSITION_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
