import React, { useState, useEffect } from 'react';
import { baseURL } from '../apiConfig'; // <-- Apni nayi central file se baseURL import kiya
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import axios from 'axios';
import './ReceiptVoucher.css'; 

const ReceiptVoucher = () => {
  const { firmProfile } = useContext(FirmProfileContext);
  // const baseURL = process.env.REACT_APP_API_URL || 'http://10.179.18.97:8000';
  const [receiptId, setReceiptId] = useState('');
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [currentDues, setCurrentDues] = useState(0);
  const [forBillNo, setForBillNo] = useState('');
  // const [mode, setMode] = useState('Cash');
  // const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState(''); // Total Received Amount
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');

  // Initial Data Fetching
  useEffect(() => {
    // axios.get('http://127.0.0.1:8000/api/receipts/initial-data/')
    // axios.get('http://10.179.18.97:8000/api/receipts/initial-data/')
    // const baseURL = process.env.REACT_APP_API_URL || 'http://10.179.18.97:8000';
    axios.get(`${baseURL}/api/receipts/initial-data/`)
      .then(res => {
        if (res.data && res.data.success) setReceiptId(res.data.next_receipt_id);
      })
      .catch(err => console.error("Receipt ID load karne me error:", err));

    const fetchCustomersForReceipt = async () => {
      try {
        // const response = await fetch('http://127.0.0.1:8000/api/get_customers/'); 
        // const response = await fetch('http://10.179.18.97:8000/api/get_customers/'); 

        // const baseURL = process.env.REACT_APP_API_URL || 'http://10.179.18.97:8000';
        const response = await fetch(`${baseURL}/api/get_customers/`); 
        
        const data = await response.json();
        if (data && data.success && Array.isArray(data.customers)) {
          setCustomersList(data.customers);
        } else {
          setCustomersList([]);
        }
      } catch (error) {
        console.error("Customers load karne me dikkat:", error);
        setCustomersList([]);
      }
    };

    fetchCustomersForReceipt();
  }, []);

  const handleCustomerChange = (e) => {
    const cId = e.target.value;
    setSelectedCustomerId(cId);

    if (cId === '') {
      setSelectedCustomerName('');
      setCurrentDues(0);
      return;
    }

    const target = customersList.find(c => String(c.id) === String(cId));
    if (target) {
      setSelectedCustomerName(target.name || '');
      setCurrentDues(target.current_dues || 0);
    }
  };

  const handleReset = () => {
    setAmount('');
    setForBillNo('');
    setRemarks('');
    setSelectedCustomerId('');
    setCurrentDues(0);
    setSelectedCustomerName('');

    setMode('Cash');
    setCashAmount('');
    setUpiAmount('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
      alert("Kripya Grahak aur sahi Amount zaroor bharein!");
      return;
    }

    setLoading(true);

    // Agar Cash & UPI selected hai toh breakdown info remarks me add kar rahe hain
    let finalRemarks = remarks;
    if (mode === 'Cash & UPI') {
      const splitInfo = `[Cash: ₹${cashAmount || 0}, UPI: ₹${upiAmount || 0}]`;
      finalRemarks = remarks ? `${splitInfo} - ${remarks}` : splitInfo;
    }

    const payload = {
      customer_id: selectedCustomerId,
      customer_name: selectedCustomerName,
      date: currentDate,
      mode: mode,
      amount: parseFloat(amount),
      for_bill_no: forBillNo,
      remarks: finalRemarks
    };
    
    try {        
        const response = await fetch(`${baseURL}/api/receipts/save/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            const jsonData = await response.json();
            alert(jsonData.message || "Receipt Voucher successfully saved!");
        } else {
            // Return mapping for PDF stream
            const blob = await response.blob();
            const pdfUrl = URL.createObjectURL(blob);
            
            // --- NAYA AUTO-DOWNLOAD AUR NEW TAB LOGIC ---
            // // File ka naam dynamic set karna (Receipt_ID.pdf)
            // const fileName = `Receipt_${receiptId}.pdf`;

            // // 1. Background me download trigger karna
            // const link = document.createElement('a');
            // link.href = pdfUrl;
            // link.setAttribute('download', fileName); 
            // document.body.appendChild(link);
            // link.click();
            
            // // Download trigger hone ke baad clean up
            // link.parentNode.removeChild(link);
            
            // // 2. PDF ko naye tab me open karna (taaki aasani se print ho sake)
            // window.open(pdfUrl, '_blank');
            
            // // 3. Memory clean up (Naye tab ko load hone ka thoda time dene ke liye)
            // setTimeout(() => {
            //     window.URL.revokeObjectURL(pdfUrl);
            // }, 2000);
            
            // File ka naam dynamic set karna (Receipt_ID.pdf)
            const fileName = `Receipt_${receiptId}.pdf`;

            // 1. PDF ko naye tab me open karna (sabse pehle taaki popup blocker na roke)
            window.open(pdfUrl, '_blank');

            // 2. Background me download trigger karna (ek chote delay ke sath)
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.setAttribute('download', fileName); 
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            }, 500); // 0.5 second ka delay taaki naya tab pehle khul jaye
            
            // 3. Memory clean up (Thoda lamba time diya taaki dono kaam theek se ho jaye)
            setTimeout(() => {
                window.URL.revokeObjectURL(pdfUrl);
            }, 3000);
        }
        
        handleReset();
        
        // Reload dynamic counter fields
        const initRes = await axios.get(`${baseURL}/api/receipts/initial-data/`);
        if (initRes.data.success) setReceiptId(initRes.data.next_receipt_id);
        
        const custRes = await fetch(`${baseURL}/api/get_customers/`);
        const custData = await custRes.json();
        if (custData && custData.success) setCustomersList(custData.customers);          
      } else {
            const errorText = await response.text();
            alert("Voucher not saved : " + errorText);
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Backend server se connection fail !");
    }
    setLoading(false);
  };

  return (
    <div className="receipt-page-wrapper" style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <div className="voucher-container">
        <div className="voucher-header">
          <h2>{firmProfile.firm_name}</h2>
          <p>Receipt Voucher</p>
        </div>

        <form onSubmit={handleSubmit} className="voucher-form">
          <div className="form-row">
            <div className="form-group">
              <label>Receipt ID</label>
              <input type="text" value={receiptId} disabled className="input-disabled" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Select Customer</label>
              <select value={selectedCustomerId} onChange={handleCustomerChange}>
                <option value="">-- Choose Grahak --</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>For Bill No. (Optional)</label>
              <input type="text" value={forBillNo} onChange={(e) => setForBillNo(e.target.value)} placeholder="Ex: TJ-1024" />
            </div>
          </div>

          {/* {selectedCustomerId && (
            <div className="dues-indicator-box">
              <span className="dues-label">⚠️ Current Outstanding Dues:</span>
              <span className="dues-amount">₹{parseFloat(currentDues).toLocaleString('en-IN')}</span>
            </div>
          )} */}

          {selectedCustomerId && (
            <div 
              className="dues-indicator-box"
              style={{
                backgroundColor: currentDues < 0 ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                border: `1px solid ${currentDues < 0 ? '#28a745' : '#dc3545'}`,
                padding: '10px 15px',
                borderRadius: '6px',
                margin: '15px 0',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center'
              }}
            >
              <span className="dues-label" style={{ fontWeight: 'bold', color: '#fff' }}>
                {currentDues < 0 ? '🟢 Advance Amount Available:' : '⚠️ Current Outstanding Dues:'}
              </span>
              <span 
                className="dues-amount"
                style={{
                  color: currentDues < 0 ? '#28a745' : '#dc3545', // Negative par GREEN, Positive par RED
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}
              >
                ₹{Math.abs(parseFloat(currentDues)).toLocaleString('en-IN')} {/* Math.abs() minus sign hata dega */}
              </span>
            </div>
          )}


          {/* <div className="form-row">
            <div className="form-group">
              <label>Payment Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="Cash">💵 Cash</option>
                <option value="Online">📱 UPI</option>
                <option value="Cheque">🏦 Cash & UPI</option>
              </select>
            </div>
            <div className="form-group">
              <label>Received Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="input-amount" />
            </div>
          </div> */}

          <div className="form-row">
            <div className="form-group">
              <label>Payment Mode</label>
              <select 
                value={mode} 
                onChange={(e) => {
                  const newMode = e.target.value;
                  setMode(newMode);
                  if (newMode === 'Cash & UPI') {
                    setCashAmount(amount);
                    setUpiAmount(0);
                  }
                }}
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="Cash & UPI">🔀 Cash & UPI</option>
              </select>
            </div>

            <div className="form-group">
              <label>Received Amount (Total ₹)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => {
                  const tot = e.target.value;
                  setAmount(tot);
                  if (mode === 'Cash & UPI') {
                    setCashAmount(tot);
                    setUpiAmount(0);
                  }
                }} 
                placeholder="0.00" 
                required 
                className="input-amount" 
              />
            </div>
          </div>

          {/* 🔀 NAYA BOX: CASH & UPI SPLIT INPUTS */}
          {mode === 'Cash & UPI' && (
            <div className="form-row" style={{ backgroundColor: '#252525', padding: '12px', borderRadius: '8px', border: '1px solid #bfa15f', marginBottom: '15px' }}>
              <div className="form-group">
                <label style={{ color: '#bfa15f', fontWeight: 'bold' }}>💵 Cash Amount (₹)</label>
                <input 
                  type="number" 
                  value={cashAmount} 
                  onChange={(e) => {
                    const cashVal = parseFloat(e.target.value) || 0;
                    setCashAmount(e.target.value);
                    const tot = parseFloat(amount) || 0;
                    const remUpi = tot - cashVal;
                    setUpiAmount(remUpi >= 0 ? remUpi : 0);
                  }} 
                  placeholder="0.00" 
                />
              </div>

              <div className="form-group">
                <label style={{ color: '#bfa15f', fontWeight: 'bold' }}>📱 UPI Amount (₹)</label>
                <input 
                  type="number" 
                  value={upiAmount} 
                  onChange={(e) => {
                    const upiVal = parseFloat(e.target.value) || 0;
                    setUpiAmount(e.target.value);
                    const tot = parseFloat(amount) || 0;
                    const remCash = tot - upiVal;
                    setCashAmount(remCash >= 0 ? remCash : 0);
                  }} 
                  placeholder="0.00" 
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Remarks / Details</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Ex: Part payment received" rows="2"></textarea>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={loading} className="voucher-submit-btn" style={{ flex: 2 }}>
              {loading ? 'Saving Receipt...' : '🚀 Submit & Open PDF'}
            </button>
            <button type="button" onClick={handleReset} className="voucher-submit-btn" style={{ flex: 1, backgroundColor: '#555', color: '#fff' }}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiptVoucher;