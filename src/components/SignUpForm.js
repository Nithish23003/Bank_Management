import React, { useState } from 'react';
import axios from 'axios';
//import { colors } from '@mui/material';


function SignUpForm({ onSignIn }) {
  const [isFormVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    password: '',
    aadharCard: '',
    panCard: '',
    accountType: 'Savings Account',
    minimumBalance: '100000', // Default minimum balance
  });

  const [errors, setErrors] = useState({});
  const [aadharCardImage, setAadharCardImage] = useState(null);
  const [panCardImage, setPanCardImage] = useState(null);

  // Firebase REST API URL for Firestore
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/AccountCreation`;
  const storageBucketUrl = `https://firebasestorage.googleapis.com/v0/b/bankmanagementsystem-d46f6.appspot.com/o`;
  const customersUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers`

  // Function to calculate age based on DOB
  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'firstName':
      case 'lastName':
        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(value)) {
          error = `${name === 'firstName' ? 'First' : 'Last'} name should contain only alphabets and spaces.`;
        }
        break;
      case 'phoneNumber':
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(value)) {
          error = 'Phone number should contain exactly 10 digits.';
        }
        break;
      case 'aadharCard':
        const aadharRegex = /^[0-9]{12}$/;
        if (!aadharRegex.test(value)) {
          error = 'Aadhar card number should contain exactly 12 digits.';
        }
        break;
      case 'email':
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(value)) {
          error = 'Email should be a valid @gmail.com address.';
        }
        break;
      case 'dateOfBirth':
        const age = calculateAge(value);
        if (age < 18) {
          error = 'You must be at least 18 years old.';
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      const file = files[0];
      if (name === "aadharCardImage") {
        setAadharCardImage(file);
      } else {
        setPanCardImage(file);
      }
    }
  };

  const generateCustomerId = async () => {
    let newId;
    let isUnique = false;
  
    while (!isUnique) {
      const randomId = Math.floor(1000000 + Math.random() * 9000000); // Generates a random number between 1000000 and 9999999
      newId = `CUS${randomId}`;
  
      try {
        // Check if the generated ID already exists in the Customers collection
        const response = await axios.get(`${customersUrl}/${newId}`);
        
        // If the document is found, it means the ID already exists
        if (!response.data || response.data.documents.length === 0) {
          isUnique = true; // ID is unique, exit loop
        }
      } catch (error) {
        // If the error indicates that the document doesn't exist, it's unique
        if (error.response && error.response.status === 404) {
          isUnique = true; // ID is unique, exit loop
        } else {
          console.error('Error checking existing Customer ID:', error);
        }
      }
    }
  
    return newId; // Return the unique Customer ID
  };
  

  // Function to upload files using REST API and get the file URL
  const uploadFileToFirebaseStorage = async (file, folderName) => {
    const apiUrl = `${storageBucketUrl}?name=${folderName}%2F${file.name}`;

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(apiUrl, file, {
      headers: {
        'Content-Type': file.type, // Set content type of the file
      },
    });

    if (response.status === 200) {
      // Construct download URL of uploaded file
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/bankmanagementsystem-d46f6.appspot.com/o/${folderName}%2F${file.name}?alt=media`;
      return downloadUrl;
    } else {
      throw new Error('Failed to upload file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        formErrors[field] = error;
      }
    });

    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      try {
        const customerId = await generateCustomerId(); // Generate a new Customer ID
        const aadharURL = await uploadFileToFirebaseStorage(aadharCardImage, 'AadharCards');
        const panURL = await uploadFileToFirebaseStorage(panCardImage, 'PANCards');

        const newAccountData = {
          fields: {
            firstName: { stringValue: formData.firstName },
            lastName: { stringValue: formData.lastName },
            address: { stringValue: formData.address },
            phoneNumber: { stringValue: formData.phoneNumber },
            email: { stringValue: formData.email },
            dateOfBirth: { stringValue: formData.dateOfBirth },
            password: { stringValue: formData.password },
            aadharCard: { stringValue: formData.aadharCard },
            panCard: { stringValue: formData.panCard },
            accountType: { stringValue: formData.accountType },
            minimumBalance: { integerValue: formData.minimumBalance },
            aadhar_url: { stringValue: aadharURL },
            pan_url: { stringValue: panURL },
          }
        };

        // Store data in Firestore via REST API
        await axios.post(`${firestoreUrl}?documentId=${customerId}`, newAccountData);

        alert('Sign Up successful! Your account has been submitted for approval.');
        onSignIn(); // Redirect to SignIn page
      } catch (error) {
        console.error('Error creating account:', error);
        alert('There was an error creating your account.');
      }
    } else {
      alert('Please correct the errors in the form.');
    }
  };

  return (
    <div className="container">
      {!isFormVisible ? (
        <div className="welcome-section">
        <h1 className="welcome-title">Welcome to TFC Bank</h1>
        <p className="welcome-description">
          At <strong>TFC Bank</strong>, we are dedicated to providing exceptional financial services 
          tailored to meet your needs. Join us today and experience banking made simple, secure, and rewarding!
        </p>
        
        <div className="why-choose-us">
          <h2><u style={{color:'black'}}>Why choose TFC Bank?</u></h2>
          <ul className="benefits-list">
            <li>Secure online banking services</li>
            <li>Flexible saving and investment options</li>
            <li>24/7 customer support</li>
            <li>Innovative financial solutions for individuals and businesses</li>
          </ul>
        </div>
        
        <button className="create-account-btn" onClick={() => setFormVisible(true)}>
          Create Account
        </button>
      </div>
      ) : (
      <form onSubmit={handleSubmit}>
        <h1>Fill this to Create Account</h1>
        <hr />
        <br />
        <div className="input-group">
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            required
            value={formData.firstName}
            onChange={handleChange}
          />
          {errors.firstName && <p className="error">{errors.firstName}</p>}
        </div>
        <div className="input-group">
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            required
            value={formData.lastName}
            onChange={handleChange}
          />
          {errors.lastName && <p className="error">{errors.lastName}</p>}
        </div>
        <div className="input-group">
          <label>Address</label>
          <input
            type="text"
            name="address"
            placeholder="Address"
            required
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label>Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Phone Number"
            required
            value={formData.phoneNumber}
            onChange={handleChange}
          />
          {errors.phoneNumber && <p className="error">{errors.phoneNumber}</p>}
        </div>
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
        <div className="input-group">
          <label>Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            required
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
          {errors.dateOfBirth && <p className="error">{errors.dateOfBirth}</p>}
        </div>
        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label>Aadhar Card Number</label>
          <input
            type="text"
            name="aadharCard"
            placeholder="Aadhar Card Number"
            required
            value={formData.aadharCard}
            onChange={handleChange}
          />
          {errors.aadharCard && <p className="error">{errors.aadharCard}</p>}
        </div>
        <div className="input-group">
          <label>Upload Aadhar Card Image</label>
          <input
            type="file"
            name="aadharCardImage"
            accept="image/*"
            required
            onChange={handleFileChange}
          />
        </div>
        <div className="input-group">
          <label>PAN Card Number</label>
          <input
            type="text"
            name="panCard"
            placeholder="PAN Card Number"
            required
            value={formData.panCard}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label>Upload PAN Card Image</label>
          <input
            type="file"
            name="panCardImage"
            accept="image/*"
            required
            onChange={handleFileChange}
          />
        </div>
        <div className="input-group">
          <label>Account Type  </label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
          >
            <option value="Savings Account">Savings Account</option>
            <option value="Current Account">Current Account</option>
          </select>
        </div>
        <div className="input-group">
          <label>Minimum Balance</label>
          <input
            type="text"
            name="minimumBalance"
            placeholder="Minimum Balance"
            required
            value={formData.minimumBalance}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Create Account</button>
        <p style={{color:'black'}}>Already Having an account?</p>
        <button onClick={onSignIn}>Sign In</button>
      </form>
      )}
    </div>
  );
}

export default SignUpForm;
