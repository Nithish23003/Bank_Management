import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Home.css';

function Home({ customerId }) {
    const [customerName, setCustomerName] = useState('');
    const [accountDetailsVisible, setAccountDetailsVisible] = useState(false); // State to toggle visibility
    const [accountDetails, setAccountDetails] = useState({
      accountType: '',
      accountNumber: '',
      ifscCode: '',
      balance: ''
    });

  // Fetch customer name on component load
  useEffect(() => {
    const fetchCustomerName = async () => {
      try {
        const response = await axios.get(`https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}`);
        const customerData = response.data.fields;
        const name = `${customerData.firstName.stringValue} ${customerData.lastName.stringValue}`;
        setCustomerName(name);
      } catch (error) {
        console.error('Error fetching customer name:', error);
      }
    };
    fetchCustomerName();
  }, [customerId]);

  // Fetch account details when "View Your Account" is clicked
  const toggleAccountDetails = async () => {
    if (!accountDetailsVisible) {
      // Fetch account details only when opening
      try {
        const response = await axios.get(`https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}`);
        const customerData = response.data.fields;
        const details = {
          accountType: customerData.accountType.stringValue,
          accountNumber: customerData.accountNumber.stringValue,
          ifscCode: customerData.ifscCode.stringValue,
          balance: customerData.balance.integerValue
        };
        setAccountDetails(details);
      } catch (error) {
        console.error('Error fetching account details:', error);
      }
    }
    setAccountDetailsVisible(!accountDetailsVisible); // Toggle visibility
  };

  return (
    <div className="home-page">
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      
      <h2>Welcome back, <span>{customerName}</span>!</h2>
      <p>Here is an overview of your account and recent activity.</p>

      {/* Bank Description */}
      <div className="bank-description">
        <h3>About <span>TFC Bank</span></h3>
        <p>
          At TFC Bank, we offer secure and reliable banking services tailored to your needs. 
          Our services include a wide range of personal and business banking solutions, 
          from savings and current accounts to easy loan approvals and competitive interest rates.
        </p>
        <p>
          With our user-friendly digital platform, you can easily manage your finances, 
          check transactions, apply for loans, and much more—all from the comfort of your home. 
          Experience the convenience and security of banking with TFC Bank today!
        </p>

        <h4>Key Features of TFC Bank:</h4><br></br>
        <ul>
          <li>24/7 Account Access and Management</li>
          <li>Fast and Secure Online Banking</li>
          <li>Quick Loan Approvals and Competitive Rates</li>
          <li>Instant Notifications for Transactions</li>
          <li>Highly Secured with Advanced Encryption</li>
        </ul>
      </div>

      {/* View Account Button */}
      <button className="view-account-btn" onClick={toggleAccountDetails}>
        {accountDetailsVisible ? 'Hide Account Details' : 'View your Account'}
      </button>

      {/* Account Details */}
      {accountDetailsVisible && (
        <div className="account-details">
          <h4>Account Information</h4>
          <p><strong>Account Type:</strong> {accountDetails.accountType}</p>
          <p><strong>Account Number:</strong> {accountDetails.accountNumber}</p>
          <p><strong>IFSC Code:</strong> {accountDetails.ifscCode}</p>
          <p><strong>Balance:</strong> ₹{accountDetails.balance}</p>
        </div>
      )}
    </div>
  );
}

export default Home;
