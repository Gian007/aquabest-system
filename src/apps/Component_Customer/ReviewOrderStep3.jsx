import { FiArrowLeft, FiCheckCircle, FiClipboard, FiCreditCard, FiEdit2, FiMapPin, FiTruck } from 'react-icons/fi';
import {
  selectedBottles,
  countBottles,
  serviceOptions,
  isDelivery,
  getUnitPrice,
  calculateLineTotal,
  calculateOrderTotal,
  getPaymentMethodLabel,
  formatCustomerMoney
} from './orderData.js';

export default function ReviewOrderStep3({ draft, onBack, onEditWater, onEditDetails, onPreview }) {
  const total = countBottles(draft.quantities);
  const totalAmount = calculateOrderTotal(draft.quantities, draft.ownership, draft.arrangement);
  const selectedService = serviceOptions[draft.ownership].find((s) => s.id === draft.service);
  const delivery = isDelivery(draft.service);
  const paymentLabel = getPaymentMethodLabel(draft.paymentMethod || 'Cash', delivery);
  return (
    <section className="order-screen" aria-labelledby="review-title">
      <div className="order-page-heading"><span className="order-step-pill">Step 3 of 3</span><h1 id="review-title">Review & Place Order</h1><p>Check the details before preparing your request.</p></div>
      <div className="order-panel">
        <div className="panel-title-row"><h2><FiClipboard /> Order items</h2><button type="button" onClick={onEditWater} className="edit-link"><FiEdit2 /> Edit</button></div>
        {selectedBottles(draft.quantities).map((item) => {
          const qty = draft.quantities[item.id];
          const unitPrice = getUnitPrice(item.id, draft.ownership, draft.arrangement);
          const lineTotal = calculateLineTotal(item.id, qty, draft.ownership, draft.arrangement);
          return (
            <div className="review-item" key={item.id}>
              <img src={item.image} alt="" />
              <span>
                <strong>{item.name} · {item.shape}</strong>
                <small>{draft.ownership === 'own' ? 'My own container (refill)' : draft.arrangement === 'purchase' ? 'Purchase container + water' : 'Returnable container request'}</small>
                <small className="review-unit-calc">{formatCustomerMoney(unitPrice)} × {qty}</small>
              </span>
              <div className="review-item-right">
                <strong className="tabular-money">{formatCustomerMoney(lineTotal)}</strong>
                <small>× {qty}</small>
              </div>
            </div>
          );
        })}
        <div className="review-count"><span>Total containers</span><strong>{total}</strong></div>
        <div className="review-total-amount"><span>Total Amount</span><strong className="tabular-money">{formatCustomerMoney(totalAmount)}</strong></div>
      </div>
      <div className="order-panel">
        <div className="panel-title-row"><h2><FiTruck /> Service method</h2><button type="button" className="edit-link" onClick={onEditWater}><FiEdit2 /> Edit</button></div>
        <strong>{selectedService?.name}</strong><p className="panel-hint">{selectedService?.detail}</p>
      </div>
      <div className="order-panel">
        <div className="panel-title-row"><h2><FiMapPin /> {delivery ? 'Delivery details' : 'Pickup details'}</h2><button type="button" className="edit-link" onClick={onEditDetails}><FiEdit2 /> Edit</button></div>
        {delivery && <p>{draft.details.address}, {draft.details.barangay}{draft.details.landmark ? ', ' + draft.details.landmark : ''}</p>}
        <p>{draft.details.name} · {draft.details.phone}</p>
        <p>Requested: {draft.details.date} · {draft.details.time}</p>
        {draft.details.notes && <p>Notes: {draft.details.notes}</p>}
      </div>
      <div className="order-panel order-price-panel">
        <div className="panel-title-row"><h2><FiCreditCard /> Charges & payment</h2><button type="button" className="edit-link" onClick={onEditDetails}><FiEdit2 /> Edit</button></div>
        <div className="review-payment-summary">
          <div><span>Payment Method</span><strong>{paymentLabel}</strong></div>
          {draft.paymentReference && <div><span>Reference</span><strong>{draft.paymentReference}</strong></div>}
          <div><span>Estimated Total</span><strong className="tabular-money">{formatCustomerMoney(totalAmount)}</strong></div>
        </div>
        <p className="panel-hint">Rates shown match AquaBest station pricing; any special delivery or container deposit fee is confirmed by the station. Cash is collected on handover; GCash and Bank Transfers are verified manually by staff (no third-party payment gateway).</p>
      </div>
      <div className="order-actions"><button type="button" className="btn order-secondary" onClick={onBack}><FiArrowLeft /> Back</button><button type="button" className="btn order-primary" onClick={onPreview}>Preview Request <FiCheckCircle /></button></div>
    </section>
  );
}
