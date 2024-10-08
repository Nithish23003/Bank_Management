import React, { useState } from 'react';
import axios from 'axios';


function SignInForm({ onSignUp, onAdminSignIn, onCustomerAuthenticated }) {
  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const customerUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}`;
        const response = await axios.get(customerUrl);
        const customerData = response.data.fields;

        if (customerData && customerData.password.stringValue === password) {
            alert(`Sign In successful for Customer ID: ${customerId}`);

            // Store user details in local storage
            localStorage.setItem('userDetails', JSON.stringify({
                accountNumber: customerData.accountNumber.stringValue,
                balance: parseInt(customerData.balance.integerValue, 10), // Ensure balance is an integer
                customerId: customerId,  // Use the customerId as the document ID
            }));

            onCustomerAuthenticated(customerId); // Pass customerId on success
        } else {
            setError('Invalid Customer ID or Password');
        }
    } catch (error) {
        setError('Failed to sign in. Please check your credentials.');
        console.error('Error during customer sign-in:', error);
    }
  };

  return (
    <div className="container">
      <h1>Welcome to TFC Bank Sign In</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <i className="fas fa-user"></i>
          <input
            type="text"
            name="customerId"
            placeholder="Customer ID"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
        <div className="input-group">
          <i className="fas fa-lock"></i>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn">Sign In</button>
      </form>
      <p style={{color:'black'}}>Don't have an account?</p>
      <button onClick={onSignUp}>Sign Up</button><br/><br/>
      <button onClick={onAdminSignIn}>Admin Sign In</button>
    </div>
  );
}

export default SignInForm;
