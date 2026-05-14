import { useState } from 'react';
import { api } from '../../api/client';

const PAYMENT_METHODS = ['Cash', 'Card', 'Account'];

export default function CheckoutModal({ lines, customer, totalDiscount, onClose, onSuccess }) {
  const [payMethod, setPayMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creditWarning, setCreditWarning] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const subTotal = lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);
  const total = Math.max(0, subTotal - (parseFloat(totalDiscount) || 0));

  async function submit(ackCredit = false) {
    setLoading(true);
    setError(null);
    try {
      const body = {
        customerId: customer?.id ?? null,
        lines: lines.map(l => ({
          partId: l.partId,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct
        })),
        discountAmount: parseFloat(totalDiscount) || 0,
        paymentMethod: payMethod,
        notes: notes || null,
        acknowledgedCreditWarning: ackCredit
      };

      const res = await api.createSale(body);

      if (res?.creditWarning) {
        setCreditWarning(res.error);
        setLoading(false);
        return;
      }

      if (res?.success) {
        onSuccess(res.data.id);
      } else {
        setError(res?.error ?? 'Sale failed.');
      }
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  if (creditWarning && !acknowledged) {
    return (
      <div className="modal-overlay">
        <div className="modal-box">
          <h3 className="modal-title warning">Credit Warning</h3>
          <p className="modal-warning-msg">{creditWarning}</p>
          <p className="modal-warning-sub">Do you want to proceed anyway?</p>
          <div className="modal-actions">
            <button className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="modal-btn-warning" onClick={() => { setAcknowledged(true); submit(true); }}>
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-title">Confirm Sale</h3>

        {customer && (
          <div className="modal-customer">
            <span>Customer:</span>
            <strong>{customer.name}</strong>
          </div>
        )}

        <div className="modal-summary">
          {lines.map(l => (
            <div key={l.partId} className="modal-line">
              <span>{l.partNo} × {l.qty}</span>
              <span>R {(l.qty * l.unitPrice * (1 - l.discountPct / 100)).toFixed(2)}</span>
            </div>
          ))}
          {parseFloat(totalDiscount) > 0 && (
            <div className="modal-line discount">
              <span>Discount</span>
              <span>- R {parseFloat(totalDiscount).toFixed(2)}</span>
            </div>
          )}
          <div className="modal-line total">
            <span>TOTAL</span>
            <span>R {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="modal-field">
          <label>Payment Method</label>
          <div className="modal-pay-methods">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m}
                className={'modal-pay-btn' + (payMethod === m ? ' selected' : '')}
                onClick={() => setPayMethod(m)}
                disabled={m === 'Account' && !customer?.isTradeAccount}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-field">
          <label>Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reference, vehicle reg, etc."
          />
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn-primary" onClick={() => submit(false)} disabled={loading}>
            {loading ? 'Processing…' : `Confirm  R ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
