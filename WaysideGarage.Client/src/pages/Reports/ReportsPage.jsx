import { useState, useEffect, useCallback, useRef } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
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
function SlipRow({ label, value, bold, color, indent }) {
  return (
    <div className={`slip-row ${bold ? 'bold' : ''} ${indent ? 'indent' : ''}`}>
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

/* ── Screen-only table helpers ── */
function RepTable({ children, narrow }) {
  return <table className={`rep-table ${narrow ? 'rep-table-narrow' : ''}`}>{children}</table>;
}

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to,   setTo]   = useState(today());
  const [tab,  setTab]  = useState('overview');

  const [summary,      setSummary]      = useState(null);
  const [daily,        setDaily]        = useState([]);
  const [salesDetail,  setSalesDetail]  = useState([]);
  const [topParts,     setTopParts]     = useState([]);
  const [lowStock,     setLowStock]     = useState([]);
  const [supplierSpend,setSupplierSpend]= useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

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

  const maxDaily = Math.max(...daily.map(d => d.total), 1);
  const maxSpend = Math.max(...supplierSpend.map(s => s.totalSpend), 1);
  const maxPartRev = Math.max(...topParts.map(p => p.revenue), 1);

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
          <input type="date" className="rep-date" value={to}   onChange={e => setTo(e.target.value)} />
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
            <span className="rep-kpi-label">Transactions</span>
            <span className="rep-kpi-value">{summary.saleCount}</span>
          </div>
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">Gross Revenue</span>
            <span className="rep-kpi-value accent">{fmtR(summary.grossRevenue)}</span>
          </div>
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">Returns</span>
            <span className="rep-kpi-value warning">{fmtR(summary.totalReturns)}</span>
          </div>
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">Net Revenue</span>
            <span className="rep-kpi-value success">{fmtR(summary.netRevenue)}</span>
          </div>
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">Trade Outstanding</span>
            <span className={`rep-kpi-value ${summary.totalTradeBalance > 0 ? 'warning' : ''}`}>
              {fmtR(summary.totalTradeBalance)}
            </span>
          </div>
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">Low Stock Parts</span>
            <span className={`rep-kpi-value ${lowStock.length > 0 ? 'danger' : 'success'}`}>
              {lowStock.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="rep-tabs no-print">
        {[
          ['overview',  'Daily Sales'],
          ['payment',   'Payment Methods'],
          ['parts',     'Top Parts'],
          ['lowstock',  'Low Stock'],
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

      {/* ── Tab content ── */}
      <div className="rep-tab-content no-print">

        {loading && <p className="rep-loading">Loading…</p>}

        {/* Daily Sales — one card per individual sale */}
        {tab === 'overview' && !loading && (
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
                const maxSale = Math.max(...salesDetail.map(x => x.total), 1);
                const barPct  = Math.round((s.total / maxSale) * 100);

                return (
                  <div key={s.id} className="rep-day-card">
                    {/* Header */}
                    <div className="rep-day-card-head">
                      <div className="rep-day-card-weekday">{dayName}</div>
                      <div className="rep-day-card-datenum">{dayNum} {month} {year}</div>
                      <div className="rep-day-card-time">{time}</div>
                    </div>

                    {/* Invoice + customer */}
                    <div className="rep-day-card-meta">
                      <span className="rep-day-card-invoice">#{s.invoiceNo}</span>
                      <span className="rep-day-card-method">{s.paymentMethod}</span>
                    </div>
                    {s.customer && (
                      <div className="rep-day-card-customer">{s.customer}</div>
                    )}

                    {/* Items */}
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

                    {/* Total + bar */}
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

        {/* Payment Methods */}
        {tab === 'payment' && !loading && (
          !summary || summary.byPaymentMethod.length === 0 ? (
            <p className="rep-empty">No sales in this period.</p>
          ) : (
            <RepTable narrow>
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
                    <td className="rep-col-right">{fmtR(m.total)}</td>
                    <td className="rep-col-right rep-text-muted">
                      {summary.grossRevenue > 0
                        ? `${((m.total / summary.grossRevenue) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </RepTable>
          )
        )}

        {/* Top Parts */}
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
                  <th style={{ width: '180px' }}></th>
                </tr>
              </thead>
              <tbody>
                {topParts.map((p, i) => (
                  <tr key={p.partId}>
                    <td className="rep-text-muted">{i + 1}</td>
                    <td className="rep-text-muted">{p.partNo}</td>
                    <td>{p.description}</td>
                    <td className="rep-col-right">{p.qtySold}</td>
                    <td className="rep-col-right rep-text-accent">{fmtR(p.revenue)}</td>
                    <td>
                      <div className="rep-bar-wrap">
                        <div className="rep-bar" style={{ width: `${Math.round((p.revenue / maxPartRev) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </RepTable>
          )
        )}

        {/* Low Stock */}
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
                    <td className="rep-col-right rep-text-danger">{p.reorderLevel - p.stockQty}</td>
                  </tr>
                ))}
              </tbody>
            </RepTable>
          )
        )}

        {/* Supplier Spend */}
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
                  <th style={{ width: '180px' }}></th>
                </tr>
              </thead>
              <tbody>
                {supplierSpend.map(s => (
                  <tr key={s.supplierId}>
                    <td>{s.supplierName}</td>
                    <td className="rep-col-right">{s.orderCount}</td>
                    <td className="rep-col-right rep-text-accent">{fmtR(s.totalSpend)}</td>
                    <td>
                      <div className="rep-bar-wrap">
                        <div className="rep-bar" style={{ width: `${Math.round((s.totalSpend / maxSpend) * 100)}%` }} />
                      </div>
                    </td>
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
                    {fmtR(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))}
                  </td>
                  <td />
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
            <SlipRow label="Total Transactions"  value={summary.saleCount} />
            <SlipRow label="Gross Revenue"       value={fmtR(summary.grossRevenue)}       color="accent" bold />
            <SlipRow label="Returns"             value={fmtR(summary.totalReturns)}       color="warning" />
            <SlipRow label="Net Revenue"         value={fmtR(summary.netRevenue)}         color="success" bold />
            <SlipRow label="Trade Outstanding"   value={fmtR(summary.totalTradeBalance)}  color={summary.totalTradeBalance > 0 ? 'warning' : ''} />
            <Divider dashed />

            {summary.byPaymentMethod.length > 0 && (<>
              <SectionHead>PAYMENT METHODS</SectionHead>
              <Divider dashed />
              {summary.byPaymentMethod.map(m => (
                <SlipRow
                  key={m.method}
                  label={m.method.toUpperCase()}
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
              <SlipRow
                label="TOTAL SPEND"
                value={fmtR(supplierSpend.reduce((a, s) => a + s.totalSpend, 0))}
                bold color="accent"
              />
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
