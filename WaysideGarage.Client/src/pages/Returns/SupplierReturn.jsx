import { useState, useEffect, useRef } from 'react';
import { Search, FileDown } from 'lucide-react';
import { api } from '../../api/client';

export default function SupplierReturn() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [partQuery, setPartQuery] = useState('');
  const [partResults, setPartResults] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [debitNoteNo, setDebitNoteNo] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [recentReturns, setRecentReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    api.getSuppliers().then(res => { if (res?.success) setSuppliers(res.data); });
    loadRecent();
  }, []);

  async function loadRecent() {
    const res = await api.getRecentSupplierReturns();
    if (res?.success) setRecentReturns(res.data);
  }

  function handlePartSearch(val) {
    setPartQuery(val);
    setSelectedPart(null);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setPartResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await api.searchParts(val);
      if (res?.success) setPartResults(res.data);
    }, 280);
  }

  function selectPart(p) {
    setSelectedPart(p);
    setPartQuery(p.partNo + ' — ' + p.description);
    setPartResults([]);
  }

  async function confirm() {
    setError(null);
    if (!supplierId) { setError('Select a supplier.'); return; }
    if (!selectedPart) { setError('Select a part.'); return; }
    const qtyNum = parseInt(qty);
    if (!qtyNum || qtyNum <= 0) { setError('Enter a valid quantity.'); return; }
    if (qtyNum > selectedPart.stockQty) { setError(`Only ${selectedPart.stockQty} in stock.`); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }

    setLoading(true);
    try {
      const res = await api.supplierReturn({
        supplierId: parseInt(supplierId),
        partId: selectedPart.id,
        qty: qtyNum,
        reason,
        debitNoteNo: debitNoteNo.trim() || null,
        supplierInvoiceNo: supplierInvoiceNo.trim() || null
      });
      if (res?.success) {
        setSuccess(`Return processed. Total value: R ${res.data.totalCost.toFixed(2)}`);
        setSupplierId(''); setPartQuery(''); setSelectedPart(null);
        setQty(''); setReason(''); setDebitNoteNo(''); setSupplierInvoiceNo('');
        loadRecent();
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
      <h3 className="ret-section-title">Return Stock to Supplier</h3>

      {success && (
        <div className="ret-success">
          {success}
          <button className="ret-success-dismiss" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      <div className="ret-sup-form">
        <div className="ret-field">
          <label>Supplier</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">— Select supplier —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.accountNo ? ` (${s.accountNo})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="ret-field">
          <label>Part</label>
          <div className="ret-part-search-wrap">
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
                  <li key={p.id} onClick={() => selectPart(p)}>
                    <span className="ret-part-no">{p.partNo}</span>
                    <span>{p.description}</span>
                    <span className="ret-part-stock">Stock: {p.stockQty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedPart && (
            <p className="ret-part-info">
              Stock on hand: <strong>{selectedPart.stockQty}</strong> &nbsp;|&nbsp;
              Cost price: <strong>R {selectedPart.costPrice?.toFixed(2) ?? '—'}</strong>
            </p>
          )}
        </div>

        <div className="ret-row-fields">
          <div className="ret-field">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              max={selectedPart?.stockQty ?? undefined}
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="ret-field">
            <label>Debit Note No. (optional)</label>
            <input
              type="text"
              value={debitNoteNo}
              onChange={e => setDebitNoteNo(e.target.value)}
              placeholder="e.g. DN-00123"
            />
          </div>
          <div className="ret-field">
            <label>Supplier Invoice No. (optional)</label>
            <input
              type="text"
              value={supplierInvoiceNo}
              onChange={e => setSupplierInvoiceNo(e.target.value)}
              placeholder="e.g. INV-56789"
            />
          </div>
        </div>

        <div className="ret-field">
          <label>Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Damaged, wrong part, over-ordered…"
          />
        </div>

        {error && <p className="ret-error">{error}</p>}

        <button className="ret-confirm-btn" onClick={confirm} disabled={loading}>
          {loading ? 'Processing…' : 'Confirm Supplier Return'}
        </button>
      </div>

      {recentReturns.length > 0 && (
        <div className="ret-recent">
          <h4 className="ret-recent-title">Recent Supplier Returns</h4>
          <table className="ret-lines-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Part No</th>
                <th>Qty</th>
                <th>Total Value</th>
                <th>Supplier Inv.</th>
                <th>Debit Note</th>
                <th>Reason</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {recentReturns.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.supplier}</td>
                  <td className="ret-partno">{r.partNo}</td>
                  <td>{r.qty}</td>
                  <td>R {r.totalCost.toFixed(2)}</td>
                  <td>{r.supplierInvoiceNo ?? '—'}</td>
                  <td>{r.debitNoteNo ?? '—'}</td>
                  <td className="ret-reason">{r.reason}</td>
                  <td>
                    <a
                      href={api.downloadSupplierReturnPdf(r.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="ret-pdf-link"
                      title="Download PDF"
                    >
                      <FileDown size={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
