import { useState, useEffect, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { api } from '../../api/client';

export default function PartSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [allParts, setAllParts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listParts('').then(res => {
      if (res?.success) setAllParts(res.data);
      else setError('Failed to load parts.');
    }).catch(() => setError('Cannot reach server.')).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(allParts.map(p => p.category?.name ?? p.category))].filter(Boolean).sort();
    return ['All', ...cats];
  }, [allParts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allParts.filter(p => {
      const matchCat = activeCategory === 'All' || (p.category?.name ?? p.category) === activeCategory;
      const matchQ = !q || p.partNo.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allParts, query, activeCategory]);

  if (loading) return <div className="pos-parts-loading">Loading parts…</div>;
  if (error) return <div className="pos-search-error">{error}</div>;

  return (
    <div className="pos-search">
      <div className="pos-search-bar">
        <Search size={16} className="pos-search-icon" />
        <input
          type="text"
          placeholder="Search by part number or description…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="pos-cat-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`pos-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="pos-no-results">No parts found{query ? ` for "${query}"` : ''}.</p>
      ) : (
        <div className="pos-parts-grid">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`pos-part-card ${p.stockQty === 0 ? 'out-of-stock' : ''}`}
              onClick={() => p.stockQty > 0 && onAdd(p)}
            >
              <div className="pos-part-card-top">
                <span className="pos-part-no">{p.partNo}</span>
                <span className={`pos-part-stock ${p.stockQty === 0 ? 'stock-zero' : p.stockQty <= 3 ? 'stock-low' : 'stock-ok'}`}>
                  {p.stockQty === 0 ? 'Out of stock' : `${p.stockQty} in stock`}
                </span>
              </div>
              <div className="pos-part-desc">{p.description}</div>
              <div className="pos-part-card-bottom">
                <span className="pos-part-cat">{p.category?.name ?? p.category}</span>
                <span className="pos-part-price">R {p.sellPrice.toFixed(2)}</span>
                <button
                  className="pos-add-btn"
                  disabled={p.stockQty === 0}
                  onClick={e => { e.stopPropagation(); onAdd(p); }}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
