import { useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../api/client';

export default function PartSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchParts(q);
        if (res?.success) setResults(res.data);
        else setError('Search failed.');
      } catch {
        setError('Cannot reach server.');
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  function handleAdd(part) {
    onAdd(part);
    setQuery('');
    setResults([]);
  }

  return (
    <div className="pos-search">
      <div className="pos-search-bar">
        <Search size={16} className="pos-search-icon" />
        <input
          type="text"
          placeholder="Search by part number or description…"
          value={query}
          onChange={handleChange}
          autoFocus
        />
      </div>

      {error && <p className="pos-search-error">{error}</p>}

      {results.length > 0 && (
        <div className="pos-results">
          <table className="pos-results-table">
            <thead>
              <tr>
                <th>Part No</th>
                <th>Description</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id} className={p.stockQty === 0 ? 'out-of-stock' : ''}>
                  <td className="part-no">{p.partNo}</td>
                  <td>{p.description}</td>
                  <td className="muted">{p.category}</td>
                  <td className="price">R {p.sellPrice.toFixed(2)}</td>
                  <td className={p.stockQty <= 3 ? 'stock-low' : 'stock-ok'}>{p.stockQty}</td>
                  <td>
                    <button
                      className="pos-add-btn"
                      onClick={() => handleAdd(p)}
                      disabled={p.stockQty === 0}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && !error && (
        <p className="pos-no-results">No parts found for "{query}"</p>
      )}
    </div>
  );
}
