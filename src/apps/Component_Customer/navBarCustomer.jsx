import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';
import logoAquabest from '../../assets/Aquabest logo.png';
import { RxHamburgerMenu } from 'react-icons/rx';

function NavBarCustomer() {
  return (
    <nav
      className="navbar bg-white w-100"
      style={{
        height: '78px',
        borderBottom: '1px solid #D9E2EC'
      }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center px-3">

        {/* AquaBest Logo */}
        <img
          src={logoAquabest}
          alt="AquaBest Logo"
          height="38"
          className="object-fit-contain"
        />

        {/* Hamburger Menu */}
        <button
          type="button"
          className="btn border-0 bg-transparent shadow-none d-flex align-items-center justify-content-center p-0"
          style={{
            width: '40px',
            height: '40px'
          }}
          aria-label="Open menu"
        >
          <RxHamburgerMenu size={20} color="#10346A" />
        </button>

      </div>
    </nav>
  );
}

export default NavBarCustomer;
