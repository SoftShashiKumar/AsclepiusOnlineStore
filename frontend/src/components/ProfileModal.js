import React, { useState, useEffect } from 'react';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    asclepiusId: '',
    name: '',
    mobile: '',
    address: ''
  });

  useEffect(() => {
    if (isOpen) {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
        setIsEditing(false); // Start in view mode if it exists
      } else {
        setIsEditing(true); // Edit mode if new
      }
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!profile.name || !profile.mobile) {
      alert("Name aur Mobile number k sath sath sara box bharna zaroori hai!");
      return;
    }
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setIsEditing(false);
    alert('Aapki profile successfully save ho gayi hai!');
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal-content">
        <button className="profile-close-btn" onClick={onClose}>&times;</button>
        <h2 className="profile-heading">My Profile</h2>
        
        <div className="profile-form">
          <div className="profile-input-group">
            <label>Asclepius ID</label>
            <input 
              type="text" 
              name="asclepiusId" 
              value={profile.asclepiusId} 
              onChange={handleChange} 
              disabled={!isEditing} 
              placeholder="e.g. DS123456"
            />
          </div>
          
          <div className="profile-input-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              value={profile.name} 
              onChange={handleChange} 
              disabled={!isEditing}
              placeholder="Full Name"
            />
          </div>
          
          <div className="profile-input-group">
            <label>Mobile Number</label>
            <input 
              type="text" 
              name="mobile" 
              value={profile.mobile} 
              onChange={handleChange} 
              disabled={!isEditing}
              placeholder="Mobile Number"
            />
          </div>
          
          <div className="profile-input-group">
            <label>Address</label>
            <textarea 
              name="address" 
              value={profile.address} 
              onChange={handleChange} 
              disabled={!isEditing}
              rows="3"
              placeholder="Delivery Address"
            />
          </div>
          
          <div className="profile-actions">
            {isEditing ? (
              <button className="btn-save-profile" onClick={handleSave}>Save Profile</button>
            ) : (
              <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>Edit My Profile</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
