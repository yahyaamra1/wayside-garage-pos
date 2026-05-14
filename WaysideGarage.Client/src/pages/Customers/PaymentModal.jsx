import { useState } from 'react';
import { api } from '../../api/client';

export default function PaymentModal({ customer, onClose, onPaid }) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
    setSubmitting(true);
    setError(null);
    const res = await api.recordPayment(customer.id, { amount: amt, reference: reference || null, notes: notes || null });
    if (res?.success) {
      onPaid(res.data.newBalance);
    } else {
      setError(res?.error ?? 'Payment failed.');
      setSubmitting(false);
    }
  }

  return (
    <div className="cust-modal-overlay">
      <div className="cust-modal">
        <div className="cust-modal-header">
          <h3>Record Payment — {customer.name}</h3>
          <button className="cust-form-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="cust-modal-body">
          {error && <div className="cust-form-error">{error}</div>}

          <div className="cust-balance-info">
            <span>Outstanding Balance</span>
            <span className="cust-balance-amount">R {customer.balance?.toFixed(2)}</span>
          </div>

          <label className="cust-label">
            Amount (R) *
            <input
              className="cust-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className="cust-label">
            Reference
            <input
              className="cust-input"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="EFT ref, cheque no., etc."
            />
          </label>

          <label className="cust-label">
            Notes
            <input
              className="cust-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </label>

          <div className="cust-form-actions">
            <button type="button" className="cust-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="cust-btn-primary" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
