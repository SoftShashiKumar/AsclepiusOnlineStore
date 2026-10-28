import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import './CartModal.css';

const CartModal = ({ isOpen, onClose, onOpenProfile }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('userCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    } else {
      setCartItems([]);
    }
  };

  const updateQuantity = (index, newQty) => {
    const qty = parseInt(newQty, 10);
    if (qty < 1) return;
    
    const updated = [...cartItems];
    const maxQty = updated[index].maxQty;
    
    if (maxQty && qty > maxQty) {
      alert(`iss item ki sirf ${maxQty} quantity hi available hai!`);
      return;
    }
    
    updated[index].quantity = qty;
    updated[index].itemTotal = qty * parseFloat(updated[index].rate || 0);
    updated[index].itemTotalSP = qty * parseFloat(updated[index].sp || 0);
    setCartItems(updated);
    localStorage.setItem('userCart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (index) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    localStorage.setItem('userCart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const getGrandTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.itemTotal || 0), 0);
  };

  const getGrandTotalSP = () => {
    return cartItems.reduce((acc, item) => acc + (item.itemTotalSP || 0), 0);
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      alert("Cart khali hai!");
      return;
    }

    // Get Profile Details
    let customerName = '';
    let customerMobile = '';
    let asclepiusId = '';
    let address = '';

    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      customerName = profile.name || '';
      customerMobile = profile.mobile || '';
      asclepiusId = profile.asclepiusId || '';
      address = profile.address || '';
    } else {
      customerName = localStorage.getItem('cachedCustomerName') || '';
      customerMobile = localStorage.getItem('cachedCustomerMobile') || '';
    }

    if (!customerName.trim() || !customerMobile.trim() || !asclepiusId.trim() || !address.trim()) {
      alert("Order place karne se pehle aapko profile banana zaroori hai.");
      if (onOpenProfile) {
        onOpenProfile();
      } else {
        window.dispatchEvent(new CustomEvent('openProfileModal', { detail: { returnToCart: true } }));
      }
      return;
    }

    setIsPlacingOrder(true);
    try {
      const formattedName = customerName
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const response = await axios.post(`${baseURL}/api/sales-order/save-bulk/`, {
        customer_name: formattedName || customerName,
        customer_mobile: customerMobile,
        asclepius_id: asclepiusId,
        customer_address: address,
        items: cartItems
      });

      if (response.data.success) {
        alert("🎉 Aapka order successfully place ho gaya hai!");
        localStorage.removeItem('userCart');
        window.dispatchEvent(new Event('cartUpdated'));
        setCartItems([]);
        onClose();
      } else {
        alert("Order fail ! " + response.data.message);
      }
    } catch (error) {
      console.error("Order API Error:", error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert("Server se connect nahi ho paya!");
      }
    }
    setIsPlacingOrder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="cart-modal-overlay">
      <div className="cart-modal-content">
        <button className="cart-close-btn" onClick={onClose}>&times;</button>
        <h2 className="cart-heading">🛒 My Cart</h2>
        
        {cartItems.length === 0 ? (
          <div className="empty-cart-msg">Aapka cart khali hai.</div>
        ) : (
          <div className="cart-items-container">
            {cartItems.map((item, index) => (
              <div key={index} className="cart-item-card">
                <div className="cart-item-header">
                  <div>
                    <strong>{item.itemName}</strong>
                    <div style={{ fontSize: '12px', color: '#888' }}>Tag: {item.tagId}</div>
                  </div>
                  <button className="btn-remove-item" onClick={() => removeItem(index)}>❌</button>
                </div>
                
                <div className="cart-item-details">
                  <div className="qty-control">
                    <label>Qty:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => updateQuantity(index, e.target.value)} 
                    />
                  </div>
                  <div className="rate-info">
                    Rate: ₹{item.rate}
                    <br />
                    <span style={{ fontSize: '11px', color: '#bfa15f' }}>SP: {parseFloat(item.sp || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-info">
                    Total: ₹{item.itemTotal}
                    <br />
                    <span style={{ fontSize: '11px', color: '#bfa15f' }}>Tot SP: {parseFloat(item.itemTotalSP || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="cart-grand-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#bfa15f', fontSize: '16px' }}>TSP: {getGrandTotalSP().toFixed(2)}</span>
              <span>Grand Total: ₹{getGrandTotal()}</span>
            </div>
            
            <button 
              className="btn-place-order" 
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? 'Processing...' : '✅ Place My Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
