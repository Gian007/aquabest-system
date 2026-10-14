import { useState } from 'react';
import { FiArrowRight, FiDroplet, FiPackage, FiShield, FiTruck, FiMapPin } from 'react-icons/fi';
import NavBarCustomer from './Component_Customer/navBarCustomer.jsx';
import OrderWaterStep1 from './Component_Customer/OrderWaterStep1.jsx';
import OrderDetailsStep2 from './Component_Customer/OrderDetailsStep2.jsx';
import ReviewOrderStep3 from './Component_Customer/ReviewOrderStep3.jsx';
import MyOrders from './Component_Customer/MyOrders.jsx';
import model from '../assets/Model_Imgs/model.png';
import bottleRound from '../assets/WaterBottleSize/bottle_5_round.png';
import bottleSlim from '../assets/WaterBottleSize/bottle_5.png';
import './customerWeb.css';
import './orderFlow.css';

const tips = [
  'Keep drinking water within reach throughout your day.',
  'Wash reusable water bottles regularly.',
  'Store drinking water in clean, covered containers.',
];
const createDraft = () => ({
  ownership: 'own',
  arrangement: 'purchase',
  quantities: { round5: 0, slim25: 0, slim5: 0 },
  service: 'pickup-return',
  details: { address: '', barangay: '', landmark: '', name: '', phone: '', date: '', time: '', notes: '' },
});

export default function CustomerWeb() {
  const [page, setPage] = useState('home');
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(createDraft);
  const [demoOrder, setDemoOrder] = useState(null);
  const [notice, setNotice] = useState('');
  const goHome = () => { setNotice(''); setPage('home'); window.scrollTo(0, 0); };
  const goOrders = () => { setPage('orders'); setNotice(''); window.scrollTo(0, 0); };
  const startOrder = () => {
    if (demoOrder) setNotice('You have a demo request preview in My Orders. You may still prepare another order.');
    else setNotice('');
    setDraft(createDraft());
    setStep(1);
    setPage('order');
    window.scrollTo(0, 0);
  };
  const updateDraft = (partial) => setDraft((current) => ({ ...current, ...partial }));
  const moveStep = (next) => { setStep(next); window.scrollTo(0, 0); };
  const previewRequest = () => {
    setDemoOrder({ ...draft, quantities: { ...draft.quantities }, details: { ...draft.details } });
    goOrders();
  };
  return (
    <div id="home" className="customer-site">
      <NavBarCustomer page={page} onHome={goHome} onOrder={startOrder} onOrders={goOrders} />
      <main className="customer-main container-fluid px-3 px-md-4">
        {page === 'home' && <>
          <section className="hero-banner" aria-labelledby="hero-title">
            <div className="hero-content"><p className="hero-eyebrow">FRESH • CLEAN • RELIABLE</p><h1 id="hero-title">Fresh water, right at your doorstep.</h1>
              <button className="btn hero-action" type="button" onClick={startOrder}>Order Now <FiArrowRight /></button></div>
            <img className="hero-model" src={model} alt="AquaBest ambassador holding bottled water" />
          </section>
          <section className="section-block" aria-labelledby="offer-title" id="products">
            <h2 id="offer-title" className="section-title">What We Offer</h2>
            <p className="panel-hint">Select your water service. Choose quantities and container sizes in the next step.</p>
            <div className="row g-3">
              <div className="col-6"><article className="product-card h-100"><div className="product-illustration"><img className="offer-bottle" src={bottleRound} alt="Round water container" /></div><h3>Refill My Container</h3><p>Have your own bottles refilled.</p><button type="button" className="btn add-button" onClick={startOrder}>Order Refill <FiArrowRight /></button></article></div>
              <div className="col-6"><article className="product-card h-100"><div className="product-illustration"><img className="offer-bottle" src={bottleSlim} alt="Slim water container" /></div><h3>Container + Water</h3><p>Request AquaBest-provided containers.</p><button type="button" className="btn add-button" onClick={() => { startOrder(); setDraft((current) => ({ ...current, ownership: 'store', service: 'delivery' })); }}>Order Container <FiArrowRight /></button></article></div>
            </div>
          </section>
          <section className="bulk-card" aria-labelledby="bulk-title"><span className="bulk-icon"><FiPackage size={25} /></span><div><h2 id="bulk-title">Custom & Bulk Orders</h2><p>Offices, events, special sizes, or customer-provided labels.</p><a href="tel:09994544981" className="bulk-link">Call for a quotation <FiArrowRight size={15} /></a></div></section>
          <section className="why-section" aria-labelledby="why-title"><h2 id="why-title" className="section-title">Why AquaBest?</h2><div className="row g-2">{[{ label: 'Water Treatment', Icon: FiDroplet }, { label: 'Quality Focus', Icon: FiShield }, { label: 'Convenient Service', Icon: FiTruck }].map(({ label, Icon }) => <div className="col-4" key={label}><div className="why-item"><span><Icon size={23} /></span><p>{label}</p></div></div>)}</div></section>
          <section className="tips-section" aria-labelledby="tips-title"><h2 id="tips-title" className="section-title">Water Tips</h2><div className="tips-track" aria-label="Swipe horizontally for water tips">{tips.map((tip, index) => <article className="tip-card" key={tip}><span>TIP {String(index + 1).padStart(2, '0')}</span><p>{tip}</p></article>)}</div></section>
        </>}
        {page === 'order' && <>
          {notice && <div role="status" className="order-notice"><FiMapPin /> {notice}<button type="button" onClick={goOrders}>My Orders</button></div>}
          {step === 1 && <OrderWaterStep1 draft={draft} updateDraft={updateDraft} onNext={() => moveStep(2)} />}
          {step === 2 && <OrderDetailsStep2 draft={draft} updateDraft={updateDraft} onBack={() => moveStep(1)} onNext={() => moveStep(3)} />}
          {step === 3 && <ReviewOrderStep3 draft={draft} onBack={() => moveStep(2)} onEditWater={() => moveStep(1)} onEditDetails={() => moveStep(2)} onPreview={previewRequest} />}
        </>}
        {page === 'orders' && <MyOrders demoOrder={demoOrder} onBack={goHome} onNewOrder={startOrder} />}
      </main>
    </div>
  );
}
