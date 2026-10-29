import React, { useState, useEffect, useRef, useContext } from 'react';
import { baseURL } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import axios from 'axios';
import './ReceiptVoucher.css';

const ReceiptVoucher = () => {
  const { firmProfile } = useContext(FirmProfileContext);

  // Voucher Meta States
  const [receiptId, setReceiptId] = useState('');
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Customers Master State
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [currentDues, setCurrentDues] = useState(0);
  const [currentAdvSp, setCurrentAdvSp] = useState(0);

  // Search Inputs for Customer Comboboxes
  const [dsCodeSearch, setDsCodeSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [mobileSearch, setMobileSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');

  // Dropdown Open Tracker: null | 'ds' | 'name' | 'mobile' | 'address'
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Paid Against & Buy SP States
  const [paidAgainst, setPaidAgainst] = useState('Old Bill'); // 'Old Bill' or 'Advanced'
  const [buySp, setBuySp] = useState('');
  const [forBillNo, setForBillNo] = useState('');

  // Payment Mode & Amount States
  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // Refs for Click-Outside Detection
  const dsComboboxRef = useRef(null);
  const nameComboboxRef = useRef(null);
  const mobileComboboxRef = useRef(null);
  const addressComboboxRef = useRef(null);

  // Initial Data Fetching
  const fetchInitialData = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/receipts/initial-data/`);
      if (res.data && res.data.success) {
        setReceiptId(res.data.next_receipt_id);
      }
    } catch (err) {
      console.error("Receipt ID load karne me error:", err);
    }
  };

  const fetchCustomersForReceipt = async () => {
    try {
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

  useEffect(() => {
    fetchInitialData();
    fetchCustomersForReceipt();
  }, []);

  // Click Outside to Close Any Open Combobox Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideDs = dsComboboxRef.current && dsComboboxRef.current.contains(e.target);
      const isInsideName = nameComboboxRef.current && nameComboboxRef.current.contains(e.target);
      const isInsideMobile = mobileComboboxRef.current && mobileComboboxRef.current.contains(e.target);
      const isInsideAddress = addressComboboxRef.current && addressComboboxRef.current.contains(e.target);

      if (!isInsideDs && !isInsideName && !isInsideMobile && !isInsideAddress) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Universal Customer Selector (Auto-fills all 4 fields respectively)
  const handleSelectCustomer = (customer) => {
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name || '');
    setDsCodeSearch(customer.ds_id || '');
    setNameSearch(customer.name || '');
    setMobileSearch(customer.mobile || '');
    setAddressSearch(customer.address || '');
    setCurrentDues(customer.current_dues || 0);
    setCurrentAdvSp(customer.advanced_sp || 0);
    setActiveDropdown(null);
  };

  // Clear Customer Selection
  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setDsCodeSearch('');
    setNameSearch('');
    setMobileSearch('');
    setAddressSearch('');
    setCurrentDues(0);
    setCurrentAdvSp(0);
    setActiveDropdown(null);
  };

  // Filtered lists for each combobox
  const filteredByDs = customersList.filter(c => {
    if (!dsCodeSearch.trim()) return true;
    return (c.ds_id || '').toLowerCase().includes(dsCodeSearch.trim().toLowerCase());
  });

  const filteredByName = customersList.filter(c => {
    if (!nameSearch.trim()) return true;
    return (c.name || '').toLowerCase().includes(nameSearch.trim().toLowerCase());
  });

  const filteredByMobile = customersList.filter(c => {
    if (!mobileSearch.trim()) return true;
    return (c.mobile || '').includes(mobileSearch.trim()) || (c.mobile2 || '').includes(mobileSearch.trim());
  });

  const filteredByAddress = customersList.filter(c => {
    if (!addressSearch.trim()) return true;
    return (c.address || '').toLowerCase().includes(addressSearch.trim().toLowerCase());
  });

  const handleReset = () => {
    handleClearCustomer();
    setAmount('');
    setCashAmount('');
    setUpiAmount('');
    setForBillNo('');
    setBuySp('');
    setRemarks('');
    setPaidAgainst('Old Bill');
    setMode('Cash');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      alert("Kripya kisi Customer ko select kijiye!");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert("Kripya sahi Received Amount zaroor bharein!");
      return;
    }

    if (paidAgainst === 'Advanced') {
      const spVal = parseFloat(buySp);
      if (isNaN(spVal) || spVal <= 0) {
        if (!window.confirm("Aapne 'Advanced' select kiya hai par Buy SP me koi value nahi dali hai. Kya aap bina SP ke aage badhna chahte hain?")) {
          return;
        }
      }
    }

    setLoading(true);

    let finalRemarks = remarks;
    if (mode === 'Cash & UPI') {
      const splitInfo = `[Cash: ₹${cashAmount || 0}, UPI: ₹${upiAmount || 0}]`;
      finalRemarks = remarks ? `${splitInfo} - ${remarks}` : splitInfo;
    }

    const payload = {
      customer_id: selectedCustomerId,
      customer_name: nameSearch || selectedCustomerName,
      date: currentDate,
      mode: mode,
      amount: parseFloat(amount),
      for_bill_no: forBillNo,
      paid_against: paidAgainst,
      buy_sp: paidAgainst === 'Advanced' ? (parseFloat(buySp) || 0) : 0,
      remarks: finalRemarks
    };

    try {
      const response = await fetch(`${baseURL}/api/receipts/save/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const jsonData = await response.json();
          alert(jsonData.message || "Receipt Voucher successfully saved!");
        } else {
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          const fileName = `Receipt_${receiptId}.pdf`;

          // 1. PDF open in new tab
          window.open(pdfUrl, '_blank');

          // 2. Background download trigger
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
          }, 500);

          // 3. Memory cleanup
          setTimeout(() => {
            window.URL.revokeObjectURL(pdfUrl);
          }, 3000);
        }

        handleReset();

        // Refresh counter & customers
        fetchInitialData();
        fetchCustomersForReceipt();
      } else {
        const errorText = await response.text();
        alert("Voucher not saved: " + errorText);
      }
    } catch (error) {
      console.error("Network Error:", error);
      alert("Backend server se connection fail!");
    }
    setLoading(false);
  };

  return (
    <div className="receipt-container">
      {/* Header Bar matching StockIn */}
      <div className="receipt-header">
        Receipt Voucher
        {firmProfile && firmProfile.firm_name && (
          <span className="receipt-header-firm"> - {firmProfile.firm_name}</span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* 1. Customer Details Fieldset Box */}
        <fieldset className="receipt-fieldset">
          <legend className="receipt-legend">Customer Details</legend>

          <div className="receipt-form-grid customer-grid">
            {/* Combobox 1: DS Code */}
            <div className="receipt-form-group" ref={dsComboboxRef}>
              <label>DS Code</label>
              <div className="receipt-combobox-wrapper">
                <input
                  type="text"
                  placeholder="Search DS Code..."
                  value={dsCodeSearch}
                  autoComplete="off"
                  onFocus={() => setActiveDropdown('ds')}
                  onChange={(e) => {
                    setDsCodeSearch(e.target.value);
                    setActiveDropdown('ds');
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                />
                {activeDropdown === 'ds' && (
                  <ul className="receipt-dropdown-list">
                    {filteredByDs.length > 0 ? (
                      filteredByDs.map((c) => (
                        <li
                          key={c.id}
                          className="receipt-dropdown-item"
                          onMouseDown={() => handleSelectCustomer(c)}
                        >
                          <span className="drop-code">{c.ds_id || '(No DS)'}</span>
                          <span className="drop-sub">{c.name} ({c.mobile || '-'})</span>
                        </li>
                      ))
                    ) : (
                      <li className="receipt-dropdown-empty">No matching DS Code found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Combobox 2: Customer Name */}
            <div className="receipt-form-group" ref={nameComboboxRef}>
              <label style={{ color: '#00f5d4' }}>Customer Name *</label>
              <div className="receipt-combobox-wrapper">
                <input
                  type="text"
                  placeholder="Search Name..."
                  value={nameSearch}
                  autoComplete="off"
                  style={{ borderColor: selectedCustomerId ? '#00f5d4' : '#495057' }}
                  onFocus={() => setActiveDropdown('name')}
                  onChange={(e) => {
                    setNameSearch(e.target.value);
                    setActiveDropdown('name');
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                />
                {activeDropdown === 'name' && (
                  <ul className="receipt-dropdown-list">
                    {filteredByName.length > 0 ? (
                      filteredByName.map((c) => (
                        <li
                          key={c.id}
                          className="receipt-dropdown-item"
                          onMouseDown={() => handleSelectCustomer(c)}
                        >
                          <span className="drop-code">{c.name}</span>
                          <span className="drop-sub">DS: {c.ds_id || '-'} | Mob: {c.mobile || '-'}</span>
                        </li>
                      ))
                    ) : (
                      <li className="receipt-dropdown-empty">No matching Customer found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Combobox 3: Mobile */}
            <div className="receipt-form-group" ref={mobileComboboxRef}>
              <label>Mobile Number</label>
              <div className="receipt-combobox-wrapper">
                <input
                  type="text"
                  placeholder="Search Mobile..."
                  value={mobileSearch}
                  autoComplete="off"
                  onFocus={() => setActiveDropdown('mobile')}
                  onChange={(e) => {
                    setMobileSearch(e.target.value);
                    setActiveDropdown('mobile');
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                />
                {activeDropdown === 'mobile' && (
                  <ul className="receipt-dropdown-list">
                    {filteredByMobile.length > 0 ? (
                      filteredByMobile.map((c) => (
                        <li
                          key={c.id}
                          className="receipt-dropdown-item"
                          onMouseDown={() => handleSelectCustomer(c)}
                        >
                          <span className="drop-code">{c.mobile || '(No Mobile)'}</span>
                          <span className="drop-sub">{c.name} (DS: {c.ds_id || '-'})</span>
                        </li>
                      ))
                    ) : (
                      <li className="receipt-dropdown-empty">No matching Mobile found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Combobox 4: Address */}
            <div className="receipt-form-group" ref={addressComboboxRef}>
              <label>Address</label>
              <div className="receipt-combobox-wrapper">
                <input
                  type="text"
                  placeholder="Search Address..."
                  value={addressSearch}
                  autoComplete="off"
                  onFocus={() => setActiveDropdown('address')}
                  onChange={(e) => {
                    setAddressSearch(e.target.value);
                    setActiveDropdown('address');
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                />
                {activeDropdown === 'address' && (
                  <ul className="receipt-dropdown-list">
                    {filteredByAddress.length > 0 ? (
                      filteredByAddress.map((c) => (
                        <li
                          key={c.id}
                          className="receipt-dropdown-item"
                          onMouseDown={() => handleSelectCustomer(c)}
                        >
                          <span className="drop-code">{c.address || '(No Address)'}</span>
                          <span className="drop-sub">{c.name} (DS: {c.ds_id || '-'})</span>
                        </li>
                      ))
                    ) : (
                      <li className="receipt-dropdown-empty">No matching Address found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Dues & Advanced SP Indicator */}
          {selectedCustomerId && (
            <div
              className="receipt-dues-box"
              style={{
                backgroundColor: currentDues < 0 ? 'rgba(40, 167, 69, 0.15)' : (currentDues > 0 ? 'rgba(220, 53, 69, 0.15)' : 'rgba(0, 245, 212, 0.1)'),
                borderColor: currentDues < 0 ? '#28a745' : (currentDues > 0 ? '#dc3545' : '#00f5d4')
              }}
            >
              <div className="dues-left">
                <span className="dues-title">
                  {currentDues < 0 ? '🟢 Advance Amount Available:' : (currentDues > 0 ? '⚠️ Current Outstanding Dues:' : 'ℹ️ Dues Balance:')}
                </span>
                <span
                  className="dues-value"
                  style={{ color: currentDues < 0 ? '#28a745' : (currentDues > 0 ? '#dc3545' : '#00f5d4') }}
                >
                  ₹{Math.abs(parseFloat(currentDues || 0)).toLocaleString('en-IN')}
                </span>
                {currentDues === 0 && <span style={{ color: '#aaa', marginLeft: '5px' }}>(Nil)</span>}
              </div>

              <div className="dues-right">
                {currentAdvSp > 0 && (
                  <span className="badge-adv-sp">
                    💎 Advanced SP: <strong>{parseFloat(currentAdvSp).toFixed(2)} SP</strong>
                  </span>
                )}
                <button
                  type="button"
                  className="btn-clear-customer"
                  onClick={handleClearCustomer}
                  title="Clear Customer Selection"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {/* 2. Voucher & Payment Details Fieldset Box */}
        <fieldset className="receipt-fieldset">
          <legend className="receipt-legend">Voucher & Payment Details</legend>

          <div className="receipt-form-grid">
            {/* Receipt ID */}
            <div className="receipt-form-group">
              <label>Receipt ID</label>
              <input
                type="text"
                value={receiptId ? `REC-${receiptId}` : 'Loading...'}
                disabled
                className="input-disabled"
              />
            </div>

            {/* Date */}
            <div className="receipt-form-group">
              <label>Date</label>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>

            {/* Paid Against Dropdown (Outside customer box) */}
            <div className="receipt-form-group">
              <label style={{ color: '#ff7300', fontWeight: 'bold' }}>Paid Against</label>
              <select
                value={paidAgainst}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaidAgainst(val);
                  if (val !== 'Advanced') {
                    setBuySp('');
                  }
                }}
                style={{ borderColor: '#ff7300' }}
              >
                <option value="Old Bill">Old Bill</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Conditional Input: If Advanced -> Buy SP number box */}
            {paidAgainst === 'Advanced' ? (
              <div className="receipt-form-group">
                <label style={{ color: '#00f5d4', fontWeight: 'bold' }}>Buy SP</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter SP (e.g. 10.00)"
                  value={buySp}
                  onChange={(e) => setBuySp(e.target.value)}
                  style={{ borderColor: '#00f5d4' }}
                />
              </div>
            ) : (
              /* If Old Bill -> For Bill No */
              <div className="receipt-form-group">
                <label>For Bill No. (Optional)</label>
                <input
                  type="text"
                  placeholder="Ex: TJ-1024"
                  value={forBillNo}
                  onChange={(e) => setForBillNo(e.target.value)}
                />
              </div>
            )}

            {/* Payment Mode */}
            <div className="receipt-form-group">
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

            {/* Received Amount */}
            <div className="receipt-form-group">
              <label style={{ color: '#00f5d4', fontWeight: 'bold' }}>Received Amount (Total ₹) *</label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="0"
                value={amount}
                required
                style={{ borderColor: '#00f5d4', fontWeight: 'bold' }}
                onChange={(e) => {
                  const tot = e.target.value;
                  setAmount(tot);
                  if (mode === 'Cash & UPI') {
                    setCashAmount(tot);
                    setUpiAmount(0);
                  }
                }}
              />
            </div>

            {/* If Cash & UPI: Split inputs */}
            {mode === 'Cash & UPI' && (
              <>
                <div className="receipt-form-group">
                  <label style={{ color: '#bfa15f', fontWeight: 'bold' }}>💵 Cash Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => {
                      const cashVal = parseFloat(e.target.value) || 0;
                      setCashAmount(e.target.value);
                      const tot = parseFloat(amount) || 0;
                      const remUpi = tot - cashVal;
                      setUpiAmount(remUpi >= 0 ? remUpi : 0);
                    }}
                  />
                </div>

                <div className="receipt-form-group">
                  <label style={{ color: '#bfa15f', fontWeight: 'bold' }}>📱 UPI Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={upiAmount}
                    onChange={(e) => {
                      const upiVal = parseFloat(e.target.value) || 0;
                      setUpiAmount(e.target.value);
                      const tot = parseFloat(amount) || 0;
                      const remCash = tot - upiVal;
                      setCashAmount(remCash >= 0 ? remCash : 0);
                    }}
                  />
                </div>
              </>
            )}

            {/* Remarks / Details */}
            <div className="receipt-form-group full-width">
              <label>Remarks / Details</label>
              <input
                type="text"
                placeholder="Ex: Part payment received / Advance booking"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {/* Action Buttons Bar */}
        <div className="receipt-actions-bar">
          <button
            type="submit"
            disabled={loading}
            className="btn-save-receipt"
          >
            {loading ? 'Saving Receipt...' : '🚀 Submit & Open PDF'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-reset-receipt"
          >
            🔄 Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReceiptVoucher;
