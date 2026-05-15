import { useState, useEffect, useCallback, useRef } from 'react';
import { Printer, RefreshCw, TrendingUp, ShoppingCart, RotateCcw, CreditCard, AlertTriangle, Package } from 'lucide-react';
import { api } from '../../api/client';
import './ReportsPage.css';

function today()      { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function fmtR(n)    { return `R ${(n ?? 0).toFixed(2)}`; }
function fmtDate(s) {
  return new Date(s).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDay(s) {
  return new Date(s).toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });
}

/* ── Print-only slip helpers ── */
function Divider({ dashed }) {
  return <div className={`slip-divider ${dashed ? 'dashed' : ''}`} />;
}
function SlipRow({ label, value, bold, color }) {
  return (
    <div className={`slip-row ${bold ? 'bold' : ''}`}>
      <span className="slip-label">{label}</span>
      <span className={`slip-value ${color ?? ''}`}>{value}</span>
    </div>
  );
}
function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bars = Math.round(pct / 10);
  return <span className="slip-bar">{'█'.repeat(bars)}{'░'.repeat(10 - bars)}</span>;
}
function SectionHead({ children }) {
  return <div className="slip-section-head">{children}</div>;
}

function RepTable({ children, narrow }) {
  return <table className={`rep-table ${narrow ? 'rep-table-narrow' : ''}`}>{children}</table>;
}

