import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import './AuditLogPage.css';

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getActionCategory(action) {
  if (!action) return 'other';
  const prefix = action.split('.')[0];
  switch (prefix) {
    case 'Login': return 'login';
    case 'Sale': return 'sale';
    case 'Return': return 'return';
    case 'Stock': return 'stock';
    case 'PO': return 'po';
    case 'Part': return 'part';
    case 'Customer': return 'customer';
    case 'JobCard': return 'jobcard';
    case 'User': return action === 'User.PasswordChange' ? 'user-danger' : 'user';
    default: return 'other';
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);

  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAuditLogs({
        action: filterAction || undefined,
        userId: filterUser || undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        page: p,
      });
      if (res?.success) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPage(res.data.page);
      } else {
        setError(res?.error ?? 'Failed to load audit logs.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterUser, filterFrom, filterTo]);

  useEffect(() => {
    api.getAuditActions().then(r => { if (r?.success) setActions(r.data); });
    api.getAuditUsers().then(r => { if (r?.success) setUsers(r.data); });
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  function handleRefresh() {
    load(page);
  }

  function handleSearch(e) {
    e.preventDefault();
    load(1);
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div className="audit-header-title">
          <Shield size={20} />
          <h1>Audit Log</h1>
        </div>
      </div>

      <form className="audit-toolbar" onSubmit={handleSearch}>
        <div className="audit-toolbar-filters">
          <div className="audit-filter-group">
            <label className="audit-label">From</label>
            <input
              type="date"
              className="audit-input"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
            />
          </div>
          <div className="audit-filter-group">
            <label className="audit-label">To</label>
            <input
              type="date"
              className="audit-input"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
            />
          </div>
          <div className="audit-filter-group">
            <label className="audit-label">Action</label>
            <select
              className="audit-select"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="">All actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="audit-filter-group">
            <label className="audit-label">User</label>
            <select
              className="audit-select"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            >
              <option value="">All users</option>
              {users.map(u => (
                <option key={u.userId} value={u.userId}>{u.username}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="audit-toolbar-actions">
          <button type="submit" className="audit-btn audit-btn--primary">Search</button>
          <button type="button" className="audit-btn audit-btn--ghost" onClick={handleRefresh}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </form>

      {loading && (
        <div className="audit-state audit-state--loading">
          <div className="audit-spinner" />
          <span>Loading audit logs…</span>
        </div>
      )}

      {!loading && error && (
        <div className="audit-state audit-state--error">{error}</div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="audit-state audit-state--empty">
          <Shield size={40} />
          <p>No audit log entries found.</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Detail</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="audit-cell--mono">{formatTimestamp(log.timestamp)}</td>
                    <td>{log.username || <span className="audit-muted">—</span>}</td>
                    <td>
                      <span className={`audit-badge audit-badge--${getActionCategory(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.entityType
                        ? <span>{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</span>
                        : <span className="audit-muted">—</span>
                      }
                    </td>
                    <td className="audit-cell--detail">{log.detail || <span className="audit-muted">—</span>}</td>
                    <td className="audit-cell--mono audit-cell--ip">{log.ipAddress || <span className="audit-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="audit-pagination">
            <span className="audit-pagination-info">
              Page {page} of {totalPages} · {total} total {total === 1 ? 'entry' : 'entries'}
            </span>
            <div className="audit-pagination-controls">
              <button
                className="audit-btn audit-btn--ghost audit-btn--icon"
                onClick={() => load(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                className="audit-btn audit-btn--ghost audit-btn--icon"
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
