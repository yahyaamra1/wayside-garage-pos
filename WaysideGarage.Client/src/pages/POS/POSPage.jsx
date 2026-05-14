import { useState } from 'react';
import PartSearch from './PartSearch';
import Basket from './Basket';
import CheckoutModal from './CheckoutModal';
import Receipt from './Receipt';
import './POSPage.css';

export default function POSPage() {
  const [lines, setLines] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [totalDiscount, setTotalDiscount] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState(null);

  function addPart(part) {
    setLines(prev => {
      const existing = prev.find(l => l.partId === part.id);
      if (existing) {
        if (existing.qty >= part.stockQty) return prev;
        return prev.map(l => l.partId === part.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        partId: part.id,
        partNo: part.partNo,
        description: part.description,
        unitPrice: part.sellPrice,
        stockQty: part.stockQty,
        qty: 1,
        discountPct: 0
      }];
    });
  }

  function updateQty(partId, qty) {
    if (qty < 1) return;
    setLines(prev => prev.map(l => l.partId === partId ? { ...l, qty } : l));
  }

  function updateDiscount(partId, pct) {
    const clamped = Math.min(100, Math.max(0, pct));
    setLines(prev => prev.map(l => l.partId === partId ? { ...l, discountPct: clamped } : l));
  }

  function removeLine(partId) {
    setLines(prev => prev.filter(l => l.partId !== partId));
  }

  function handleSaleComplete(saleId) {
    setShowCheckout(false);
    setCompletedSaleId(saleId);
  }

  function resetSale() {
    setLines([]);
    setCustomer(null);
    setTotalDiscount('');
    setCompletedSaleId(null);
  }

  if (completedSaleId) {
    return (
      <div className="pos-page">
        <Receipt saleId={completedSaleId} onNewSale={resetSale} />
      </div>
    );
  }

  return (
    <div className="pos-page">
      <div className="pos-left">
        <div className="pos-page-title">POS Terminal</div>
        <PartSearch onAdd={addPart} />
      </div>

      <div className="pos-right">
        <Basket
          lines={lines}
          customer={customer}
          totalDiscount={totalDiscount}
          onUpdateQty={updateQty}
          onUpdateDiscount={updateDiscount}
          onRemove={removeLine}
          onCustomer={setCustomer}
          onTotalDiscount={setTotalDiscount}
          onCheckout={() => setShowCheckout(true)}
        />
      </div>

      {showCheckout && (
        <CheckoutModal
          lines={lines}
          customer={customer}
          totalDiscount={totalDiscount}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleSaleComplete}
        />
      )}
    </div>
  );
}
