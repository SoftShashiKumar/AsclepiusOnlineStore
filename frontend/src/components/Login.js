import React, { useState, useContext } from 'react';
import { baseURL } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import axios from 'axios';
import './Login.css';

function Login({ onLoginSuccess }) {
  // 1. Context wale loading ka naam 'profileLoading' rakha taaki clash na ho
  const { firmProfile, loading: profileLoading } = useContext(FirmProfileContext);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  // 2. Isko wapas UNCOMMENT kar diya login form ke liye
  const [loading, setLoading] = useState(false);

  // 🔐 WhatsApp OTP Modal Control States
  const [showOtpModal, setShowOtpModal] = useState(false);

  // 1️⃣ Step A: Username + Password Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post(`${baseURL}/api/login/`, {
        username: username,
        password: password
      });

      if (response.data.require_otp) {
        setShowOtpModal(true); // WhatsApp OTP Popup Modal Open Karein
      } else {
        completeLoginProcess(response.data);
      }

    } catch (err) {
      console.error("Login Error:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Login nahi ho pa raha hai! Credentials check karein.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Step B: WhatsApp OTP Verification Handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${baseURL}/api/verify-otp/`, {
        username: username,
        otp: otp
      });

      if (response.data.success) {
        setShowOtpModal(false);
        completeLoginProcess(response.data); // Pure backend response se token + role save karo
      }

    } catch (err) {
      console.error("OTP Verification Error:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Invalid OTP! Kripya sahi code enter karein.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Helper Function: Save Data to sessionStorage & Trigger Dashboard
  const completeLoginProcess = (data) => {
    const access = data.access || '';
    const refresh = data.refresh || '';
    const role = data.role || 'Admin';
    const user = data.username || username;

    sessionStorage.setItem('accessToken', access);
    sessionStorage.setItem('refreshToken', refresh);
    sessionStorage.setItem('userRole', role);
    sessionStorage.setItem('username', user);

    // 🟢 NAYI LINE: Successful admin login ke baad manual logout flag hata dein
    sessionStorage.removeItem('manual_logout');

    if (onLoginSuccess) {
      onLoginSuccess(role);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Nayi Line: Yahan 'profileLoading' use kiya */}
        <h2>{profileLoading ? "Loading..." : `${firmProfile.firm_name} Login`}</h2>
        {error && <div className="login-error">{error}</div>}

        {/* Main Password Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-btn btn-submit-theme" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        {/* Guest / Customer Direct Option */}
        <button 
          type="button" 
          onClick={() => {
            sessionStorage.setItem('userRole', 'Guest');
            sessionStorage.setItem('username', 'Customer');
            onLoginSuccess('Guest');
          }} 
          className="login-btn btn-guest-theme"
          disabled={loading}
        >
          Explore as Guest / Customer (No Password) 🔓
        </button>
      </div>

      {/* 🔐 WhatsApp OTP Verification Popup Modal */}
      {showOtpModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-box">
            <h3>📱 Security OTP</h3>
            <p className="otp-subtitle">
              A 6-digit OTP code has been sent to your registered Emial ID.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="Enter 6-Digit OTP" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="otp-input"
                  required 
                  autoFocus
                />
              </div>

              <button type="submit" className="login-btn btn-submit-theme" disabled={loading}>
                {loading ? 'Verifying OTP...' : 'Verify & Complete Login'}
              </button>
            </form>

            <button 
              type="button" 
              className="otp-cancel-btn"
              onClick={() => {
                setShowOtpModal(false);
                setOtp('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;