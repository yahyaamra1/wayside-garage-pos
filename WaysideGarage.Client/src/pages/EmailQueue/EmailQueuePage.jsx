import { useState, useEffect, useCallback } from 'react';
import { Mail, Check, X, Eye } from 'lucide-react';
import { api } from '../../api/client';
import './EmailQueuePage.css';

const STATUS_FILTERS = ['All', 'Pending', 'Sent', 'Rejected', 'Failed'];

const TYPE_LABELS = {
  BalanceAlert: 'Balance Alert',
  LowStockReport: 'Low Stock Report',
  SupplierReturnPdf: 'Supplier Return',
};

export default function EmailQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('Pending');
  const [preview, setPreview] = useState(null);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listEmailQueue(filter === 'All' ? '' : filter);
      if (!res?.success) throw new Error(res?.error ?? 'Failed to load queue.');
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    setActing(id);
    const res = await api.approveEmail(id);
    setActing(null);
    if (res?.success) load();
    else alert(res?.error ?? 'Failed to approve.');
  }

  async function reject(id) {
    setActing(id);
    const res = await api.rejectEmail(id);
    setActing(null);
    if (res?.success) load();
    else alert(res?.error ?? 'Failed to reject.');
  }

  async function openPreview(id) {
    const res = await api.getEmailBody(id);
    if (res?.success) setPreview(res.data.body);
  }

  const pendingCount = items.filter(i => i.status === 'Pending').length;

  return (
    <div className="eq-page">
      <div className="eq-header">
        <div className="eq-header-left">
          <Mail size={20} />
          <h1 className="eq-title">Email Queue</h1>
          {pendingCount > 0 && filter !== 'Pending' && (
            <span className="eq-badge">{pendingCount} pending</span>
          )}
        </div>
      </div>

      <div className="eq-filters">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            className={`eq-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="eq-loading">Loading…</div>
      ) : error ? (
        <div className="eq-error">{error}</div>
      ) : items.length === 0 ? (
        <div className="eq-empty">
          {filter === 'Pending' ? 'No pending emails — all clear.' : `No ${filter.toLowerCase()} emails.`}
        </div>
      ) : (
        <div className="eq-table-wrap">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className={`eq-type-badge ${item.type.toLowerCase().replace('report','')}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </td>
                  <td>
                    <div className="eq-recipient-name">{item.toName}</div>
                    <div className="eq-recipient-email">{item.toEmail}</div>
                  </td>
                  <td className="eq-subject">{item.subject}</td>
                  <td className="eq-date">{new Date(item.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>
                    <span className={`eq-status eq-status-${item.status.toLowerCase()}`}>
                      {item.status}
                      {item.sentAt && <span className="eq-sent-time"> · {new Date(item.sentAt).toLocaleTimeString('en-ZA', { timeStyle: 'short' })}</span>}
                    </span>
                    {item.errorMessage && <div className="eq-error-msg">{item.errorMessage}</div>}
                  </td>
                  <td>
                    <div className="eq-actions">
                      <button className="eq-action-btn preview" onClick={() => openPreview(item.id)} title="Preview email">
                        <Eye size={14} />
                      </button>
                      {item.status === 'Pending' && (
                        <>
                          <button
                            className="eq-action-btn approve"
                            onClick={() => approve(item.id)}
                            disabled={acting === item.id}
                            title="Approve & send"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="eq-action-btn reject"
                            onClick={() => reject(item.id)}
                            disabled={acting === item.id}
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="eq-preview-overlay" onClick={() => setPreview(null)}>
          <div className="eq-preview-box" onClick={e => e.stopPropagation()}>
            <div className="eq-preview-header">
              <span>Email Preview</span>
              <button onClick={() => setPreview(null)}><X size={16} /></button>
            </div>
            <iframe
              className="eq-preview-iframe"
              srcDoc={preview}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
