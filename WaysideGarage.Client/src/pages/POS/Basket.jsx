import { useState, useRef } from 'react';
import { Trash2, Plus, Minus, Search } from 'lucide-react';
import { api } from '../../api/client';

export default function Basket({ lines, onUpdateQty, onUpdateDiscount, onRemove, onCustomer, customer, totalDiscount, onTotalDiscount, onCheckout }) {
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);
  const custTimer = useRef(null);

  async function searchCustomer(q) {
    clearTimeout(custTimer.current);
    if (q.length < 2) { setCustResults([]); return; }
    custTimer.current = setTimeout(async () => {
      const res = await api.searchCustomers(q);
      if (res?.success) setCustResults(res.data);
    }, 280);
  }

  function selectCustomer(c) {
    onCustomer(c);
    setCustQuery(c.name);
    setCustResults([]);
  }

  function clearCustomer() {
    onCustomer(null);
    setCustQuery('');
    setCustResults([]);
  }

  const subTotal = lines.reduce((s, l) => s + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0);
  const total = Math.max(0, subTotal - (parseFloat(totalDiscount) || 0));

  return (
    <div className="pos-basket">
      <div className="pos-basket-header">
        <h2>Basket</h2>
        <span className="pos-basket-count">{lines.length} item{lines.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Customer lookup */}
      <div className="pos-customer-wrap">
        <div className="pos-customer-bar">
          <Search size={14} />
          <input
            type="text"
            placeholder="Customer (optional)…"
            value={custQuery}
            onChange={e => { setCustQuery(e.target.value); searchCustomer(e.target.value); }}
          />
          {customer && (
            <button className="pos-clear-cust" onClick={clearCustomer} title="Clear">✕</button>
          )}
        </div>
        {custResults.length > 0 && (
          <ul className="pos-cust-dropdown">
            {custResults.map(c => (
              <li key={c.id} onClick={() => selectCustomer(c)}>
                <span>{c.name}</span>
                {c.isTradeAccount && <span className="pos-trade-badge">Account</span>}
                {c.phone && <span className="pos-cust-phone">{c.phone}</span>}
              </li>
            ))}
          </ul>
        )}
        {customer?.isTradeAccount && (
          <div className="pos-balance-info">
            Balance: <strong>R {customer.balance.toFixed(2)}</strong>
            &nbsp;/&nbsp;Limit: <strong>R {customer.creditLimit.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="pos-lines">
        {lines.length === 0 && (
          <p className="pos-empty">Search for parts to add them here.</p>
        )}
        {lines.map(line => (
          <div key={line.partId} className="pos-line">
            <div className="pos-line-top">
              <span className="pos-line-partno">{line.partNo}</span>
              <button className="pos-line-remove" onClick={() => onRemove(line.partId)}><Trash2 size={14} /></button>
            </div>
            <div className="pos-line-desc">{line.description}</div>
            <div className="pos-line-bottom">
              <div className="pos-qty-ctrl">
                <button onClick={() => onUpdateQty(line.partId, line.qty - 1)} disabled={line.qty <= 1}><Minus size={12} /></button>
                <span>{line.qty}</span>
                <button onClick={() => onUpdateQty(line.partId, line.qty + 1)} disabled={line.qty >= line.stockQty}><Plus size={12} /></button>
              </div>
              <span className="pos-line-price">R {line.unitPrice.toFixed(2)}</span>
              <div className="pos-disc-wrap">
                <input
                  type="number"
                  className="pos-disc-input"
                  value={line.discountPct}
                  min="0" max="100"
                  onChange={e => onUpdateDiscount(line.partId, parseFloat(e.target.value) || 0)}
                  title="Line discount %"
                />
                <span>%</span>
              </div>
              <span className="pos-line-total">
                R {(line.qty * line.unitPrice * (1 - line.discountPct / 100)).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="pos-totals">
        <div className="pos-totals-row">
          <span>Subtotal</span>
          <span>R {subTotal.toFixed(2)}</span>
        </div>
        <div className="pos-totals-row">
          <span>Discount</span>
          <div className="pos-total-disc">
            <span>R</span>
            <input
              type="number"
              className="pos-disc-total-input"
              value={totalDiscount}
              min="0"
              onChange={e => onTotalDiscount(e.target.value)}
            />
          </div>
        </div>
        <div className="pos-totals-row total">
          <span>TOTAL</span>
          <span>R {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        className="pos-checkout-btn"
        onClick={onCheckout}
        disabled={lines.length === 0}
      >
        Checkout
      </button>
    </div>
  );
}
