import { FiArrowLeft, FiArrowRight, FiClipboard, FiClock, FiRefreshCw } from 'react-icons/fi';
import { selectedBottles } from './orderData.js';
import { useState } from 'react';

export default function MyOrders({ demoOrder, onBack, onNewOrder }) {
  const [tab, setTab] = useState('ongoing');
  const hasDemo = Boolean(demoOrder);
  return (
    <section className="order-screen" aria-labelledby="my-orders-title">
      <div className="order-page-heading"><h1 id="my-orders-title">My Orders</h1><p>Ongoing requests and order history.</p></div>
      <div className="order-tabs" role="tablist" aria-label="Order category">
        <button type="button" role="tab" aria-selected={tab === 'ongoing'} onClick={() => setTab('ongoing')}>Ongoing {hasDemo ? '(Demo)' : ''}</button>
        <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>Order History</button>
      </div>
      {tab === 'ongoing' && (hasDemo ? <div className="order-panel">
        <div className="demo-tag">DEMO ONLY — NOT SUBMITTED</div>
        <h2>Request preview</h2>
        {selectedBottles(demoOrder.quantities).map((item) => <p key={item.id}>{demoOrder.quantities[item.id]} × {item.name} · {item.shape}</p>)}
        <div className="tracking-preview"><FiClock /><span><strong>Not sent to AquaBest</strong><small>Live tracking becomes available after backend integration and staff confirmation.</small></span></div>
        <button className="btn order-primary" type="button" onClick={onNewOrder}>Start Another Draft <FiArrowRight /></button>
      </div> : <div className="order-panel empty-orders"><FiClipboard size={30} /><h2>No ongoing orders yet</h2><p>When real ordering is connected, confirmed requests and their progress will appear here.</p><button className="btn order-primary" type="button" onClick={onNewOrder}>Order Water <FiArrowRight /></button></div>)}
      {tab === 'history' && <div className="order-panel empty-orders"><FiRefreshCw size={30} /><h2>No order history yet</h2><p>Completed orders and Order Again will appear after real orders are connected.</p></div>}
      <button className="btn order-text-back" type="button" onClick={onBack}><FiArrowLeft /> Back to Home</button>
    </section>
  );
}
