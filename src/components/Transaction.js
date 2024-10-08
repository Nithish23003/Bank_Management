import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Transaction.css';

function Transaction() {
  const [senderDetails, setSenderDetails] = useState(null);
  const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
  const [receiverDetails, setReceiverDetails] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSameBankTransfer, setIsSameBankTransfer] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [isDifferentBankTransfer, setIsDifferentBankTransfer] = useState(false);
  const [receiverIFSC, setReceiverIFSC] = useState('');

  const customersUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers`;
  const transactionHistoryUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/TransactionHistory`;

  // Fetch sender details from local storage
  useEffect(() => {
    const storedUserDetails = JSON.parse(localStorage.getItem('userDetails'));

    if (storedUserDetails) {
      setSenderDetails({
        accountNumber: storedUserDetails.accountNumber,
        balance: storedUserDetails.balance,
        docId: storedUserDetails.customerId,
      });
    } else {
      setError('No user details found in local storage.');
    }
  }, []);

  // Fetch receiver details by account number
  const fetchReceiverDetails = async () => {
    try {
      const response = await axios.get(customersUrl);
      const docs = response.data.documents || [];

      const receiverDoc = docs.find(doc => doc.fields.accountNumber.stringValue === receiverAccountNumber);
      if (receiverDoc) {
        setReceiverDetails({
          name: receiverDoc.fields.firstName.stringValue + ' ' + receiverDoc.fields.lastName.stringValue,
          ifscCode: receiverDoc.fields.ifscCode.stringValue,
          balance: parseInt(receiverDoc.fields.balance.integerValue, 10),
          docId: receiverDoc.name.split('/').pop()
        });
        setError('');
      } else {
        setReceiverDetails(null);
        setError('Receiver not found.');
      }
    } catch (error) {
      console.error('Error fetching receiver details:', error);
      setError('Error fetching receiver details.');
    }
  };

  // Fetch receiver details for different bank transaction from the external Firestore
  const fetchDifferentBankReceiverDetails = async () => {
    const receiverUrl = `https://firestore.googleapis.com/v1/projects/bank-common-db/databases/(default)/documents/common_db/${receiverIFSC}`;
    try {
      const response = await axios.get(receiverUrl);
      const receiverAccountData = response.data.fields[receiverAccountNumber];

      if (receiverAccountData) {
        // Extract the account details
        const accountDetails = receiverAccountData.arrayValue.values[0].mapValue.fields;

        setReceiverDetails({
          accountNumber: receiverAccountNumber,
          balance: parseInt(accountDetails.creditAmount.integerValue, 10),
          ifscCode: receiverIFSC,
        });
        setError('');
      } else {
        setReceiverDetails(null);
        setError('Receiver not found in different bank.');
      }
    } catch (error) {
      console.error('Error fetching receiver details for different bank:', error);
      setError('Error fetching receiver details from another bank.');
    }
  };


  // Fetch transaction history from Firestore
  const fetchTransactionHistory = async () => {
    try {
        const customerId = localStorage.getItem('customerId'); // Fetch the logged-in customerId
  
        if (!customerId) {
            setError('Unable to fetch transaction history: customer not logged in.');
            return;
        }
  
        // Correct URL to fetch the specific transaction history document
        const transactionUrl = `${transactionHistoryUrl}/${customerId}`;
  
        const response = await axios.get(transactionUrl);
  
        // Check if fields exist and access them correctly
        if (response.data.fields) {
            const transaction = {
                receiverName: response.data.fields.receiverName.stringValue,
                receiverAccountNumber: response.data.fields.receiverAccountNumber.stringValue,
                ifscCode: response.data.fields.ifscCode.stringValue,
                amount: response.data.fields.amount.integerValue,
                date: response.data.fields.date.stringValue
            };
  
            setTransactionHistory([transaction]); // Wrap in an array if you want to set it in state as an array
        } else {
            setTransactionHistory([]); // Handle the case where fields don't exist
        }
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        setError('Unable to fetch transaction history.');
    }
};

  const handleShowHistory = () => {
    fetchTransactionHistory();
    setShowHistory(true);
  };

  // Handle the transaction
  const handleSendTransaction = async () => {
    // Basic validation for inputs
    if (!receiverDetails || !amount || amount <= 0) {
      setError('Invalid transaction details.');
      return;
    }

    if (!senderDetails?.accountNumber) {
      setError('Sender account number is missing.');
      return;
    }

    if (senderDetails.accountNumber === receiverAccountNumber) {
      setError('You cannot send money to your own account.');
      return;
    }

    try {
      const senderBalance = senderDetails.balance;

      // Convert amount to integer
      const parsedAmount = parseInt(amount, 10);

      // Check if the sender has sufficient funds
      if (senderBalance < parsedAmount) {
        setError('Insufficient funds.');
        return;
      }

      // Calculate new balances
      const newSenderBalance = senderBalance - parsedAmount;
      const newReceiverBalance = receiverDetails.balance + parsedAmount;

      // Update sender's balance in Firestore
      await axios.patch(
        `${customersUrl}/${senderDetails.docId}?updateMask.fieldPaths=balance`,
        {
          fields: {
            balance: { integerValue: newSenderBalance }
          }
        }
      );

      // Update receiver's balance in Firestore
      await axios.patch(
        `${customersUrl}/${receiverDetails.docId}?updateMask.fieldPaths=balance`,
        {
          fields: {
            balance: { integerValue: newReceiverBalance }
          }
        }
      );

      // Get the current date and time
      const currentDate = new Date().toISOString();

      // Prepare the Firestore document structure with the correct field types
      const transactionData = {
        fields: {
          receiverName: { stringValue: receiverDetails.name },
          receiverAccountNumber: { stringValue: receiverAccountNumber },
          ifscCode: { stringValue: receiverDetails.ifscCode },
          amount: { integerValue: parsedAmount },
          date: { stringValue: currentDate }
        }
      };

      // Use sender's customerId as the document ID in TransactionHistory
      const transactionUrl = `${transactionHistoryUrl}/${senderDetails.docId}`;

      // Save the transaction history in Firestore
      await axios.patch(transactionUrl, transactionData);

      // Update local state for sender's balance
      setSenderDetails(prevDetails => ({
        ...prevDetails,
        balance: newSenderBalance
      }));

      // Clear inputs and reset success message
      setSuccess('Transaction successful!');
      setError('');
      setAmount('');
      setReceiverAccountNumber('');
      setReceiverDetails(null);

      // Fetch updated transaction history
      fetchTransactionHistory();
    } catch (error) {
      console.error('Error completing transaction:', error);
      setError('Transaction failed.');
    }
  };

  const handleDifferentBankTransaction = async () => {
    // Basic validation for inputs
    if (!receiverDetails || !amount || amount <= 0) {
      setError('Invalid transaction details.');
      return;
    }
  
    if (!senderDetails?.accountNumber) {
      setError('Sender account number is missing.');
      return;
    }
  
    if (senderDetails.accountNumber === receiverAccountNumber) {
      setError('You cannot send money to your own account.');
      return;
    }
  
    try {
      const senderBalance = senderDetails.balance;
  
      // Convert amount to integer
      const parsedAmount = parseInt(amount, 10);
  
      // Check if the sender has sufficient funds
      if (senderBalance < parsedAmount) {
        setError('Insufficient funds.');
        return;
      }
  
      // Calculate new balances
      const newSenderBalance = senderBalance - parsedAmount;
      const newReceiverBalance = receiverDetails.balance + parsedAmount;
  
      // Update sender's balance in Firestore
      await axios.patch(
        `${customersUrl}/${senderDetails.docId}?updateMask.fieldPaths=balance`,
        {
          fields: {
            balance: { integerValue: newSenderBalance }
          }
        }
      );
  
      // Update receiver's balance in external Firestore (Different bank)
      const receiverUrl = `https://firestore.googleapis.com/v1/projects/bank-common-db/databases/(default)/documents/common_db/${receiverIFSC}`;
  
      await axios.patch(`${receiverUrl}?updateMask.fieldPaths=${receiverAccountNumber}`, {
        fields: {
          [receiverAccountNumber]: {
            arrayValue: {
              values: [
                {
                  mapValue: {
                    fields: {
                      creditAmount: { integerValue: newReceiverBalance },
                      senderAccountID: { stringValue: senderDetails.accountNumber }
                    }
                  }
                }
              ]
            }
          }
        }
      });
  
      // Update local state for sender's balance
      setSenderDetails(prevDetails => ({
        ...prevDetails,
        balance: newSenderBalance
      }));
  
      // Clear inputs and reset success message
      setSuccess('Transaction to a different bank successful!');
      setError('');
      setAmount('');
      setReceiverAccountNumber('');
      setReceiverDetails(null);
  
    } catch (error) {
      console.error('Error completing different bank transaction:', error);
      setError('Transaction to different bank failed.');
    }
  };



  return (
    <div className="transaction-page">
      <h2>Transaction</h2>

      <div className="transaction-buttons">

        <button onClick={() => setIsSameBankTransfer(true)}>Same Bank Transfer</button>

        <button onClick={() => setIsDifferentBankTransfer(true)}>Different Bank Transfer</button>

      </div>

      {isSameBankTransfer && (
        <>
          <br />
          <label>Receiver's Account Number:</label> 
          <input
            type="text"
            value={receiverAccountNumber}
            onChange={(e) => setReceiverAccountNumber(e.target.value)}
            onBlur={fetchReceiverDetails}
            placeholder="Enter receiver's account number"
          />

          {receiverDetails && (
            <div>
              <p><strong>Name:</strong> {receiverDetails.name}</p>
              <p><strong>IFSC Code:</strong> {receiverDetails.ifscCode}</p>
            </div>
          )}

          {receiverDetails && (
            <>
              <label>Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              <div className="transaction-buttons">
                <button onClick={handleSendTransaction}>Send</button>
                <button onClick={() => setReceiverAccountNumber('')}>Cancel</button>
              </div>
            </>
          )}
        </>
      )}

        {isDifferentBankTransfer && (
        <>
          <br />
          <label>Receiver's IFSC Code:</label>
          <input
            type="text"
            value={receiverIFSC}
            onChange={(e) => setReceiverIFSC(e.target.value)}
            placeholder="Enter receiver's IFSC code"
          />

          <label>Receiver's Account Number:</label>
          <input
            type="text"
            value={receiverAccountNumber}
            onChange={(e) => setReceiverAccountNumber(e.target.value)}
            onBlur={fetchDifferentBankReceiverDetails} // Fetch details when the user stops typing
            placeholder="Enter receiver's account number"
          />

          {receiverDetails && (
            <>
              <label>Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />

              <div className="transaction-buttons">
                <button onClick={handleDifferentBankTransaction}>Send</button>
                <button onClick={() => setReceiverAccountNumber('')}>Cancel</button>
              </div>
            </>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <br />
      <button onClick={handleShowHistory}>
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      {showHistory && (
        <>
          <h3>Transaction History</h3>
          <table>
            <thead>
              <tr>
                <th>Receiver Name</th>
                <th>Receiver Account Number</th>
                <th>IFSC Code</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactionHistory.length > 0 ? (
                transactionHistory.map((transaction, index) => (
                  <tr key={index}>
                    <td>{transaction.receiverName}</td>
                    <td>{transaction.receiverAccountNumber}</td>
                    <td>{transaction.ifscCode}</td>
                    <td>{transaction.amount}</td>
                    <td>{new Date(transaction.date).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default Transaction;