const METHOD_COLORS = { cash: '#1a7a4a', card: '#1e6fd9', account: '#7a5a10' };

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());
  const [tab,  setTab]  = useState('overview');

  const [summary,       setSummary]       = useState(null);
  const [daily,         setDaily]         = useState([]);
  const [salesDetail,   setSalesDetail]   = useState([]);
  const [topParts,      setTopParts]      = useState([]);
  const [lowStock,      setLowStock]      = useState([]);
  const [supplierSpend, setSupplierSpend] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  const slipRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, dailyRes, detailRes, topRes, lowRes, spendRes] = await Promise.all([
        api.getReportSummary(from, to),
        api.getReportDaily(from, to),
        api.getReportSalesDetail(from, to),
        api.getReportTopParts(from, to, 10),
        api.getReportLowStock(),
        api.getReportSupplierSpend(from, to),
      ]);
      if (!sumRes?.success) throw new Error(sumRes?.error ?? 'Failed to load.');
      setSummary(sumRes.data);
      setDaily(dailyRes?.data ?? []);
      setSalesDetail(detailRes?.data ?? []);
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

  const maxDaily   = Math.max(...daily.map(d => d.total), 1);
  const maxSpend   = Math.max(...supplierSpend.map(s => s.totalSpend), 1);
  const maxPartRev = Math.max(...topParts.map(p => p.revenue), 1);
  const maxSale    = Math.max(...salesDetail.map(s => s.total), 1);

  const avgTransaction = summary && summary.saleCount > 0
    ? summary.grossRevenue / summary.saleCount : 0;

  const bestDay = daily.length > 0
    ? daily.reduce((a, b) => b.total > a.total ? b : a)
    : null;

  const printSlip = () => window.print();

  const printedAt = new Date().toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="rep-page">

      {/* ── Toolbar ── */}
      <div className="rep-toolbar no-print">
        <h1 className="rep-toolbar-title">Reports</h1>
        <div className="rep-toolbar-controls">
          <label className="rep-range-label">From</label>
          <input type="date" className="rep-date" value={from} onChange={e => setFrom(e.target.value)} />
          <label className="rep-range-label">To</label>
          <input type="date" className="rep-date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="rep-btn rep-btn-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'rep-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button className="rep-btn rep-btn-print" onClick={printSlip}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {error && <div className="rep-error no-print">{error}</div>}

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="rep-kpi-row no-print">
          <div className="rep-kpi-card">
            <div className="rep-kpi-icon-wrap accent-bg"><ShoppingCart size={16} /></div>
            <div>
              <span className="rep-kpi-label">Transactions</span>
              <span className="rep-kpi-value">{summary.saleCount}</span>
            </div>
          </div>
          <div className="rep-kpi-card">
            <div className="rep-kpi-icon-wrap accent-bg"><TrendingUp size={16} /></div>
            <div>
              <span className="rep-kpi-label">Gross Revenue</span>
              <span className="rep-kpi-value accent">{fmtR(summary.grossRevenue)}</span>
            </div>
          </div>
          <div className="rep-kpi-card">
            <div className="rep-kpi-icon-wrap success-bg"><TrendingUp size={16} /></div>
            <div>
              <span className="rep-kpi-label">Net Revenue</span>
              <span className="rep-kpi-value success">{fmtR(summary.netRevenue)}</span>
            </div>
          </div>
          <div className="rep-kpi-card">
            <div className="rep-kpi-icon-wrap warning-bg"><RotateCcw size={16} /></div>
            <div>
              <span className="rep-kpi-label">Returns</span>
              <span className="rep-kpi-value warning">{fmtR(summary.totalReturns)}</span>
            </div>
          </div>
          <div className="rep-kpi-card">
            <div className="rep-kpi-icon-wrap warning-bg"><CreditCard size={16} /></div>
            <div>
              <span className="rep-kpi-label">Trade Outstanding</span>
              <span className={`rep-kpi-value ${summary.totalTradeBalance > 0 ? 'warning' : ''}`}>
                {fmtR(summary.totalTradeBalance)}
              </span>
            </div>
          </div>
          <div className="rep-kpi-card">
            <div className={`rep-kpi-icon-wrap ${lowStock.length > 0 ? 'danger-bg' : 'success-bg'}`}>
              <Package size={16} />
            </div>
            <div>
              <span className="rep-kpi-label">Low Stock Parts</span>
              <span className={`rep-kpi-value ${lowStock.length > 0 ? 'danger' : 'success'}`}>
                {lowStock.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="rep-tabs no-print">
        {[
          ['overview',     'Overview'],
          ['transactions', 'Transactions'],
          ['parts',        'Top Parts'],
          ['lowstock',     'Low Stock'],
          ['suppliers',    'Supplier Spend'],
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

      {/* ── Tab content ── */}
      <div className="rep-tab-content no-print">

        {loading && <p className="rep-loading">Loading…</p>}

        {/* ── Overview ── */}
        {tab === 'overview' && !loading && !summary && (
          <p className="rep-empty">No data — select a date range and refresh.</p>
        )}

        {tab === 'overview' && !loading && summary && (
          <div className="rep-overview">

            {/* Revenue bar chart */}
            <div className="rep-chart-card">
              <div className="rep-chart-title">Revenue by Day</div>
              {daily.length === 0 ? (
                <p className="rep-empty">No sales in this period.</p>
              ) : (
                <div className="rep-bar-chart">
                  {daily.map(d => {
                    const pct = Math.round((d.total / maxDaily) * 100);
                    return (
                      <div key={d.date} className="rep-bar-chart-col">
                        <div className="rep-bar-chart-tooltip">{fmtR(d.total)}<br />{d.saleCount} sale{d.saleCount !== 1 ? 's' : ''}</div>
                        <div className="rep-bar-chart-bar-wrap">
                          <div className="rep-bar-chart-bar" style={{ height: `${Math.max(pct, 2)}%` }} />
                        </div>
                        <div className="rep-bar-chart-label">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rep-overview-row">

              {/* Payment split */}
              <div className="rep-chart-card rep-chart-card-half">
                <div className="rep-chart-title">Payment Split</div>
                {summary.byPaymentMethod.length === 0 ? (
                  <p className="rep-empty">No sales.</p>
                ) : (<>
                  <div className="rep-split-bar">
                    {summary.byPaymentMethod.map(m => {
                      const pct = summary.grossRevenue > 0
                        ? (m.total / summary.grossRevenue) * 100 : 0;
                      return (
                        <div
                          key={m.method}
                          className="rep-split-segment"
                          style={{ width: `${pct}%`, background: METHOD_COLORS[m.method.toLowerCase()] ?? '#555' }}
                          title={`${m.method}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="rep-split-legend">
                    {summary.byPaymentMethod.map(m => {
                      const pct = summary.grossRevenue > 0
                        ? ((m.total / summary.grossRevenue) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={m.method} className="rep-split-legend-item">
                          <span className="rep-split-dot" style={{ background: METHOD_COLORS[m.method.toLowerCase()] ?? '#555' }} />
                          <span className="rep-split-method">{m.method}</span>
                          <span className="rep-split-pct">{pct}%</span>
                          <span className="rep-split-amt">{fmtR(m.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>)}
              </div>

              {/* Highlights */}
              <div className="rep-chart-card rep-chart-card-half">
                <div className="rep-chart-title">Period Highlights</div>
                <div className="rep-highlights">
                  <div className="rep-highlight-row">
                    <span className="rep-highlight-lbl">Avg Transaction</span>
                    <span className="rep-highlight-val accent">{fmtR(avgTransaction)}</span>
                  </div>
                  {bestDay && (
                    <div className="rep-highlight-row">
                      <span className="rep-highlight-lbl">Best Day</span>
                      <span className="rep-highlight-val">
                        {new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' })}
                        <span className="rep-highlight-sub"> · {fmtR(bestDay.total)}</span>
                      </span>
                    </div>
                  )}
                  {topParts.length > 0 && (
                    <div className="rep-highlight-row">
                      <span className="rep-highlight-lbl">Top Part</span>
                      <span className="rep-highlight-val">
                        {topParts[0].partNo}
                        <span className="rep-highlight-sub"> · {fmtR(topParts[0].revenue)}</span>
                      </span>
                    </div>
                  )}
                  <div className="rep-highlight-row">
                    <span className="rep-highlight-lbl">Returns Rate</span>
                    <span className={`rep-highlight-val ${summary.totalReturns > 0 ? 'warning' : 'success'}`}>
                      {summary.grossRevenue > 0
                        ? `${((summary.totalReturns / summary.grossRevenue) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  {supplierSpend.length > 0 && (
                    <div className="rep-highlight-row">
                      <span className="rep-highlight-lbl">Total Supplier Spend</span>
                      <span className="rep-highlight-val warning">
                        {fmtR(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))}
                      </span>
                    </div>
                  )}
                  {lowStock.length > 0 && (
                    <div className="rep-highlight-row">
                      <span className="rep-highlight-lbl">Out of Stock</span>
                      <span className="rep-highlight-val danger">
                        {lowStock.filter(p => p.stockQty === 0).length} part{lowStock.filter(p => p.stockQty === 0).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Transactions ── */}
        {tab === 'transactions' && !loading && (
          salesDetail.length === 0 ? (
            <p className="rep-empty">No sales in this period.</p>
          ) : (
            <div className="rep-daily-grid">
              {salesDetail.map(s => {
                const dt      = new Date(s.date);
                const dayName = dt.toLocaleDateString('en-ZA', { weekday: 'long' });
                const dayNum  = dt.toLocaleDateString('en-ZA', { day: '2-digit' });
                const month   = dt.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase();
                const year    = dt.getFullYear();
                const time    = dt.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                const barPct  = Math.round((s.total / maxSale) * 100);

                return (
                  <div key={s.id} className="rep-day-card">
                    <div className="rep-day-card-head">
                      <div className="rep-day-card-weekday">{dayName}</div>
                      <div className="rep-day-card-datenum">{dayNum} {month} {year}</div>
                      <div className="rep-day-card-time">{time}</div>
                    </div>
                    <div className="rep-day-card-meta">
                      <span className="rep-day-card-invoice">#{s.invoiceNo}</span>
                      <span className="rep-day-card-method">{s.paymentMethod}</span>
                    </div>
                    {s.customer && <div className="rep-day-card-customer">{s.customer}</div>}
                    <div className="rep-day-card-items">
                      <div className="rep-day-card-items-head">
                        <span>ITEM</span><span>QTY</span><span>AMOUNT</span>
                      </div>
                      <div className="rep-day-card-items-sep" />
                      {s.lines.map((it, i) => (
                        <div key={i} className="rep-day-card-item-row">
                          <div className="rep-day-card-item-desc">
                            <span className="rep-day-card-item-no">{it.partNo}</span>
                            <span className="rep-day-card-item-name" title={it.description}>{it.description}</span>
                          </div>
                          <span className="rep-day-card-item-qty">{it.qty}</span>
                          <span className="rep-day-card-item-amt">{fmtR(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rep-day-card-foot">
                      <div className="rep-day-card-total-line">
                        <span>TOTAL</span>
                        <span className="rep-day-card-total-amt">{fmtR(s.total)}</span>
                      </div>
                      <div className="rep-day-card-bar-wrap">
                        <div className="rep-day-card-bar" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Top Parts ── */}
        {tab === 'parts' && !loading && (
          topParts.length === 0 ? (
            <p className="rep-empty">No sales in this period.</p>
          ) : (
            <RepTable>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Part No</th>
                  <th>Description</th>
                  <th className="rep-col-right">Qty Sold</th>
                  <th className="rep-col-right">Revenue</th>
                  <th className="rep-col-right">% of Total</th>
                  <th style={{ width: '200px' }}></th>
                </tr>
              </thead>
              <tbody>
                {topParts.map((p, i) => {
                  const pct = summary && summary.grossRevenue > 0
                    ? ((p.revenue / summary.grossRevenue) * 100).toFixed(1)
                    : '—';
                  return (
                    <tr key={p.partId}>
                      <td>
                        <span className={`rep-rank-badge rep-rank-${i}`}>{i + 1}</span>
                      </td>
                      <td className="rep-text-muted">{p.partNo}</td>
                      <td>{p.description}</td>
                      <td className="rep-col-right">{p.qtySold}</td>
                      <td className="rep-col-right rep-text-accent">{fmtR(p.revenue)}</td>
                      <td className="rep-col-right rep-text-muted">{pct}%</td>
                      <td>
                        <div className="rep-bar-wrap">
                          <div className="rep-bar" style={{ width: `${Math.round((p.revenue / maxPartRev) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </RepTable>
          )
        )}

        {/* ── Low Stock ── */}
        {tab === 'lowstock' && !loading && (
          lowStock.length === 0 ? (
            <p className="rep-empty rep-text-success">All parts are adequately stocked.</p>
          ) : (
            <RepTable>
              <thead>
                <tr>
                  <th>Part No</th>
                  <th>Description</th>
                  <th>Supplier</th>
                  <th className="rep-col-right">In Stock</th>
                  <th className="rep-col-right">Reorder At</th>
                  <th className="rep-col-right">Shortfall</th>
                  <th style={{ width: '180px' }}>Stock Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => {
                  const fillPct = p.reorderLevel > 0
                    ? Math.min(100, Math.round((p.stockQty / p.reorderLevel) * 100)) : 0;
                  const isCritical = p.stockQty === 0;
                  return (
                    <tr key={p.id} className={isCritical ? 'rep-row-critical' : 'rep-row-warning'}>
                      <td className="rep-text-muted">{p.partNo}</td>
                      <td>{p.description}</td>
                      <td className="rep-text-muted">{p.supplierName ?? '—'}</td>
                      <td className={`rep-col-right ${isCritical ? 'rep-text-danger' : 'rep-text-warning'}`}>
                        {p.stockQty}
                      </td>
                      <td className="rep-col-right rep-text-muted">{p.reorderLevel}</td>
                      <td className="rep-col-right rep-text-danger">{p.reorderLevel - p.stockQty}</td>
                      <td>
                        <div className="rep-stock-bar-wrap">
                          <div
                            className={`rep-stock-bar ${isCritical ? 'rep-stock-bar-danger' : 'rep-stock-bar-warning'}`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <div className="rep-stock-bar-pct">{fillPct}% of reorder</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </RepTable>
          )
        )}

        {/* ── Supplier Spend ── */}
        {tab === 'suppliers' && !loading && (
          supplierSpend.length === 0 ? (
            <p className="rep-empty">No stock received in this period.</p>
          ) : (
            <RepTable narrow>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th className="rep-col-right">Orders</th>
                  <th className="rep-col-right">Total Spend</th>
                  <th className="rep-col-right">% of Spend</th>
                  <th style={{ width: '200px' }}></th>
                </tr>
              </thead>
              <tbody>
                {supplierSpend.map(s => {
                  const totalSpend = supplierSpend.reduce((a, x) => a + x.totalSpend, 0);
                  const pct = totalSpend > 0 ? ((s.totalSpend / totalSpend) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={s.supplierId}>
                      <td>{s.supplierName}</td>
                      <td className="rep-col-right">{s.orderCount}</td>
                      <td className="rep-col-right rep-text-accent">{fmtR(s.totalSpend)}</td>
                      <td className="rep-col-right rep-text-muted">{pct}%</td>
                      <td>
                        <div className="rep-bar-wrap">
                          <div className="rep-bar" style={{ width: `${Math.round((s.totalSpend / maxSpend) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="rep-footer-label">Total</td>
                  <td className="rep-col-right rep-footer-value">
                    {supplierSpend.reduce((a, s) => a + s.orderCount, 0)}
                  </td>
                  <td className="rep-col-right rep-text-success rep-footer-value">
                    {fmtR(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))}
                  </td>
                  <td /><td />
                </tr>
              </tfoot>
            </RepTable>
          )
        )}

      </div>

      {/* ── Print-only till slip ── */}
      <div className="rep-slip-wrap rep-print-only">
        <div className="rep-slip" ref={slipRef}>
          <div className="slip-header">
            <img src="/logo.jpg" alt="Wayside Garage" className="slip-logo" />
            <div className="slip-company">WAYSIDE GARAGE</div>
            <div className="slip-company-sub">AND MOTOR SPARES</div>
            <div className="slip-report-label">SALES REPORT</div>
            <div className="slip-period">{fmtDate(from)} &mdash; {fmtDate(to)}</div>
          </div>
          <Divider />
          {summary && (<>
            <SectionHead>SUMMARY</SectionHead>
            <Divider dashed />
            <SlipRow label="Total Transactions" value={summary.saleCount} />
            <SlipRow label="Gross Revenue"      value={fmtR(summary.grossRevenue)}      color="accent" bold />
            <SlipRow label="Returns"            value={fmtR(summary.totalReturns)}      color="warning" />
            <SlipRow label="Net Revenue"        value={fmtR(summary.netRevenue)}        color="success" bold />
            <SlipRow label="Trade Outstanding"  value={fmtR(summary.totalTradeBalance)} color={summary.totalTradeBalance > 0 ? 'warning' : ''} />
            <Divider dashed />
            {summary.byPaymentMethod.length > 0 && (<>
              <SectionHead>PAYMENT METHODS</SectionHead>
              <Divider dashed />
              {summary.byPaymentMethod.map(m => (
                <SlipRow key={m.method} label={m.method.toUpperCase()}
                  value={`${fmtR(m.total)}  ${summary.grossRevenue > 0 ? ((m.total / summary.grossRevenue) * 100).toFixed(0) + '%' : ''}`}
                />
              ))}
              <Divider dashed />
            </>)}
            {daily.length > 0 && (<>
              <SectionHead>DAILY SALES</SectionHead>
              <Divider dashed />
              {daily.map(d => (
                <div key={d.date} className="slip-bar-row">
                  <span className="slip-bar-date">{fmtDay(d.date)}</span>
                  <span className="slip-bar-count">{d.saleCount}x</span>
                  <MiniBar value={d.total} max={maxDaily} />
                  <span className="slip-bar-val accent">{fmtR(d.total)}</span>
                </div>
              ))}
              <Divider dashed />
              <SlipRow label="PERIOD TOTAL" value={fmtR(summary.grossRevenue)} bold color="success" />
              <Divider dashed />
            </>)}
            {topParts.length > 0 && (<>
              <SectionHead>TOP SELLING PARTS</SectionHead>
              <Divider dashed />
              {topParts.map((p, i) => (
                <div key={p.partId} className="slip-part-row">
                  <span className="slip-part-rank">{i + 1}.</span>
                  <span className="slip-part-desc">
                    <span className="slip-part-no">{p.partNo}</span>
                    {p.description}
                  </span>
                  <span className="slip-part-meta">
                    <span className="slip-part-qty">{p.qtySold} sold</span>
                    <span className="slip-part-rev accent">{fmtR(p.revenue)}</span>
                  </span>
                </div>
              ))}
              <Divider dashed />
            </>)}
            <SectionHead>
              LOW STOCK
              {lowStock.length > 0 && <span className="slip-alert-badge">{lowStock.length} ITEMS</span>}
            </SectionHead>
            <Divider dashed />
            {lowStock.length === 0 ? (
              <div className="slip-ok">✓ All parts adequately stocked</div>
            ) : lowStock.map(p => (
              <div key={p.id} className="slip-stock-row">
                <span className={`slip-stock-flag ${p.stockQty === 0 ? 'danger' : 'warning'}`}>
                  {p.stockQty === 0 ? '!!' : '!'}
                </span>
                <span className="slip-stock-desc">
                  <span className="slip-part-no">{p.partNo}</span>
                  {p.description}
                </span>
                <span className={`slip-stock-qty ${p.stockQty === 0 ? 'danger' : 'warning'}`}>
                  {p.stockQty}/{p.reorderLevel}
                </span>
              </div>
            ))}
            <Divider dashed />
            {supplierSpend.length > 0 && (<>
              <SectionHead>SUPPLIER SPEND</SectionHead>
              <Divider dashed />
              {supplierSpend.map(s => (
                <div key={s.supplierId} className="slip-bar-row">
                  <span className="slip-bar-date">{s.supplierName}</span>
                  <MiniBar value={s.totalSpend} max={maxSpend} />
                  <span className="slip-bar-val accent">{fmtR(s.totalSpend)}</span>
                </div>
              ))}
              <Divider dashed />
              <SlipRow label="TOTAL SPEND" value={fmtR(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))} bold color="accent" />
              <Divider dashed />
            </>)}
          </>)}
          <Divider />
          <div className="slip-footer">
            <div>Printed: {printedAt}</div>
            <div>Wayside Garage POS — Internal Use Only</div>
          </div>
          <Divider />
        </div>
      </div>

    </div>
  );
}
