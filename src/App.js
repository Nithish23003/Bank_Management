import React, { useState, useEffect } from 'react';
import SignUpForm from './components/SignUpForm';
import SignInForm from './components/SignInForm';
import AdminSignInForm from './components/AdminSignInForm';
import AdminPage from './components/AdminPage'; // Import your AdminPage component
import CustomerPage from './components/CustomerPage'; // Import CustomerPage component
import './style.css';


function App() {
  const [view, setView] = useState('signIn');
  const [customerId, setCustomerId] = useState('');  // New state for customerId

  useEffect(() => {
    const savedCustomerId = localStorage.getItem('customerId'); // Get customerId from local storage
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
      setView('customerPage'); // Redirect to Customer Page if already logged in
    }

    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (isAdminLoggedIn) {
      setView('adminPage');
    }
  }, []);

  const switchToSignUp = () => setView('signUp');
  const switchToSignIn = () => setView('signIn');
  const switchToAdminSignIn = () => setView('adminSignIn');
  const switchToAdminPage = () => setView('adminPage');
  const switchToCustomerPage = (customerId) => {
    setCustomerId(customerId);  // Store the customerId
    localStorage.setItem('customerId', customerId);
    setView('customerPage');
  };
  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('customerId');
    setView('signIn');
  };

  return (
    <div className={view !== 'customerPage' ? 'default-background' : ''}>
      {view === 'signIn' && (
        <SignInForm 
          onSignUp={switchToSignUp} 
          onAdminSignIn={switchToAdminSignIn} 
          onCustomerAuthenticated={switchToCustomerPage}  // Pass customerId from SignInForm
        />
      )}
      {view === 'signUp' && <SignUpForm onSignIn={switchToSignIn} />}
      {view === 'adminSignIn' && <AdminSignInForm onUserSignIn={switchToSignIn} onAdminAuthenticated={switchToAdminPage} />}
      {view === 'adminPage' && <AdminPage onLogout={handleLogout} />}
      {view === 'customerPage' && <CustomerPage customerId={customerId} onLogout={handleLogout} />} {/* Pass customerId to CustomerPage */}
    </div>
  );
}

export default App;