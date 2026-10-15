import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import SalesVoucher from './components/SalesVoucher'; 
import StockIn from './components/StockIn'; 
import CustomersManager from './components/CustomersManager';
import SalesRegister from './components/SalesRegister';
import StockRegister from './components/StockRegister';
import Collection from './components/Collection'; 
import ReceiptVoucher from './components/ReceiptVoucher';
import ReceiptRegister from './components/ReceiptRegister'; 
import ItemMasterSettings from './components/ItemMasterSettings';
import EnquiryDashboard from './components/EnquiryDashboard';
import AboutUs from './components/AboutUs';
import AdjustSP from './components/AdjustSP';
import Screensaver from './components/Screensaver';
import { FirmProfileProvider } from './context/FirmProfileContext';

// 🔑 Naya Login Component Import Kiya
import Login from './components/Login'; 
import './App.css';

function App() {
  // 1. Hooks hamesha function ke top par hote hain (bina kisi HTML/JSX ke)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const role = sessionStorage.getItem('userRole');
    const manualLogout = sessionStorage.getItem('manual_logout');

    if (role === 'Guest' || (token && role)) {
      setIsAuthenticated(true);
      setUserRole(role);
    } else if (manualLogout !== 'true') {
      sessionStorage.setItem('userRole', 'Guest');
      sessionStorage.setItem('username', 'Customer');
      setIsAuthenticated(true);
      setUserRole('Guest');
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.clear(); 
    sessionStorage.setItem('manual_logout', 'true'); 
    setIsAuthenticated(false);
    setUserRole('');
  };

  const handleLoginSuccess = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  // 2. Sirf ek return block hoga jisme FirmProfileProvider sabko wrap karega
  return (
    <FirmProfileProvider>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="App">
          <Screensaver />
          <Navbar onLogout={handleLogout} role={userRole} />
          
          <Routes>
            <Route path="/" element={<HeroBanner />} />
            <Route path="/collection" element={<Collection />} />        
            
            <Route path="/admin/enquiries" element={<EnquiryDashboard />} />

            <Route path="/Customers" element={userRole !== 'Guest' ? <CustomersManager /> : <Navigate to="/" />} />
            <Route path="/sales" element={userRole !== 'Guest' ? <SalesVoucher /> : <Navigate to="/" />} />
            <Route path="/stockin" element={userRole !== 'Guest' ? <StockIn /> : <Navigate to="/" />} />
            <Route path="/sales-register" element={userRole !== 'Guest' ? <SalesRegister /> : <Navigate to="/" />} />
            <Route path="/stock-register" element={userRole !== 'Guest' ? <StockRegister /> : <Navigate to="/" />} />
            <Route path="/receipt-voucher" element={userRole !== 'Guest' ? <ReceiptVoucher /> : <Navigate to="/" />} />
            <Route path="/receipt-register" element={userRole !== 'Guest' ? <ReceiptRegister /> : <Navigate to="/" />} />
            <Route path="/adjust-sp" element={userRole !== 'Guest' ? <AdjustSP /> : <Navigate to="/" />} />

            <Route path="/master-settings" element={userRole === 'Admin' ? <ItemMasterSettings /> : <Navigate to="/" />} />
            
            <Route path="/about" element={<AboutUs />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </FirmProfileProvider>
  );
}

export default App;