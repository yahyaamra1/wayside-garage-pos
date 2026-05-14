import { useState, useEffect } from 'react';
import { Printer, ShoppingCart } from 'lucide-react';
import { api } from '../../api/client';

export default function Receipt({ saleId, onNewSale }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSale(saleId).then(res => {
      if (res?.success) setSale(res.data);
      else setError('Could not load receipt.');
    }).catch(() => setError('Could not load receipt.')).finally(() => setLoading(false));
  }, [saleId]);

  if (loading) return <div className="pos-receipt-loading">Loading receipt…</div>;
  if (error) return <div className="pos-receipt-error">{error}</div>;

  const date = new Date(sale.date);

  return (
    <div className="pos-receipt-wrap">
      <div className="pos-receipt-actions no-print">
        <button className="pos-print-btn" onClick={() => window.print()}>
          <Printer size={16} /> Print Receipt
        </button>
        <button className="pos-new-sale-btn" onClick={onNewSale}>
          <ShoppingCart size={16} /> New Sale
        </button>
      </div>

      <div className="receipt-printable pos-receipt">
        <div className="receipt-header">
          <div className="receipt-shop-name">WAYSIDE GARAGE</div>
          <div className="receipt-shop-sub">AND MOTOR SPARES</div>
          <div className="receipt-divider" />
        </div>

        <div className="receipt-meta">
          <div><span>Invoice #</span><span>{String(sale.id).padStart(6, '0')}</span></div>
          <div><span>Date</span><span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div><span>Cashier</span><span>{sale.cashier}</span></div>
          {sale.customer && <div><span>Customer</span><span>{sale.customer.name}</span></div>}
          {sale.notes && <div><span>Notes</span><span>{sale.notes}</span></div>}
        </div>

        <div className="receipt-divider" />

        <table className="receipt-lines">
          <thead>
            <tr>
              <th>Part</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map(l => (
              <tr key={l.id}>
                <td>
                  <div>{l.partNo}</div>
                  <div className="receipt-line-desc">{l.description}</div>
                </td>
                <td>{l.qty}</td>
                <td>R {l.unitPrice.toFixed(2)}{l.discountPct > 0 && <span className="receipt-disc"> -{l.discountPct}%</span>}</td>
                <td>R {l.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div><span>Subtotal</span><span>R {sale.subTotal.toFixed(2)}</span></div>
          {sale.discountAmount > 0 && (
            <div><span>Discount</span><span>- R {sale.discountAmount.toFixed(2)}</span></div>
          )}
          <div className="receipt-total-row"><span>TOTAL</span><span>R {sale.total.toFixed(2)}</span></div>
          <div><span>Payment</span><span>{sale.paymentMethod}</span></div>
        </div>

        <div className="receipt-divider" />
        <div className="receipt-footer">Thank you for your business!</div>
      </div>
    </div>
  );
}
