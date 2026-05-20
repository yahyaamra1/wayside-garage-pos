import { useState, useEffect, useCallback } from 'react';
import { Plus, Wrench, Car, Search } from 'lucide-react';
import { api } from '../../api/client';
import JobCardForm from './JobCardForm';
import JobCardDetail from './JobCardDetail';
import './JobCardsPage.css';

const STATUS_FILTERS = ['All', 'Open', 'InProgress', 'Completed', 'Cancelled'];
const STATUS_LABELS = { All: 'All', Open: 'Open', InProgress: 'In Progress', Completed: 'Completed', Cancelled: 'Cancelled' };
const STATUS_CLASS = { Open: 'jc-badge-open', InProgress: 'jc-badge-inprogress', Completed: 'jc-badge-completed', Cancelled: 'jc-badge-cancelled' };

export default function JobCardsPage() {
  const [cards, setCards] = useState([]);
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listJobCards(filter === 'All' ? null : filter, q || null);
      if (res?.success) setCards(res.data);
      else setError('Failed to load job cards.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  }, [filter, q]);

  useEffect(() => { loadList(); }, [loadList]);

  async function selectCard(id) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await api.getJobCard(id);
      if (res?.success) setSelectedCard(res.data);
    } catch { setError('Failed to load job card.'); }
    finally { setDetailLoading(false); }
  }

  async function handleRefresh() {
    await loadList();
    if (selectedId) await selectCard(selectedId);
  }

  function handleCreated(id) {
    setShowForm(false);
    setEditCard(null);
    loadList();
    selectCard(id);
  }

  function openEdit() {
    setEditCard(selectedCard);
    setShowForm(true);
  }

  return (
    <div className="jc-page">
      <div className="jc-list-panel">
        <div className="jc-list-header">
          <h2 className="jc-page-title">Job Cards</h2>
          <button className="jc-new-btn" onClick={() => { setEditCard(null); setShowForm(true); }}>
            <Plus size={16} /> New Job Card
          </button>
        </div>

        <div className="jc-search-wrap">
          <Search size={14} className="jc-search-icon" />
          <input
            className="jc-search"
            placeholder="Search reg, make, customer…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <div className="jc-filter-tabs">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={'jc-filter-tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {error && <p className="ret-error" style={{ margin: '12px 16px' }}>{error}</p>}

        {loading ? <p className="po-loading">Loading…</p> : cards.length === 0 ? (
          <p className="po-empty">No job cards found.</p>
        ) : (
          <ul className="jc-list">
            {cards.map(c => (
              <li key={c.id} className={'jc-list-item' + (selectedId === c.id ? ' selected' : '')} onClick={() => selectCard(c.id)}>
                <div className="jc-list-item-top">
                  <span className="jc-list-id">{c.jobNo}</span>
                  <span className={'jc-badge ' + STATUS_CLASS[c.status]}>{STATUS_LABELS[c.status]}</span>
                </div>
                <div className="jc-list-vehicle">
                  <Car size={12} /> {c.vehicleReg} — {c.vehicleMake} {c.vehicleModel}
                </div>
                {c.customer && <div className="jc-list-customer">{c.customer}</div>}
                <div className="jc-list-meta">
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  <span>{c.lineCount} line{c.lineCount !== 1 ? 's' : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="jc-detail-panel">
        {detailLoading ? (
          <p className="po-loading">Loading…</p>
        ) : selectedCard ? (
          <JobCardDetail card={selectedCard} onRefresh={handleRefresh} onEdit={openEdit} />
        ) : (
          <div className="jc-detail-empty">
            <Wrench size={40} className="jc-empty-icon" />
            <p>Select a job card to view details</p>
          </div>
        )}
      </div>

      {showForm && (
        <JobCardForm
          card={editCard}
          onClose={() => { setShowForm(false); setEditCard(null); }}
          onSaved={handleCreated}
        />
      )}
    </div>
  );
}
