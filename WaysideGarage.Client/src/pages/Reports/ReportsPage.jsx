import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import './ReportsPage.css';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function fmtCurrency(n) {
  return `R ${(n ?? 0).toFixed(2)}`;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rep-stat-card">
      <span className="rep-stat-label">{label}</span>
      <span className={`rep-stat-value ${color ?? ''}`}>{value}</span>
      {sub && <span className="rep-stat-sub">{sub}</span>}
    </div>
  );
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="rep-bar-wrap">
      <div className="rep-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState('overview');

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topParts, setTopParts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [supplierSpend, setSupplierSpend] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, dailyRes, topRes, lowRes, spendRes] = await Promise.all([
        api.getReportSummary(from, to),
        api.getReportDaily(from, to),
        api.getReportTopParts(from, to, 10),
        api.getReportLowStock(),
        api.getReportSupplierSpend(from, to),
      ]);
      if (!sumRes?.success) throw new Error(sumRes?.error ?? 'Failed to load reports.');
      setSummary(sumRes.data);
      setDaily(dailyRes?.data ?? []);
      setTopParts(topRes?.data ?? []);
      setLowStock(lowRes?.data ?? []);
      setSupplierSpend(spendRes?.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const maxDailyTotal = Math.max(...daily.map(d => d.total), 1);
  const maxPartRevenue = Math.max(...topParts.map(p => p.revenue), 1);
  const maxSpend = Math.max(...supplierSpend.map(s => s.totalSpend), 1);

  return (
    <div className="rep-page">
      <div className="rep-header">
        <h1 className="rep-title">Reports</h1>
        <div className="rep-range">
          <label className="rep-range-label">From</label>
          <input className="rep-date" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <label className="rep-range-label">To</label>
          <input className="rep-date" type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="rep-btn-refresh" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="rep-error">{error}</div>}

      {summary && (
        <div className="rep-stats-row">
          <StatCard label="Sales" value={summary.saleCount} />
          <StatCard label="Gross Revenue" value={fmtCurrency(summary.grossRevenue)} color="rep-text-accent" />
          <StatCard label="Returns" value={fmtCurrency(summary.totalReturns)} color="rep-text-warning" />
          <StatCard label="Net Revenue" value={fmtCurrency(summary.netRevenue)} color="rep-text-success" />
          <StatCard
            label="Trade Balance"
            value={fmtCurrency(summary.totalTradeBalance)}
            sub="outstanding"
            color={summary.totalTradeBalance > 0 ? 'rep-text-warning' : ''}
          />
          <StatCard label="Low Stock Parts" value={lowStock.length} color={lowStock.length > 0 ? 'rep-text-danger' : ''} />
        </div>
      )}

      <div className="rep-tabs">
        {[
          ['overview', 'Daily Sales'],
          ['payment', 'Payment Methods'],
          ['parts', 'Top Parts'],
          ['lowstock', 'Low Stock'],
          ['suppliers', 'Supplier Spend'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`rep-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'lowstock' && lowStock.length > 0 && (
              <span className="rep-tab-badge">{lowStock.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rep-content">

        {tab === 'overview' && (
          <div className="rep-section">
            <h2 className="rep-section-title">Daily Sales</h2>
            {daily.length === 0 ? (
              <p className="rep-empty">No sales in this period.</p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sales</th>
                    <th className="rep-col-right">Total</th>
                    <th style={{ width: '200px' }}>Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map(d => (
                    <tr key={d.date}>
                      <td>{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td>{d.saleCount}</td>
                      <td className="rep-col-right rep-text-accent">{fmtCurrency(d.total)}</td>
                      <td><MiniBar value={d.total} max={maxDailyTotal} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="rep-footer-label">Period Total</td>
                    <td className="rep-col-right rep-text-success rep-footer-value">
                      {fmtCurrency(summary?.grossRevenue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {tab === 'payment' && (
          <div className="rep-section">
            <h2 className="rep-section-title">Sales by Payment Method</h2>
            {!summary || summary.byPaymentMethod.length === 0 ? (
              <p className="rep-empty">No sales in this period.</p>
            ) : (
              <table className="rep-table rep-table-narrow">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Transactions</th>
                    <th className="rep-col-right">Total</th>
                    <th className="rep-col-right">% of Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPaymentMethod.map(m => (
                    <tr key={m.method}>
                      <td>
                        <span className={`rep-method-badge rep-method-${m.method.toLowerCase()}`}>
                          {m.method}
                        </span>
                      </td>
                      <td>{m.count}</td>
                      <td className="rep-col-right">{fmtCurrency(m.total)}</td>
                      <td className="rep-col-right rep-text-muted">
                        {summary.grossRevenue > 0
                          ? `${((m.total / summary.grossRevenue) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'parts' && (
          <div className="rep-section">
            <h2 className="rep-section-title">Top Selling Parts</h2>
            {topParts.length === 0 ? (
              <p className="rep-empty">No sales in this period.</p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Part No</th>
                    <th>Description</th>
                    <th className="rep-col-right">Qty Sold</th>
                    <th className="rep-col-right">Revenue</th>
                    <th style={{ width: '180px' }}>Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {topParts.map(p => (
                    <tr key={p.partId}>
                      <td className="rep-text-muted">{p.partNo}</td>
                      <td>{p.description}</td>
                      <td className="rep-col-right">{p.qtySold}</td>
                      <td className="rep-col-right rep-text-accent">{fmtCurrency(p.revenue)}</td>
                      <td><MiniBar value={p.revenue} max={maxPartRevenue} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'lowstock' && (
          <div className="rep-section">
            <h2 className="rep-section-title">
              Low Stock
              {lowStock.length > 0 && <span className="rep-count-badge">{lowStock.length} parts</span>}
            </h2>
            {lowStock.length === 0 ? (
              <p className="rep-empty rep-text-success">All parts are adequately stocked.</p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Part No</th>
                    <th>Description</th>
                    <th>Supplier</th>
                    <th className="rep-col-right">In Stock</th>
                    <th className="rep-col-right">Reorder At</th>
                    <th className="rep-col-right">Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map(p => (
                    <tr key={p.id} className={p.stockQty === 0 ? 'rep-row-critical' : 'rep-row-warning'}>
                      <td className="rep-text-muted">{p.partNo}</td>
                      <td>{p.description}</td>
                      <td className="rep-text-muted">{p.supplierName ?? '—'}</td>
                      <td className={`rep-col-right ${p.stockQty === 0 ? 'rep-text-danger' : 'rep-text-warning'}`}>
                        {p.stockQty}
                      </td>
                      <td className="rep-col-right rep-text-muted">{p.reorderLevel}</td>
                      <td className="rep-col-right rep-text-danger">
                        {p.reorderLevel - p.stockQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'suppliers' && (
          <div className="rep-section">
            <h2 className="rep-section-title">Supplier Spend</h2>
            {supplierSpend.length === 0 ? (
              <p className="rep-empty">No stock received in this period.</p>
            ) : (
              <table className="rep-table rep-table-narrow">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th className="rep-col-right">Orders</th>
                    <th className="rep-col-right">Total Spend</th>
                    <th style={{ width: '180px' }}>Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierSpend.map(s => (
                    <tr key={s.supplierId}>
                      <td>{s.supplierName}</td>
                      <td className="rep-col-right">{s.orderCount}</td>
                      <td className="rep-col-right rep-text-accent">{fmtCurrency(s.totalSpend)}</td>
                      <td><MiniBar value={s.totalSpend} max={maxSpend} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="rep-footer-label">Total</td>
                    <td className="rep-col-right rep-footer-value">
                      {supplierSpend.reduce((a, s) => a + s.orderCount, 0)}
                    </td>
                    <td className="rep-col-right rep-text-success rep-footer-value">
                      {fmtCurrency(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
