
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

import NavBarCustomer from './Component_Customer/navBarCustomer.jsx';
import ModelImg from '../assets/model.png';

import './customerWeb.css';

function CustomerWeb() {
  return (
    <div>
      <NavBarCustomer />

      <main className="container-fluid px-3 pt-4">

        {/* Hero Banner */}
        <div className="heroBanner">
          <div className="row g-0 align-items-center h-100">

            {/* Left side — 7/12 width */}
            <div className="col-7">
              <div className="heroText">
                <p className="heroLabel">
                  FRESH • CLEAN • RELIABLE
                </p>

                <h1>
                  Fresh water, right at your doorstep.
                </h1>

                <button className="btn heroBTN">
                  Order Now →
                </button>
              </div>
            </div>

            {/* Right side — 5/12 width */}
            <div className="col-5 h-100 position-relative">
              <img
                src={ModelImg}
                alt="AquaBest Model"
                className="heroModel"
              />
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

export default CustomerWeb;
