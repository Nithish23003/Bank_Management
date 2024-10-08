import React, { useState } from 'react';
import axios from 'axios';


function AdminSignInForm({ onUserSignIn, onAdminAuthenticated }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  // Firebase REST API for sign-in (replace YOUR_FIREBASE_WEB_API_KEY with your actual key)
  const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDrhfeFRYEE00qghB6W8ysfSu4cY-lrktI`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send a request to Firebase Authentication REST API for sign-in
      const response = await axios.post(firebaseAuthUrl, {
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true, // Ensures you get an ID token back
      });

      // If the login is successful, proceed
      if (response.data.idToken) {
        localStorage.setItem('isAdminLoggedIn', 'true');
        alert('Admin authenticated successfully!');
        onAdminAuthenticated();
      }
    } catch (error) {
      console.error('Error during admin authentication:', error);
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="container">
      <h1>TFC Bank Admin Sign In</h1>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            name="adminEmail"
            placeholder="Admin Email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <i className="fas fa-lock"></i>
          <input
            type="password"
            name="adminPassword"
            placeholder="Admin Password"
            required
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className="btn">Sign In</button>
      </form>
      <p style={{color:'black'}}>Not an admin? </p><button onClick={onUserSignIn}>User Sign In</button>
    </div>
  );
}

export default AdminSignInForm;
