import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../api/client';
import CreatePOModal from './CreatePOModal';
import PODetail from './PODetail';
import './PurchaseOrdersPage.css';

const STATUS_FILTERS = ['All', 'Open', 'PartialReceived', 'Received', 'Cancelled'];
const STATUS_LABELS = { All: 'All', Open: 'Open', PartialReceived: 'Partial', Received: 'Received', Cancelled: 'Cancelled' };

const STATUS_CLASS = {
  Open: 'po-badge-open',
  PartialReceived: 'po-badge-partial',
  Received: 'po-badge-received',
  Cancelled: 'po-badge-cancelled'
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPO, setEditPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listPOs(filter === 'All' ? null : filter);
      if (res?.success) setPos(res.data);
      else setError('Failed to load orders.');
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadList(); }, [loadList]);

  async function selectPO(id) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await api.getPO(id);
      if (res?.success) setSelectedPO(res.data);
    } catch {
      setError('Failed to load order detail.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRefresh() {
    await loadList();
    if (selectedId) await selectPO(selectedId);
  }

  function handleCreated(id) {
    setShowCreate(false);
    loadList();
    selectPO(id);
  }

  return (
    <div className="po-page">
      {/* Left panel — list */}
      <div className="po-list-panel">
        <div className="po-list-header">
          <h2 className="po-page-title">Purchase Orders</h2>
          <button className="po-new-btn" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New PO
          </button>
        </div>

        <div className="po-filter-tabs">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              className={'po-filter-tab' + (filter === f ? ' active' : '')}
              onClick={() => setFilter(f)}
            >
              {STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {error && <p className="ret-error" style={{ margin: '12px 16px' }}>{error}</p>}

        {loading ? (
          <p className="po-loading">Loading…</p>
        ) : pos.length === 0 ? (
          <p className="po-empty">No purchase orders found.</p>
        ) : (
          <ul className="po-list">
            {pos.map(p => (
              <li
                key={p.id}
                className={'po-list-item' + (selectedId === p.id ? ' selected' : '')}
                onClick={() => selectPO(p.id)}
              >
                <div className="po-list-item-top">
                  <span className="po-list-id">PO #{String(p.id).padStart(5, '0')}</span>
                  <span className={'po-badge ' + STATUS_CLASS[p.status]}>{STATUS_LABELS[p.status]}</span>
                </div>
                <div className="po-list-item-supplier">{p.supplier}</div>
                <div className="po-list-item-meta">
                  <span>{new Date(p.date).toLocaleDateString()}</span>
                  <span>{p.lineCount} line{p.lineCount !== 1 ? 's' : ''}</span>
                  <span className="po-list-value">R {p.totalValue.toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right panel — detail */}
      <div className="po-detail-panel">
        {detailLoading ? (
          <p className="po-loading">Loading order…</p>
        ) : selectedPO ? (
          <PODetail po={selectedPO} onRefresh={handleRefresh} onEdit={() => setEditPO(selectedPO)} />
        ) : (
          <div className="po-detail-empty">
            <p>Select a purchase order to view details</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePOModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editPO && (
        <CreatePOModal
          po={editPO}
          onClose={() => setEditPO(null)}
          onCreated={(id) => { setEditPO(null); handleRefresh(); selectPO(id); }}
        />
      )}
    </div>
  );
}
