import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';

const EMPTY_LINE = { type: 'Labour', description: '', unitPrice: '', qty: '1', partId: null };

export default function JobCardForm({ card, onClose, onSaved }) {
  const isEdit = !!card;
  const [form, setForm] = useState({
    vehicleReg: card?.vehicleReg ?? '',
    vehicleMake: card?.vehicleMake ?? '',
    vehicleModel: card?.vehicleModel ?? '',
    mileage: card?.mileage ?? '',
    notes: card?.notes ?? '',
    customerId: card?.customer?.id ?? null,
  });
  const [lines, setLines] = useState(
    card?.lines?.map(l => ({ type: l.type, description: l.description, unitPrice: l.unitPrice, qty: l.qty, partId: l.partId })) ?? []
  );
  const [custQuery, setCustQuery] = useState(card?.customer?.name ?? '');
  const [custResults, setCustResults] = useState([]);
  const [partQuery, setPartQuery] = useState('');
  const [partResults, setPartResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  let custTimer = null;
  function searchCustomer(q) {
    clearTimeout(custTimer);
    if (q.length < 2) { setCustResults([]); return; }
    custTimer = setTimeout(async () => {
      const res = await api.searchCustomers(q);
      if (res?.success) setCustResults(res.data);
    }, 280);
  }

  let partTimer = null;
  function searchPart(q) {
    clearTimeout(partTimer);
    if (q.length < 2) { setPartResults([]); return; }
    partTimer = setTimeout(async () => {
      const res = await api.searchParts(q);
      if (res?.success) setPartResults(res.data);
    }, 280);
  }

  function setField(field, val) { setForm(prev => ({ ...prev, [field]: val })); }

  function addLine(type = 'Labour') {
    setLines(prev => [...prev, { ...EMPTY_LINE, type }]);
  }

  function setLine(idx, field, val) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }

  function removeLine(idx) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function pickPart(idx, part) {
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l,
      description: part.description,
      unitPrice: part.sellPrice,
      partId: part.id,
      type: 'Part'
    } : l));
    setPartQuery('');
    setPartResults([]);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = {
        customerId: form.customerId,
        vehicleReg: form.vehicleReg,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        notes: form.notes || null,
        lines: lines.map(l => ({
          type: l.type,
          description: l.description,
          unitPrice: parseFloat(l.unitPrice) || 0,
          qty: parseFloat(l.qty) || 1,
          partId: l.partId
        }))
      };
      const res = isEdit
        ? await api.updateJobCard(card.id, body)
        : await api.createJobCard(body);
      if (!res?.success) { setError(res?.error ?? 'Save failed.'); return; }
      onSaved(isEdit ? card.id : res.data.id);
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  }

  const total = lines.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (parseFloat(l.qty) || 0), 0);

  return (
    <div className="jc-overlay">
      <div className="jc-form-panel">
        <div className="jc-form-header">
          <h3>{isEdit ? `Edit — ${card.jobNo}` : 'New Job Card'}</h3>
          <button className="jc-form-close" onClick={onClose}>✕</button>
        </div>

        <form className="jc-form" onSubmit={submit}>
          {/* Vehicle */}
          <div className="jc-section-label">Vehicle</div>
          <div className="jc-form-row">
            <div className="jc-field">
              <label>Registration *</label>
              <input value={form.vehicleReg} onChange={e => setField('vehicleReg', e.target.value)} placeholder="e.g. GP 123-456" required />
            </div>
            <div className="jc-field">
              <label>Mileage</label>
              <input type="number" min="0" value={form.mileage} onChange={e => setField('mileage', e.target.value)} placeholder="km" />
            </div>
          </div>
          <div className="jc-form-row">
            <div className="jc-field">
              <label>Make *</label>
              <input value={form.vehicleMake} onChange={e => setField('vehicleMake', e.target.value)} placeholder="e.g. Toyota" required />
            </div>
            <div className="jc-field">
              <label>Model *</label>
              <input value={form.vehicleModel} onChange={e => setField('vehicleModel', e.target.value)} placeholder="e.g. Corolla" required />
            </div>
          </div>

          {/* Customer */}
          <div className="jc-section-label">Customer (optional)</div>
          <div className="jc-customer-wrap">
            <input
              value={custQuery}
              onChange={e => { setCustQuery(e.target.value); searchCustomer(e.target.value); if (!e.target.value) setField('customerId', null); }}
              placeholder="Search customer…"
            />
            {custResults.length > 0 && (
              <ul className="jc-dropdown">
                {custResults.map(c => (
                  <li key={c.id} onClick={() => { setField('customerId', c.id); setCustQuery(c.name); setCustResults([]); }}>
                    {c.name}{c.phone ? ` — ${c.phone}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Lines */}
          <div className="jc-section-label">Work Lines</div>
          {lines.map((line, idx) => (
            <div key={idx} className="jc-line">
              <div className="jc-line-top">
                <select value={line.type} onChange={e => setLine(idx, 'type', e.target.value)} className="jc-line-type">
                  <option value="Labour">Labour</option>
                  <option value="Part">Part</option>
                </select>
                <button type="button" className="jc-line-remove" onClick={() => removeLine(idx)}><Trash2 size={13} /></button>
              </div>
              <div className="jc-line-desc-row">
                <input
                  value={line.description}
                  onChange={e => setLine(idx, 'description', e.target.value)}
                  placeholder={line.type === 'Labour' ? 'e.g. Replace brake pads' : 'Part description'}
                  required
                />
              </div>
              {line.type === 'Part' && (
                <div className="jc-part-search-wrap">
                  <input
                    placeholder="Search part to auto-fill…"
                    value={partQuery}
                    onChange={e => { setPartQuery(e.target.value); searchPart(e.target.value); }}
                  />
                  {partResults.length > 0 && (
                    <ul className="jc-dropdown">
                      {partResults.map(p => (
                        <li key={p.id} onClick={() => pickPart(idx, p)}>
                          <span className="jc-dropdown-partno">{p.partNo}</span> {p.description} — R {p.sellPrice.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="jc-line-amounts">
                <div className="jc-field">
                  <label>Unit Price (R)</label>
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => setLine(idx, 'unitPrice', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="jc-field">
                  <label>{line.type === 'Labour' ? 'Hours' : 'Qty'}</label>
                  <input type="number" min="0.1" step="0.1" value={line.qty} onChange={e => setLine(idx, 'qty', e.target.value)} required />
                </div>
                <div className="jc-field jc-field-total">
                  <label>Total</label>
                  <span>R {((parseFloat(line.unitPrice) || 0) * (parseFloat(line.qty) || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="jc-add-line-row">
            <button type="button" className="jc-add-line-btn" onClick={() => addLine('Labour')}>+ Labour</button>
            <button type="button" className="jc-add-line-btn" onClick={() => addLine('Part')}>+ Part</button>
            {lines.length > 0 && <span className="jc-line-total">Total: R {total.toFixed(2)}</span>}
          </div>

          {/* Notes */}
          <div className="jc-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3} placeholder="Additional notes…" />
          </div>

          {error && <p className="ret-error">{error}</p>}

          <div className="jc-form-footer">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn-primary" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Job Card'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
