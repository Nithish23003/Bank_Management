import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';

function Profile({ customerId }) {
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    aadharCard: '',
    panCard: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const customerUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}`;
        const response = await axios.get(customerUrl);

        if (response.status === 200) {
          const data = response.data.fields;
          setProfileData(data);
          setFormData({
            firstName: data.firstName.stringValue,
            lastName: data.lastName.stringValue,
            email: data.email.stringValue,
            address: data.address.stringValue,
            phoneNumber: data.phoneNumber.stringValue,
            dateOfBirth: data.dateOfBirth.stringValue,
            aadharCard: data.aadharCard.stringValue,
            panCard: data.panCard.stringValue,
          });
        } else {
          setError(`Failed to load profile data for Customer ID: ${customerId}`);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setError('Failed to load profile data. Please check the Customer ID.');
      }
    };
    fetchProfile();
  }, [customerId]);

  const validateFields = () => {
    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /@gmail\.com$/;
    const panCardRegex = /^[A-Za-z0-9]{10}$/;
    const aadharRegex = /^[0-9]{12}$/;

    const { firstName, lastName, email, phoneNumber, dateOfBirth, aadharCard, panCard } = formData;

    // Check if all fields are filled
    if (!firstName || !lastName || !email || !phoneNumber || !dateOfBirth || !aadharCard || !panCard) {
      setValidationError('All fields are required.');
      return false;
    }

    // Name validation
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      setValidationError('First Name and Last Name should contain only letters and spaces.');
      return false;
    }

    // Phone number validation
    if (!phoneRegex.test(phoneNumber)) {
      setValidationError('Phone Number should be 10 digits.');
      return false;
    }

    // Email validation
    if (!emailRegex.test(email)) {
      setValidationError('Email should contain "@gmail.com".');
      return false;
    }

    // PAN card validation
    if (!panCardRegex.test(panCard)) {
      setValidationError('PAN Card should be 10 alphanumeric characters.');
      return false;
    }

    // Aadhar card validation
    if (!aadharRegex.test(aadharCard)) {
      setValidationError('Aadhar Card should be 12 digits.');
      return false;
    }

    // Date of Birth validation (user must be at least 18 years old)
    const today = new Date();
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      setValidationError('You must be at least 18 years old.');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    try {
      const customerUrl = `https://firestore.googleapis.com/v1/projects/bankmanagementsystem-d46f6/databases/(default)/documents/Customers/${customerId}?updateMask.fieldPaths=firstName&updateMask.fieldPaths=lastName&updateMask.fieldPaths=email&updateMask.fieldPaths=address&updateMask.fieldPaths=phoneNumber&updateMask.fieldPaths=dateOfBirth&updateMask.fieldPaths=aadharCard&updateMask.fieldPaths=panCard`;

      const updatedData = {
        fields: {
          firstName: { stringValue: formData.firstName },
          lastName: { stringValue: formData.lastName },
          email: { stringValue: formData.email },
          address: { stringValue: formData.address },
          phoneNumber: { stringValue: formData.phoneNumber },
          dateOfBirth: { stringValue: formData.dateOfBirth },
          aadharCard: { stringValue: formData.aadharCard },
          panCard: { stringValue: formData.panCard },
        }
      };

      await axios.patch(customerUrl, updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile data:', error);
      setError('Failed to update profile data. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (error) {
    return <div>{error}</div>;
  }

  if (!profileData) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Your Profile</h2>
        {validationError && <p className="error-message">{validationError}</p>}
        <p>
          <strong>First Name:</strong> 
          {isEditing ? (
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
          ) : (
            <span>{formData.firstName}</span>
          )}
        </p>
        <p>
          <strong>Last Name:</strong> 
          {isEditing ? (
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
          ) : (
            <span>{formData.lastName}</span>
          )}
        </p>
        <p>
          <strong>Email:</strong> 
          {isEditing ? (
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          ) : (
            <span>{formData.email}</span>
          )}
        </p>
        <p>
          <strong>Address:</strong> 
          {isEditing ? (
            <input type="text" name="address" value={formData.address} onChange={handleChange} />
          ) : (
            <span>{formData.address}</span>
          )}
        </p>
        <p>
          <strong>Phone Number:</strong> 
          {isEditing ? (
            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
          ) : (
            <span>{formData.phoneNumber}</span>
          )}
        </p>
        <p>
          <strong>Date of Birth:</strong> 
          {isEditing ? (
            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
          ) : (
            <span>{formData.dateOfBirth}</span>
          )}
        </p>
        <p>
          <strong>Aadhar Card:</strong> 
          {isEditing ? (
            <input type="text" name="aadharCard" value={formData.aadharCard} onChange={handleChange} />
          ) : (
            <span>{formData.aadharCard}</span>
          )}
        </p>
        <p>
          <strong>PAN Card:</strong> 
          {isEditing ? (
            <input type="text" name="panCard" value={formData.panCard} onChange={handleChange} />
          ) : (
            <span>{formData.panCard}</span>
          )}
        </p>

        {!isEditing ? (
          <button onClick={handleEdit} className="edit-btn">Edit Profile</button>
        ) : (
          <button onClick={handleSave} className="save-btn">Save</button>
        )}
      </div>
    </div>
  );
}

export default Profile;
