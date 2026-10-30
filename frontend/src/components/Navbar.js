import React, { useState, useEffect } from 'react';
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
  const [returnToCartAfterProfile, setReturnToCartAfterProfile] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // 👤 Get Logged In User's Name
  const getLoggedInDisplayName = () => {
    // 1. Check if logged in with individual username (sessionStorage)
    const storedUsername = sessionStorage.getItem('username');
    const storedDisplayName = sessionStorage.getItem('displayName');
    if (role && role.toLowerCase() !== 'guest') {
      if (storedDisplayName && storedDisplayName.toLowerCase() !== 'customer') {
        return storedDisplayName;
      }
      if (storedUsername && storedUsername.toLowerCase() !== 'customer') {
        return storedUsername;
      }
    }

    // 2. Check customer profile saved in localStorage (ProfileModal)
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.name && parsed.name.trim()) {
          return parsed.name.trim();
        }
      }
    } catch {
      // ignore
    }

    // 3. Fallback to username if valid and not 'Customer'
    if (storedUsername && storedUsername.toLowerCase() !== 'customer') {
      return storedUsername;
    }

    // 4. Default to role or 'Guest'
    return role || 'Guest';
  };

  const [displayName, setDisplayName] = useState(getLoggedInDisplayName);

  useEffect(() => {
    const updateName = () => setDisplayName(getLoggedInDisplayName());
    updateName();
    window.addEventListener('profileUpdated', updateName);
    window.addEventListener('storage', updateName);
    return () => {
      window.removeEventListener('profileUpdated', updateName);
      window.removeEventListener('storage', updateName);
    };
  }, [role]);

  // Sync cart count
  const updateCartCount = () => {
    try {
      const savedCart = localStorage.getItem('userCart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const count = parsed.reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 1), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    const handleOpenCart = () => setIsCartModalOpen(true);
    const handleOpenProfile = (e) => {
      if (e && e.detail && e.detail.returnToCart) {
        setReturnToCartAfterProfile(true);
      }
      setIsProfileModalOpen(true);
    };

    window.addEventListener('openCartModal', handleOpenCart);
    window.addEventListener('openProfileModal', handleOpenProfile);

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('openCartModal', handleOpenCart);
      window.removeEventListener('openProfileModal', handleOpenProfile);
    };
  }, []);

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    if (returnToCartAfterProfile) {
      setReturnToCartAfterProfile(false);
      setIsCartModalOpen(true);
    }
  };

  // 📏 Sticky filter bar ke liye dynamic navbar height set karna
  useEffect(() => {
    const updateNavbarHeight = () => {
      const nav = document.querySelector('.navbar');
      if (nav) {
        const height = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }
    };

    updateNavbarHeight();
    window.addEventListener('resize', updateNavbarHeight);

    let observer;
    const nav = document.querySelector('.navbar');
    if (nav && window.ResizeObserver) {
      observer = new ResizeObserver(() => updateNavbarHeight());
      observer.observe(nav);
    }

    return () => {
      window.removeEventListener('resize', updateNavbarHeight);
      if (observer) observer.disconnect();
    };
  }, [role, loading, firmProfile]);

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
        <h2 className="nav-firm-title">
          {loading 
            ? "Loading..." 
            : (firmProfile?.firm_name 
                ? firmProfile.firm_name.replace(/\bCentre\b/gi, 'Center') 
                : 'Shree Wellness Center')}
        </h2>
        {(firmProfile?.address_line_1 || firmProfile?.address_line_2) && (
          <div className="nav-firm-address">
            {firmProfile.address_line_1 && <span className="address-part-1">{firmProfile.address_line_1}</span>}
            {firmProfile.address_line_1 && firmProfile.address_line_2 && <span className="address-sep"> | </span>}
            {firmProfile.address_line_2 && <span className="address-part-2">{firmProfile.address_line_2}</span>}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <ul className={isOpen ? "nav-links open" : "nav-links"}>
        {(!role || role.toLowerCase() === 'guest') ? (
          <li className="nav-guest-row">
            <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
            <Link to="/collection" onClick={() => setIsOpen(false)}>Store</Link>
            <Link to="/about" onClick={() => setIsOpen(false)}>About Us</Link>
          </li>
        ) : (
          <>
            <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
            
            <li><Link to="/collection" onClick={() => setIsOpen(false)}>Store</Link></li>

            {/* --- Accounts Dropdown --- */}
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
                  
                  {role === 'Admin' && (
                    <li><Link to="/master-settings" onClick={() => setIsOpen(false)}>Item Master</Link></li>
                  )}
                </ul>
              </li>
            )}

            {/* --- Transaction Dropdown --- */}
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
          </>
        )}
        
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
              <FaShoppingCart /> <span>Cart {cartCount > 0 ? `(${cartCount})` : ''}</span>
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
        {/* User Name text badge (Logged in user display) */}
        <span className="user-badge" style={{ marginRight: '10px', fontSize: '14px', color: '#d4af37', fontWeight: 'bold' }}>
          [{displayName}]
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
          className="icon-link cart-link" 
          title="Cart" 
          aria-label="Cart"
          onClick={(e) => { e.preventDefault(); setIsCartModalOpen(true); }}
          style={{ position: 'relative' }}
        >
          <FaShoppingCart />
          {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
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
      <ProfileModal isOpen={isProfileModalOpen} onClose={handleCloseProfile} />
      <CartModal 
        isOpen={isCartModalOpen} 
        onClose={() => setIsCartModalOpen(false)} 
        onOpenProfile={() => {
          setIsCartModalOpen(false);
          setReturnToCartAfterProfile(true);
          setIsProfileModalOpen(true);
        }}
      />
    </nav>
  );
};

export default Navbar;