import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { FaUser, FaShoppingCart, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import ProfileModal from './ProfileModal';
import CartModal from './CartModal';
import './Navbar.css';

// 🔑 App.js se onLogout aur role props receive kar rahe hain
const Navbar = ({ onLogout, role }) => {
  const { firmProfile, loading } = useContext(FirmProfileContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // 🚪 Logout Confirmation Handler
  const handleLogoutClick = () => {
    if (role && role.toLowerCase() !== 'guest') {
      const confirmLogout = window.confirm("Are You sure ? You want to Logout from this login");
      if (!confirmLogout) {
        return; // User clicked Cancel -> Stay in current session
      }
    }
    setIsOpen(false);
    onLogout();
  };

  return (
    <nav className="navbar">
      {/* Logo Section */}
      <div className="nav-logo">
        {/* <h2>Tiya Jewellers</h2> */}
        <h2>{loading ? "Loading..." : firmProfile.firm_name}</h2>
      </div>

      {/* Navigation Links */}
      <ul className={isOpen ? "nav-links open" : "nav-links"}>
        <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
        
        <li><Link to="/collection" onClick={() => setIsOpen(false)}>Store</Link></li>

        {/* --- Accounts Dropdown --- */}
        {/* 🛡️ ROLE FILTER: Accounts dropdown sirf Admin aur Manager ko dikhega */}
        {(role === 'Admin' || role === 'Manager') && (
          <li className="tx-dropdown">
            <span className="tx-dropdown-toggle">
              Accounts <span className="arrow-down">▼</span>
            </span>
            <ul className="tx-dropdown-menu">
              <li><Link to="/Customers" onClick={() => setIsOpen(false)}>Customers</Link></li>
              <li><Link to="/receipt-register" onClick={() => setIsOpen(false)}>Receipt Register</Link></li>
              
            </ul>
          </li>
        )}

        {/* --- Stocks Dropdown --- */}
        {/* 🛡️ ROLE FILTER: Accounts dropdown sirf Admin aur Manager ko dikhega */}
        {(role === 'Admin' || role === 'Manager') && (
          <li className="tx-dropdown">
            <span className="tx-dropdown-toggle">
              Stocks <span className="arrow-down">▼</span>
            </span>
            <ul className="tx-dropdown-menu">
              <li><Link to="/StockIn" onClick={() => setIsOpen(false)}>StockIn</Link></li>
              <li><Link to="/admin/enquiries" onClick={() => setIsOpen(false)}>Sales Order</Link></li>
              <li><Link to="/sales-register" onClick={() => setIsOpen(false)}>Sales Register</Link></li>                                     
              <li><Link to="/stock-register" onClick={() => setIsOpen(false)}>Stock Register</Link></li>
              
              {/* 🛡️ ROLE FILTER: Item Master sirf Admin ko dikhega, Manager ko nahi */}
              {role === 'Admin' && (
                <li><Link to="/master-settings" onClick={() => setIsOpen(false)}>Item Master</Link></li>
              )}
            </ul>
          </li>
        )}

        {/* --- Transaction Dropdown --- */}
        {/* 🛡️ ROLE FILTER: Accounts dropdown sirf Admin aur Manager ko dikhega */}
        {(role === 'Admin' || role === 'Manager') && (
          <li className="tx-dropdown">
            <span className="tx-dropdown-toggle">
              Transaction <span className="arrow-down">▼</span>
            </span>
            <ul className="tx-dropdown-menu">
              <li><Link to="/sales" onClick={() => setIsOpen(false)}>Sales Voucher</Link></li>            
              <li><Link to="/receipt-voucher" onClick={() => setIsOpen(false)}>Receipt</Link></li>
              <li><Link to="/adjust-sp" onClick={() => setIsOpen(false)}>Adjust SP</Link></li>
            </ul>
          </li>
        )}

        <li><Link to="/about" onClick={() => setIsOpen(false)}>About Us</Link></li>
        
        {/* Mobile View User Actions (Profile, Cart, Logout) */}
        <li className="nav-icon-mobile">
          <div className="mobile-user-actions">
            <button 
              type="button" 
              className="mobile-action-btn" 
              title="My Profile" 
              aria-label="My Profile"
              onClick={() => { setIsOpen(false); setIsProfileModalOpen(true); }}
            >
              <FaUser /> <span>Profile</span>
            </button>
            <button 
              type="button" 
              className="mobile-action-btn" 
              title="Cart" 
              aria-label="Cart"
              onClick={() => { setIsOpen(false); setIsCartModalOpen(true); }}
            >
              <FaShoppingCart /> <span>Cart</span>
            </button>
            <button 
              type="button" 
              className="mobile-action-btn mobile-logout-btn" 
              title="Logout" 
              aria-label="Logout"
              onClick={handleLogoutClick}
            >
              <FaSignOutAlt /> <span>Logout</span>
            </button>
          </div>
        </li>
      </ul>

      {/* Right Side Icons */}
      <div className="nav-icons">
        {/* User Role text badge taaki pata chale kaun logged in hai */}
        <span className="user-badge" style={{ marginRight: '10px', fontSize: '14px', color: '#d4af37', fontWeight: 'bold' }}>
          [{role}]
        </span>
        
        <Link 
          to="#" 
          className="icon-link" 
          title="My Profile" 
          aria-label="My Profile"
          onClick={(e) => { e.preventDefault(); setIsProfileModalOpen(true); }}
        >
          <FaUser />
        </Link>
        <Link 
          to="#" 
          className="icon-link" 
          title="Cart" 
          aria-label="Cart"
          onClick={(e) => { e.preventDefault(); setIsCartModalOpen(true); }}
        >
          <FaShoppingCart />
        </Link>
        
        {/* 🚪 Desktop Logout Button Icon */}
        <span 
          onClick={handleLogoutClick} 
          className="icon-link logout-btn-icon" 
          title="Logout" 
          aria-label="Logout"
          style={{ cursor: 'pointer', color: '#ff4d4d', marginLeft: '20px' }}
        >
          <FaSignOutAlt />
        </span>
        
        {/* Hamburger Menu */}
        <div className="menu-toggle" onClick={toggleMenu}>
          {isOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <CartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
