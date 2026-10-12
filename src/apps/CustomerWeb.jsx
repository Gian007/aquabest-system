import { useState } from 'react';
import { FiArrowRight, FiChevronRight, FiDroplet, FiMapPin, FiPackage, FiShield, FiTruck, FiX, FiMinus, FiPlus, FiCheck } from 'react-icons/fi';
import NavBarCustomer from './Component_Customer/navBarCustomer.jsx';
import model from '../assets/model.png';
import './customerWeb.css';

const products = [
  { id: 'refill', name: 'Water Refills', description: 'For standard refillable containers', icon: FiDroplet },
  { id: 'bottled', name: 'Bottled Water', description: 'Individual bottles and sizes', icon: FiPackage },
];
const tips = [
  'Keep drinking water within reach throughout your day.',
  'Wash reusable water bottles regularly.',
  'Store drinking water in clean, covered containers.',
];

export default function CustomerWeb() {
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [draftAddress, setDraftAddress] = useState('');

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const changeQuantity = (id, delta) => setCart((current) => {
    const next = Math.max(0, (current[id] || 0) + delta);
    return { ...current, [id]: next };
  });

  return (
    <div id="home" className="customer-site">
      <NavBarCustomer cartCount={totalItems} onCartClick={() => setCartOpen(true)} />

      <main className="customer-main container-fluid px-3 px-md-4">
        <section className="hero-banner" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="hero-eyebrow">FRESH • CLEAN • RELIABLE</p>
            <h1 id="hero-title">Fresh water, right at your doorstep.</h1>
            <a className="btn hero-action" href="#products">Order Now <FiArrowRight aria-hidden="true" /></a>
          </div>
          <img className="hero-model" src={model} alt="AquaBest ambassador holding bottled water" />
        </section>

        <button className="delivery-card" type="button" onClick={() => { setDraftAddress(address); setAddressOpen(true); }}>
          <span className="delivery-icon"><FiMapPin size={22} /></span>
          <span className="delivery-copy">
            <strong>Delivery Address</strong>
            <small>{address || 'Add your delivery address'}</small>
          </span>
          <FiChevronRight size={20} aria-hidden="true" />
        </button>

        <section id="products" className="section-block" aria-labelledby="products-title">
          <h2 id="products-title" className="section-title">Available Products</h2>
          <div className="row g-3">
            {products.map(({ id, name, description, icon: Icon }) => (
              <div className="col-6" key={id}>
                <article className="product-card h-100">
                  <div className="product-illustration"><Icon size={36} strokeWidth={1.7} /></div>
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <button type="button" className="btn add-button" onClick={() => { changeQuantity(id, 1); setCartOpen(true); }}>
                    Add to Cart <FiPlus size={15} />
                  </button>
                </article>
              </div>
            ))}
          </div>
          <p className="section-note">Container sizes, water types, and prices will be confirmed before checkout is enabled.</p>
        </section>

        <section className="bulk-card" aria-labelledby="bulk-title">
          <span className="bulk-icon"><FiPackage size={25} /></span>
          <div>
            <h2 id="bulk-title">Custom & Bulk Orders</h2>
            <p>For events, businesses, and customer-provided bottles or labels.</p>
            <a href="tel:09994544981" className="bulk-link">Call to inquire <FiArrowRight size={15} /></a>
          </div>
        </section>

        <section className="why-section" aria-labelledby="why-title">
          <h2 id="why-title" className="section-title">Why AquaBest?</h2>
          <div className="row g-2">
            {[
              { label: 'Water Treatment', Icon: FiDroplet },
              { label: 'Quality Focus', Icon: FiShield },
              { label: 'Convenient Service', Icon: FiTruck },
            ].map(({ label, Icon }) => (
              <div className="col-4" key={label}>
                <div className="why-item"><span><Icon size={23} /></span><p>{label}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="tips-section" aria-labelledby="tips-title">
          <h2 id="tips-title" className="section-title">Water Tips</h2>
          <div className="tips-track" aria-label="Swipe horizontally for water tips">
            {tips.map((tip, index) => (
              <article className="tip-card" key={tip}><span>TIP {String(index + 1).padStart(2, '0')}</span><p>{tip}</p></article>
            ))}
          </div>
        </section>
      </main>

      {cartOpen && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <section className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-heading" id="cart">
            <div className="dialog-heading"><h2 id="cart-heading">My Cart <small>({totalItems})</small></h2><button type="button" className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close cart"><FiX /></button></div>
            {totalItems === 0 ? (
              <p className="empty-cart">Your cart is empty. Select a product to get started.</p>
            ) : (
              <>
                <p className="cart-notice">Items are saved on this page only. This is not an order yet.</p>
                {products.filter(({ id }) => cart[id] > 0).map(({ id, name }) => (
                  <div className="cart-line" key={id}>
                    <strong>{name}</strong>
                    <div className="quantity-control">
                      <button type="button" onClick={() => changeQuantity(id, -1)} aria-label={`Remove one ${name}`}><FiMinus /></button>
                      <span>{cart[id]}</span>
                      <button type="button" onClick={() => changeQuantity(id, 1)} aria-label={`Add one ${name}`}><FiPlus /></button>
                    </div>
                  </div>
                ))}
                <p className="cart-notice">Size, availability, pricing, and checkout will be added after the owner confirms the product list.</p>
              </>
            )}
            <button type="button" className="btn btn-primary w-100 dialog-done" onClick={() => setCartOpen(false)}>{totalItems ? 'Continue Browsing' : 'Browse Products'}</button>
          </section>
        </div>
      )}

      {addressOpen && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddressOpen(false); }}>
          <form className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="address-heading" onSubmit={(event) => { event.preventDefault(); setAddress(draftAddress.trim()); setAddressOpen(false); }}>
            <div className="dialog-heading"><h2 id="address-heading">Delivery Address</h2><button type="button" className="icon-button" onClick={() => setAddressOpen(false)} aria-label="Close address form"><FiX /></button></div>
            <label className="form-label" htmlFor="address-input">House / unit, street, barangay and landmark</label>
            <textarea id="address-input" className="form-control" rows="3" maxLength="250" required value={draftAddress} onChange={(event) => setDraftAddress(event.target.value)} placeholder="Enter your delivery address" />
            <p className="cart-notice">This is a temporary preview. Address saving to your account comes with phone verification.</p>
            <button className="btn btn-primary w-100 dialog-done" type="submit"><FiCheck className="me-2" />Use this address</button>
          </form>
        </div>
      )}
    </div>
  );
}
