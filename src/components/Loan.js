import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Loan.css';

function Loan({ customerId }) {
  const [userData, setUserData] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState('');
  const [loanOptions, setLoanOptions] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [message, setMessage] = useState('');
  const [loanDetails, setLoanDetails] = useState([]);
  const [areOptionsVisible, setOptionsVisible] = useState(true);
  const [showLoans, setShowLoans] = useState(false); // Toggle for My Loans button
  const [amountError, setAmountError] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}`);
        setUserData(response.data.fields);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [customerId]);

  // Fetch loan details from LoanCustomers collection (approved loans)
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        const response = await axios.get(`https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/LoanCustomers/${customerId}`);
        const loansArray = response.data.fields.loans.arrayValue.values || [];
        setLoanDetails(loansArray);
      } catch (error) {
        setLoanDetails([]);
        console.error('Error fetching loan details:', error);
      }
    };
    fetchLoanDetails();
  }, [customerId]);

  const calculateLoanOptions = () => {
    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) return;

    const options = [
      { months: 6, interestRate: 11 },
      { months: 12, interestRate: 14 },
      { months: 18, interestRate: 18 },
      { months: 24, interestRate: 26 },
    ].map(({ months, interestRate }) => {
      const totalAmount = amount + (amount * (interestRate / 100));
      const monthlyPayment = totalAmount / months;
      return { months, interestRate, totalAmount, monthlyPayment };
    });

    setLoanOptions(options);
  };

  const applyForLoan = async () => {
    if (selectedLoan && loanType) {
      try {
        const loanDetails = {
          customerId,
          firstName: userData.firstName.stringValue,
          lastName: userData.lastName.stringValue,
          accountNumber: userData.accountNumber.stringValue,
          loanAmount: loanAmount,
          loanType: loanType,
          months: selectedLoan.months,
          interestRate: selectedLoan.interestRate,
          totalAmount: selectedLoan.totalAmount,
          monthlyPayment: selectedLoan.monthlyPayment,
        };

        const response = await axios.post(`https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/LoanApproval`, {
          fields: {
            customerId: { stringValue: loanDetails.customerId },
            firstName: { stringValue: loanDetails.firstName },
            lastName: { stringValue: loanDetails.lastName },
            accountNumber: { stringValue: loanDetails.accountNumber },
            loanAmount: { integerValue: loanDetails.loanAmount },
            loanType: { stringValue: loanDetails.loanType },
            months: { integerValue: loanDetails.months },
            interestRate: { integerValue: loanDetails.interestRate },
            totalAmount: { doubleValue: loanDetails.totalAmount },
            monthlyPayment: { doubleValue: loanDetails.monthlyPayment },
          }
        });

        console.log('Loan application response:', response.data);
        setMessage('Loan application submitted successfully! Waiting for admin approval.');
      } catch (error) {
        console.error('Error applying for loan:', error);
        setMessage('Failed to submit loan application.');
      }
    } else {
      setMessage('Please select a loan type and amount.');
    }
  };

  const toggleRepaymentOptions = () => {
    setOptionsVisible(!areOptionsVisible);
  };

  const handleLoanAmountChange = (e) => {
    if (loanType) {
      setLoanAmount(e.target.value);
      setAmountError(''); // Clear error if loan type is selected
    } else {
      setAmountError('Please select a loan type first.');
    }
  };

  const handleShowLoans = () => {
    setShowLoans(!showLoans); // Toggle showing loans
  };

  if (!userData) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="loan-page">
      <h2>User Details</h2>
      <p><strong>Name:</strong> {userData.firstName.stringValue} {userData.lastName.stringValue}</p>
      <p><strong>Account Number:</strong> {userData.accountNumber.stringValue}</p>

      <div className="apply-loan">
        <h3>Apply for a Loan</h3>

        <label htmlFor="loanType">Select Loan Type:</label>
        <select id="loanType" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
          <option value="">Select Loan Type</option>
          <option value="Home Loan">Home Loan</option>
          <option value="Gold Loan">Gold Loan</option>
          <option value="Educational Loan">Educational Loan</option>
          <option value="Personal Loan">Personal Loan</option>
          <option value="Vehicle Loan">Vehicle Loan</option>
        </select>

        <label htmlFor="loanAmount">Enter Loan Amount:</label>
        <input
          type="number"
          id="loanAmount"
          placeholder="Enter loan amount"
          value={loanAmount}
          onChange={handleLoanAmountChange}
          disabled={!loanType} // Disable if no loan type is selected
        />
        {amountError && <p style={{ color: 'red' }}>{amountError}</p>}

        <div className="option">
          <button onClick={calculateLoanOptions}>Calculate Options</button>
        </div>

        {loanOptions.length > 0 && (
          <div>
            <br></br>
            <h4>Repayment Options</h4>
            {areOptionsVisible ? (
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>Months</th>
                      <th>Interest Rate (%)</th>
                      <th>Total Amount</th>
                      <th>Monthly Payment</th>
                      <th>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanOptions.map((option, index) => (
                      <tr key={index}>
                        <td>{option.months}</td>
                        <td>{option.interestRate}</td>
                        <td>₹{option.totalAmount.toFixed(2)}</td>
                        <td>₹{option.monthlyPayment.toFixed(2)}</td>
                        <td>
                          <input
                            type="radio"
                            name="loanOption"
                            onChange={() => setSelectedLoan(option)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="loan-buttons-container">
                  <button className="loan-button apply-loan" onClick={applyForLoan}>
                    Apply for this Loan
                  </button>
                  <button className="loan-button hide-loan" onClick={toggleRepaymentOptions}>
                    Hide Options
                  </button>
                </div>
              </div>
            ) : (
              <button className="loan-button show-loan" onClick={toggleRepaymentOptions}>
                Show Options
              </button>
            )}
          </div>
        )}
      </div>
      
      <button className="my-loans-button" onClick={handleShowLoans}>
        {showLoans ? 'Hide My Loans' : 'My Loans'}
      </button>

      {showLoans && loanDetails.length > 0 && (
        <div className="loan-list">
          <h3>Approved Loans</h3>
          <div className="loan-grid"> {/* Create a grid or card layout */}
            {loanDetails.map((loan, index) => (
              <div key={index} className="loan-card"> {/* Each loan in a card */}
                <h4>Loan {index + 1}</h4>
                <p><strong>Loan Type:</strong> {loan.mapValue.fields.loanType.stringValue}</p>
                <p><strong>Loan Amount:</strong> ₹{loan.mapValue.fields.loanAmount.integerValue}</p>
                <p><strong>Months:</strong> {loan.mapValue.fields.months.integerValue}</p>
                <p><strong>Interest Rate:</strong> {loan.mapValue.fields.interestRate.integerValue}%</p>
                <p><strong>Monthly Payment:</strong> ₹{loan.mapValue.fields.monthlyPayment.doubleValue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default Loan;