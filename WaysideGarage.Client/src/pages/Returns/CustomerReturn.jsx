import { useState } from 'react';
import { api } from '../../api/client';

const OUTCOMES = ['Refund', 'StoreCredit', 'Exchange'];
const OUTCOME_LABELS = { Refund: 'Refund', StoreCredit: 'Store Credit', Exchange: 'Exchange' };

export default function CustomerReturn({ onDone }) {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [sale, setSale] = useState(null);
  const [alreadyReturned, setAlreadyReturned] = useState({});
  const [qtys, setQtys] = useState({});
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState('Refund');
  const [stockRestored, setStockRestored] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function lookupSale(e) {
    e.preventDefault();
    if (!invoiceNo.trim()) return;
    setSearching(true);
    setError(null);
    setSale(null);
    try {
      const res = await api.lookupSale(invoiceNo.trim());
      if (!res?.success) { setError(res?.error ?? 'Sale not found.'); return; }
      const s = res.data[0];
      setSale(s);

      const retRes = await api.getSaleReturns(s.id);
      setAlreadyReturned(retRes?.success ? retRes.data : {});
      const initQtys = {};
      s.lines.forEach(l => { initQtys[l.id] = 0; });
      setQtys(initQtys);
    } catch {
      setError('Cannot reach server.');
    } finally {
      setSearching(false);
    }
  }

  function setLineQty(lineId, val, max) {
    const n = Math.min(max, Math.max(0, parseInt(val) || 0));
    setQtys(prev => ({ ...prev, [lineId]: n }));
  }

  async function confirm() {
    const lines = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ saleLineId: parseInt(id), qty }));

    if (lines.length === 0) { setError('Select at least one item to return.'); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.customerReturn({ saleId: sale.id, lines, reason, outcome, stockRestored });
      if (res?.success) {
        setSuccess(`Return processed. Refund total: R ${res.data.refundTotal.toFixed(2)}`);
        setSale(null);
        setInvoiceNo('');
        setQtys({});
        setReason('');
      } else {
        setError(res?.error ?? 'Return failed.');
      }
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ret-panel">
      <h3 className="ret-section-title">Customer Return</h3>

      {success && (
        <div className="ret-success">
          {success}
          <button className="ret-success-dismiss" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      <form className="ret-lookup-form" onSubmit={lookupSale}>
        <label>Invoice Number</label>
        <div className="ret-lookup-row">
          <input
            type="text"
            placeholder="e.g. 000001"
            value={invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
          />
          <button type="submit" className="ret-lookup-btn" disabled={searching}>
            {searching ? 'Looking up…' : 'Load Sale'}
          </button>
        </div>
      </form>

      {error && <p className="ret-error">{error}</p>}

      {sale && (
        <>
          <div className="ret-sale-info">
            <span>Invoice <strong>#{String(sale.id).padStart(6, '0')}</strong></span>
            <span>{new Date(sale.date).toLocaleDateString()}</span>
            <span>{sale.customer}</span>
            <span>R {sale.total.toFixed(2)}</span>
          </div>

          <table className="ret-lines-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>Sold</th>
                <th>Already Returned</th>
                <th>Available</th>
                <th>Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map(l => {
                const returned = alreadyReturned[l.id] ?? 0;
                const available = l.qty - returned;
                return (
                  <tr key={l.id} className={available === 0 ? 'ret-line-exhausted' : ''}>
                    <td className="ret-partno">{l.partNo}</td>
                    <td>{l.description}</td>
                    <td>{l.qty}</td>
                    <td>{returned > 0 ? <span className="ret-already">{returned}</span> : '—'}</td>
                    <td>{available}</td>
                    <td>
                      <input
                        type="number"
                        className="ret-qty-input"
                        value={qtys[l.id] ?? 0}
                        min="0"
                        max={available}
                        disabled={available === 0}
                        onChange={e => setLineQty(l.id, e.target.value, available)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ret-options">
            <div className="ret-field">
              <label>Reason</label>
              <input
                type="text"
                placeholder="Reason for return…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <div className="ret-field">
              <label>Outcome</label>
              <div className="ret-outcome-btns">
                {OUTCOMES.map(o => (
                  <button
                    key={o}
                    className={'ret-outcome-btn' + (outcome === o ? ' selected' : '')}
                    onClick={() => setOutcome(o)}
                    type="button"
                  >
                    {OUTCOME_LABELS[o]}
                  </button>
                ))}
              </div>
            </div>

            <label className="ret-checkbox-label">
              <input
                type="checkbox"
                checked={stockRestored}
                onChange={e => setStockRestored(e.target.checked)}
              />
              Restore stock (item is resaleable)
            </label>
          </div>

          <div className="ret-return-total">
            Return total: <strong>
              R {sale.lines.reduce((s, l) => {
                const qty = qtys[l.id] ?? 0;
                return s + qty * l.unitPrice * (1 - l.discountPct / 100);
              }, 0).toFixed(2)}
            </strong>
          </div>

          <button
            className="ret-confirm-btn"
            onClick={confirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Confirm Return'}
          </button>
        </>
      )}
    </div>
  );
}
