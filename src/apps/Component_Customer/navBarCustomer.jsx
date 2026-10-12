import { useState } from 'react';
import { RxHamburgerMenu, RxCross2 } from 'react-icons/rx';
import { FiShoppingCart } from 'react-icons/fi';
import logo from '../../assets/AquaBest logo.png';

export default function NavBarCustomer({ cartCount, onCartClick }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="customer-header">
      <nav className="navbar container-fluid px-3 px-md-4">
        <a href="#home" className="navbar-brand m-0" aria-label="AquaBest home">
          <img src={logo} alt="AquaBest" className="customer-logo" />
        </a>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="icon-button cart-trigger" onClick={onCartClick} aria-label={`Open cart with ${cartCount} items`}>
            <FiShoppingCart size={21} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
          <button type="button" className="icon-button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls="customer-menu" aria-label={isOpen ? 'Close menu' : 'Open menu'}>
            {isOpen ? <RxCross2 size={22} /> : <RxHamburgerMenu size={22} />}
          </button>
        </div>
      </nav>
      {isOpen && (
        <div id="customer-menu" className="customer-menu container-fluid px-3 px-md-4">
          <a href="#products" onClick={() => setIsOpen(false)}>Order Now</a>
          <a href="#cart" onClick={(event) => { event.preventDefault(); setIsOpen(false); onCartClick(); }}>My Cart</a>
          <span className="menu-disabled" title="Available after customer accounts are connected">My Orders (coming soon)</span>
          <a href="tel:09994544981">Call AquaBest</a>
        </div>
      )}
    </header>
  );
}
