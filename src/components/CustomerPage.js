import React, { useState } from 'react';
import Home from './Home';
import Transaction from './Transaction';
import Loan from './Loan';
import Profile from './Profile';
import './CustomerPage.css';

function CustomerPage({ onLogout, customerId }) {
  const [activePage, setActivePage] = useState('home');

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home customerId={customerId} />;;
      case 'transaction':
        return <Transaction />;
      case 'loan':
        return <Loan customerId={customerId} />;
      case 'profile':
        return <Profile customerId={customerId} />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="customer-page">
      <nav className="nav-bar">
        <button onClick={() => setActivePage('home')}>Home</button>
        <button onClick={() => setActivePage('transaction')}>Transactions</button>
        <button onClick={() => setActivePage('loan')}>Loan</button>
        <button onClick={() => setActivePage('profile')}>Profile</button>
        <button onClick={onLogout}>Logout</button>
      </nav>
      <div className="page-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default CustomerPage;
