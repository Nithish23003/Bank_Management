import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminPage.css';

function AdminPage({ onLogout }) {
  const [applications, setApplications] = useState([]);
  const [loanApplications, setLoanApplications] = useState([]);
  const [showApplications, setShowApplications] = useState(false);
  const [showLoanApplications, setShowLoanApplications] = useState(false); 

  // New state variables for transaction limit feature
  const [customers, setCustomers] = useState([]); // Store all customers
  const [customerAccountNumber, setCustomerAccountNumber] = useState(''); // Input account number
  const [currentCustomer, setCurrentCustomer] = useState(null); // Store the customer whose account number matches
  const [newTransactionLimit, setNewTransactionLimit] = useState(''); // New transaction limit
  const [showChangeLimit, setShowChangeLimit] = useState(false); // Show transaction limit section

  const accountCreationUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/AccountCreation`;
  const customersUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers`;
  const loanApprovalUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/LoanApproval`;
  const loanCustomersUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/LoanCustomers`;

  // Function to generate a unique account number
  const generateUniqueAccountNumber = async () => {
    const generateAccountNumber = () => {
      return Math.floor(100000000 + Math.random() * 900000000).toString();
    };
  
    const isAccountNumberUnique = async (accountNumber) => {
      const response = await axios.get(customersUrl); // Get all customers
      const existingAccounts = response.data.documents || [];
  
      // Check for existing account numbers
      return existingAccounts.every(doc => getFieldValue(doc.fields.accountNumber) !== accountNumber);
    };
  
    let accountNumber = generateAccountNumber();
  
    // Keep generating until we find a unique account number
    while (!await isAccountNumberUnique(accountNumber)) {
      accountNumber = generateAccountNumber();
    }
  
    return accountNumber;
  };


  // Fetch all applications from AccountCreation collection
  const fetchApplications = useCallback(async () => {
    try {
      const response = await axios.get(accountCreationUrl);
      const docs = response.data.documents || [];
      setApplications(docs);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }, [accountCreationUrl]);


  // Fetch all loan applications from LoanApproval collection
  const fetchLoanApplications = useCallback(async () => {
    try {
      const response = await axios.get(loanApprovalUrl);
      const docs = response.data.documents || [];
      setLoanApplications(docs);
    } catch (error) {
      console.error('Error fetching loan applications:', error);
    }
  }, [loanApprovalUrl]);


  const approveCustomer = async (application, email, password) => {
    try {
      const customerId = application.name.split('/').pop();
      const customerData = application.fields;

      console.log('Approving customer:', customerId); // Log customer approval

      // Generate unique account number
      const accountNumber = await generateUniqueAccountNumber();
      const ifscCode = "TFC2332003";
      const balance =100000;
      const transactionLimit = 500000;

      // Add account number and IFSC code and Balance to customer data
      const updatedCustomerData = {
        ...customerData,
        accountNumber: { stringValue: accountNumber },
        ifscCode: { stringValue: ifscCode },
        balance: {integerValue: balance},
        transactionLimit: {integerValue: transactionLimit}
      };

      // Move customer data to Customers collection
      await axios.post(`${customersUrl}?documentId=${customerId}`, { fields: updatedCustomerData });

      // Delete the application from AccountCreation collection after moving
      const docId = application.name.split('/').pop(); // Extract document ID
      await axios.delete(`${accountCreationUrl}/${docId}`);

      console.log('Sending email to:', email); // Log email sending
      await axios.post('http://localhost:3001/send-email', {
        to: email,
        customerId: customerId,
        password: password,
        accountNumber: accountNumber,
        ifscCode: ifscCode
      });
      alert('Customer approved, and email sent to customer.');
      setApplications(applications.filter(app => app.name !== application.name)); // Update state to remove approved application
    } catch (error) {
      console.error('Error approving customer:', error);
      alert('Failed to approve customer.');
    }
  };

  //Function to Reject Customer
  const rejectCustomer = async (application) => {
    try {
      const docId = application.name.split('/').pop();
      await axios.delete(`${accountCreationUrl}/${docId}`);
      setApplications(applications.filter(app => app.name !== application.name));
      alert('Customer rejected and application deleted.');
    } catch (error) {
      console.error('Error rejecting customer:', error);
      alert('Failed to reject customer.');
    }
  };

    // Function to approve loan
    const approveLoan = async (loanApplication) => {
        try {
            const customerId = loanApplication.fields.customerId.stringValue;
            const loanAmount = parseInt(loanApplication.fields.loanAmount.integerValue, 10); // Parse as integer

            // Fetch the current customer data from the Customers collection
            const customerResponse = await axios.get(`${customersUrl}/${customerId}`);
            const customerData = customerResponse.data.fields;

            // Parse the current balance as an integer
            const currentBalance = parseInt(customerData.balance.integerValue, 10); // Ensure it's an integer

            // Calculate the new balance
            const newBalance = currentBalance + loanAmount; // Sum the values

            // Update the balance field in the customer data
            customerData.balance.integerValue = newBalance; // Set the new balance

            // Prepare loan data to push into the loans array
            const loanData = {
                accountNumber: { stringValue: loanApplication.fields.accountNumber.stringValue },
                customerId: { stringValue: loanApplication.fields.customerId.stringValue },
                firstName: { stringValue: loanApplication.fields.firstName.stringValue },
                lastName: { stringValue: loanApplication.fields.lastName.stringValue },
                loanAmount: { integerValue: loanAmount },
                months: { integerValue: parseInt(loanApplication.fields.months.integerValue, 10) },
                interestRate: { integerValue: parseInt(loanApplication.fields.interestRate.integerValue, 10) },
                totalAmount: { doubleValue: parseFloat(loanApplication.fields.totalAmount.doubleValue) },
                monthlyPayment: { doubleValue: parseFloat(loanApplication.fields.monthlyPayment.doubleValue) },
                loanType: { stringValue: loanApplication.fields.loanType.stringValue }
            };

            // Try to fetch the current loans array from the LoanCustomers collection
            let currentLoans = [];
            try {
                const loanCustomerResponse = await axios.get(`${loanCustomersUrl}/${customerId}`);
                const loanCustomerData = loanCustomerResponse.data.fields;

                // Fetch existing loans if the document exists
                currentLoans = loanCustomerData.loans?.arrayValue?.values || [];
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`Customer with ID ${customerId} does not exist in LoanCustomers collection, creating new record.`);
                } else {
                    throw error; // If it's not a 404 error, rethrow it
                }
            }

            // Add the new loan data to the array
            const updatedLoans = [...currentLoans, { mapValue: { fields: loanData } }]; // Merge new loan with existing ones

            // Patch or create the loans array in Firestore
            await axios.patch(`${loanCustomersUrl}/${customerId}`, {
                fields: {
                    loans: {
                        arrayValue: {
                            values: updatedLoans // Update with the merged loans array
                        }
                    }
                }
            });

            // Update the customer's balance in the Customers collection
            await axios.patch(`${customersUrl}/${customerId}`, { fields: customerData });

            // Delete the loan application from the LoanApproval collection
            const docId = loanApplication.name.split('/').pop();
            await axios.delete(`${loanApprovalUrl}/${docId}`);

            alert('Loan approved successfully and customer balance updated.');
            setLoanApplications(loanApplications.filter(loan => loan.name !== loanApplication.name));
        } catch (error) {
            console.error('Error approving loan:', error);
            alert('Failed to approve loan.');
        }
    };


  // Function to reject loan
  const rejectLoan = async (loanApplication) => {
    try {
      const docId = loanApplication.name.split('/').pop();
      await axios.delete(`${loanApprovalUrl}/${docId}`);
      setLoanApplications(loanApplications.filter(loan => loan.name !== loanApplication.name));
      alert('Loan rejected and application deleted.');
    } catch (error) {
      console.error('Error rejecting loan:', error);
      alert('Failed to reject loan.');
    }
  };

   // Fetch all customers
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(customersUrl);
      setCustomers(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers.');
    }
  };

  // Function to find the customer by account number and display their transaction limit
  const findCustomerByAccountNumber = () => {
    const matchingCustomer = customers.find(customer => {
      const fields = customer.fields || {};
      return fields.accountNumber?.stringValue === customerAccountNumber;
    });

    if (matchingCustomer) {
      setCurrentCustomer(matchingCustomer);
    } else {
      alert('Customer with the provided account number not found.');
      setCurrentCustomer(null);
    }
  };

  // Function to update the transaction limit for the customer
  const updateTransactionLimit = async () => {
    if (!currentCustomer) {
      alert('No customer selected.');
      return;
    }
  
    const customerId = currentCustomer.name.split('/').pop(); // Extract the document ID from Firestore
  
    try {
        // Fetch the current customer data
        const customerResponse = await axios.get(`${customersUrl}/${customerId}`);
        const customerData = customerResponse.data.fields;
    
        // Update the transactionLimit field
        customerData.transactionLimit = { integerValue: parseInt(newTransactionLimit, 10) }; // Update the transaction limit
    
        // Patch the updated customer data back to Firestore
        await axios.patch(`${customersUrl}/${customerId}`, { fields: customerData });
    
        // Update the current customer state with the new transaction limit
        setCurrentCustomer(prevCustomer => ({
          ...prevCustomer,
          fields: {
            ...prevCustomer.fields,
            transactionLimit: { integerValue: parseInt(newTransactionLimit, 10) }
          }
        }));
    
        alert('Transaction limit updated successfully.');
        window.location.reload();
    } catch (error) {
      console.error('Error updating transaction limit:', error);
      alert('Failed to update transaction limit.');
    }
  };

  // Fetch customers when the component is mounted or when showChangeLimit is clicked
  const handleShowChangeLimit = () => {
    setShowChangeLimit(true);
    fetchCustomers();
  };

  useEffect(() => {
    if (showApplications) fetchApplications(); // Fetch customer applications only when needed
  }, [fetchApplications, showApplications]);

  const getFieldValue = (field) => {
    return field ? (field.stringValue || field.integerValue) : ''; // Handle both stringValue and integerValue
  };

  return (
    <div className="admin-page">
      <h1>Welcome to TFC Bank Admin Panel</h1>

      <div className="admin-buttons">
      <button 
          onClick={() => {
            setShowApplications(true);  // Show customer applications
            setShowLoanApplications(false);  // Hide loan applications
            setShowChangeLimit(false);
          }}
        >
          Customer Applications
        </button>
        
        <button 
          onClick={() => {
            fetchLoanApplications(); // Fetch loan applications on click
            setShowLoanApplications(true); // Show loan applications
            setShowApplications(false);
            setShowChangeLimit(false);
          }}
        >
          Loan Approvals
        </button>

        <button onClick={() => alert('Loan rate adjustment feature coming soon!')}>Increase Loan Rate</button>

        <button 
            onClick={() => {
                handleShowChangeLimit();
                setShowChangeLimit(true);
                setShowApplications(false);
                setShowLoanApplications(false);
            }}
        >
        Change Customer Transaction Limit
        </button>
        
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </div>

      {showApplications && (
        <div className="applications-section">
          <h2>Pending Customer Applications</h2>
          {applications.length === 0 ? (
            <p>No applications available.</p>
          ) : (
            <ul>
              {applications.map((application, index) => {
                const fields = application.fields;

                return (
                  <li key={index}>
                    <div className="application-details">
                      <p><strong>Name:</strong> {getFieldValue(fields.firstName)} {getFieldValue(fields.lastName)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Email:</strong> {getFieldValue(fields.email)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Phone Number:</strong> {getFieldValue(fields.phoneNumber)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Account Type:</strong> {getFieldValue(fields.accountType)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Minimum Balance:</strong> ₹{getFieldValue(fields.minimumBalance)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Date of Birth:</strong> {getFieldValue(fields.dateOfBirth)}</p>
                    </div>
                    <div className="application-details">
                      <p><strong>Aadhar Card Number:</strong> {getFieldValue(fields.aadharCard)}</p>
                      {getFieldValue(fields.aadhar_url) && (
                        <img 
                          src={getFieldValue(fields.aadhar_url)} 
                          alt="Aadhar Card" 
                        />
                      )}
                    </div>
                    <div className="application-details">
                      <p><strong>PAN Card Number:</strong> {getFieldValue(fields.panCard)}</p>
                      {getFieldValue(fields.pan_url) && (
                        <img 
                          src={getFieldValue(fields.pan_url)} 
                          alt="PAN Card" 
                        />
                      )}
                    </div>
                    <div className="application-details">
                      <p><strong>Password:</strong> {getFieldValue(fields.password)}</p>
                    </div>
                    <button onClick={() => approveCustomer(application, getFieldValue(fields.email), getFieldValue(fields.password))}>Approve</button>
                    <button onClick={() => rejectCustomer(application)}>Reject</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {showLoanApplications && (
        <div className="loan-applications-section">
            <h2>Pending Loan Applications</h2>
            {loanApplications.length === 0 ? (
            <p>No loan applications available.</p>
            ) : (
            <ul>
                {loanApplications.map((loanApplication, index) => {
                const loanFields = loanApplication.fields;

                return (
                    <li key={index} className="loan-application-item">
                    <div className="loan-application-details">
                        <div className="loan-application-column">
                        <strong>Customer ID:</strong> {getFieldValue(loanFields.customerId)}
                        </div>
                        <div className="loan-application-column">
                        <strong>Name:</strong> {getFieldValue(loanFields.firstName)} {getFieldValue(loanFields.lastName)}
                        </div>
                        <div className="loan-application-column">
                        <strong>Account Number:</strong> {getFieldValue(loanFields.accountNumber)}
                        </div>
                    </div>
                    <div className="loan-application-details">
                        <div className="loan-application-column">
                        <strong>Loan Amount:</strong> ₹{getFieldValue(loanFields.loanAmount)}
                        </div>
                        <div className="loan-application-column">
                        <strong>Months:</strong> {getFieldValue(loanFields.months)}
                        </div>
                        <div className="loan-application-column">
                        <strong>Interest Rate:</strong> {getFieldValue(loanFields.interestRate)}%
                        </div>
                    </div>
                    <div className="loan-application-details">
                        <div className="loan-application-column">
                        <strong>Total Amount:</strong> ₹{loanFields.totalAmount.doubleValue}
                        </div>
                        <div className="loan-application-column">
                        <strong>Monthly Payment:</strong> ₹{loanFields.monthlyPayment.doubleValue}
                        </div>
                        <div className="loan-application-column">
                        <strong>Loan Type:</strong> {getFieldValue(loanFields.loanType)}
                        </div>
                    </div>
                    <div className="loan-application-buttons">
                        <button onClick={() => approveLoan(loanApplication)}>Approve Loan</button>
                        <br></br><br></br>
                        <button onClick={() => rejectLoan(loanApplication)}>Reject Loan</button>
                    </div>
                    </li>
                );
                })}
            </ul>
            )}
        </div>
        )}
        {showChangeLimit && (
        <div className="change-transaction-limit-section">
          <h2>Change Transaction Limit</h2>

          <label>Enter Customer Account Number:</label>
          <input
            type="text"
            value={customerAccountNumber}
            onChange={(e) => setCustomerAccountNumber(e.target.value)}
          />
          <button onClick={findCustomerByAccountNumber}>Find Customer</button>

          {currentCustomer && (
            <>
              <p className="transaction-limit-label">
                Current Transaction Limit: ₹
                <span className="transaction-limit-value">
                    {currentCustomer.fields.transactionLimit?.integerValue || 'Not Set'}
                </span>
              </p>

              <label>Set New Transaction Limit:</label>
              <input
                type="number"
                value={newTransactionLimit}
                onChange={(e) => setNewTransactionLimit(e.target.value)}
              />
              <button onClick={updateTransactionLimit}>Save New Limit</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
