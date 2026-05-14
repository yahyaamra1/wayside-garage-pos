import { useState } from 'react';
import CustomerReturn from './CustomerReturn';
import SupplierReturn from './SupplierReturn';
import './ReturnsPage.css';

const TABS = [
  { id: 'customer', label: 'Customer Return' },
  { id: 'supplier', label: 'Return to Supplier' },
];

export default function ReturnsPage() {
  const [tab, setTab] = useState('customer');

  return (
    <div className="ret-page">
      <div className="ret-header">
        <h2 className="ret-page-title">Returns</h2>
        <div className="ret-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={'ret-tab' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ret-content">
        {tab === 'customer' ? <CustomerReturn /> : <SupplierReturn />}
      </div>
    </div>
  );
}
