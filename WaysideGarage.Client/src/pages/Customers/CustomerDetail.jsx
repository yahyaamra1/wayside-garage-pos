import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import PaymentModal from './PaymentModal';

export default function CustomerDetail({ customerId, onEdit, onDeactivate, isAdmin }) {
  const [customer, setCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detRes, stmtRes] = await Promise.all([
        api.getCustomer(customerId),
        api.getCustomerStatement(customerId),
      ]);
      if (!detRes?.success) throw new Error(detRes?.error ?? 'Failed to load customer.');
      setCustomer(detRes.data);
      if (stmtRes?.success) setStatement(stmtRes.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  function handlePaid(newBalance) {
    setShowPayment(false);
    setCustomer(c => ({ ...c, balance: newBalance }));
    load();
  }

  if (loading) return <div className="cust-detail-loading">Loading…</div>;
  if (error) return <div className="cust-detail-error">{error}</div>;
  if (!customer) return null;

  const availableCredit = Math.max(0, customer.creditLimit - customer.balance);
  const usedPct = customer.creditLimit > 0
    ? Math.min(100, (customer.balance / customer.creditLimit) * 100)
    : 0;

  return (
    <div className="cust-detail">
      <div className="cust-detail-top">
        <div className="cust-detail-name-row">
          <div>
            <h2 className="cust-detail-name">{customer.name}</h2>
            <div className="cust-detail-meta">
              {customer.phone && <span>{customer.phone}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.isTradeAccount && <span className="cust-badge-trade">Trade Account</span>}
              {!customer.isActive && <span className="cust-badge-inactive">Inactive</span>}
            </div>
          </div>
          <div className="cust-detail-actions">
            <button className="cust-btn-secondary" onClick={() => onEdit(customer)}>Edit</button>
            {isAdmin && customer.isActive && (
              <button className="cust-btn-danger" onClick={() => onDeactivate(customer)}>
                Deactivate
              </button>
            )}
          </div>
        </div>

        {customer.isTradeAccount && (
          <div className="cust-credit-card">
            <div className="cust-credit-row">
              <div className="cust-credit-stat">
                <span className="cust-credit-label">Balance</span>
                <span className="cust-credit-value cust-balance-amount">R {customer.balance.toFixed(2)}</span>
              </div>
              <div className="cust-credit-stat">
                <span className="cust-credit-label">Credit Limit</span>
                <span className="cust-credit-value">R {customer.creditLimit.toFixed(2)}</span>
              </div>
              <div className="cust-credit-stat">
                <span className="cust-credit-label">Available</span>
                <span className={`cust-credit-value ${availableCredit <= 0 ? 'cust-text-danger' : 'cust-text-success'}`}>
                  R {availableCredit.toFixed(2)}
                </span>
              </div>
              <button className="cust-btn-primary" onClick={() => setShowPayment(true)}>
                Record Payment
              </button>
            </div>
            {customer.creditLimit > 0 && (
              <div className="cust-credit-bar-wrap">
                <div className="cust-credit-bar" style={{ width: `${usedPct}%`, background: usedPct >= 90 ? 'var(--danger-text)' : usedPct >= 70 ? 'var(--warning-text)' : 'var(--accent-primary)' }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="cust-tabs">
        <button className={`cust-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          Recent Sales
        </button>
        {customer.isTradeAccount && (
          <button className={`cust-tab ${tab === 'statement' ? 'active' : ''}`} onClick={() => setTab('statement')}>
            Statement
          </button>
        )}
      </div>

      {tab === 'overview' && (
        <div className="cust-recent-sales">
          {customer.recentSales.length === 0 ? (
            <p className="cust-empty">No sales on record.</p>
          ) : (
            <table className="cust-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Method</th>
                  <th>Lines</th>
                  <th className="cust-col-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.recentSales.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.date).toLocaleDateString()}</td>
                    <td>#{String(s.id).padStart(6, '0')}</td>
                    <td>{s.paymentMethod}</td>
                    <td>{s.lineCount}</td>
                    <td className="cust-col-right">R {s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'statement' && statement && (
        <div className="cust-statement">
          {statement.entries.length === 0 ? (
            <p className="cust-empty">No account transactions.</p>
          ) : (
            <table className="cust-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th className="cust-col-right">Debit</th>
                  <th className="cust-col-right">Credit</th>
                  <th className="cust-col-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statement.entries.map((e, i) => (
                  <tr key={i}>
                    <td>{new Date(e.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`cust-entry-type cust-entry-${e.type.toLowerCase()}`}>
                        {e.type}
                      </span>
                    </td>
                    <td>{e.reference}</td>
                    <td className="cust-col-right cust-text-danger">
                      {e.debit != null ? `R ${e.debit.toFixed(2)}` : ''}
                    </td>
                    <td className="cust-col-right cust-text-success">
                      {e.credit != null ? `R ${e.credit.toFixed(2)}` : ''}
                    </td>
                    <td className="cust-col-right">R {e.runningBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="cust-stmt-footer-label">Current Balance</td>
                  <td className="cust-col-right cust-balance-amount">R {statement.balance.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {showPayment && (
        <PaymentModal
          customer={customer}
          onClose={() => setShowPayment(false)}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
