import React, { useState, useEffect, useRef, useContext } from 'react';
import { baseURL, getCurrentFirmId } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import axios from 'axios';
import './ReceiptVoucher.css';
import ShareBillModal from './ShareBillModal';

const ReceiptVoucher = () => {
  const { firmProfile } = useContext(FirmProfileContext);

  // Voucher Meta States
  const [receiptId, setReceiptId] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [savedReceiptInfo, setSavedReceiptInfo] = useState(null);
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

  // --- SP CALCULATION & ACTION STATES (Same as Sales page) ---
  const [spCalculationType, setSpCalculationType] = useState('Regular'); // 'Regular', 'Hold', 'Adjust'
  const [selectedActionTypes, setSelectedActionTypes] = useState([]);
  const [activationSubAction, setActivationSubAction] = useState('');
  const [repurchaseSubAction, setRepurchaseSubAction] = useState('');
  const [forId, setForId] = useState('');
  const [forName, setForName] = useState('');
  const [useSP, setUseSP] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [customerActionsList, setCustomerActionsList] = useState([]);

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
  const spForIdRef = useRef(null);
  const spForNameRef = useRef(null);

  // Initial Data Fetching
  const fetchInitialData = async () => {
    try {
      const firmId = firmProfile?.firm_id || '';
      const res = await axios.get(`${baseURL}/api/receipts/initial-data/${firmId ? `?firm_id=${firmId}` : ''}`);
      if (res.data && res.data.success) {
        setReceiptId(res.data.next_receipt_id);
      }
    } catch (err) {
      console.error("Receipt ID load karne me error:", err);
    }
  };

  const fetchCustomersForReceipt = async () => {
    try {
      const firmId = firmProfile?.firm_id || getCurrentFirmId();
      const response = await fetch(`${baseURL}/api/get_customers/${firmId ? `?firm_id=${firmId}` : ''}`, {
        headers: { ...(firmId ? { 'X-Firm-ID': firmId } : {}) }
      });
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
  }, [firmProfile?.firm_id]);

  // Click Outside to Close Any Open Combobox Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideDs = dsComboboxRef.current && dsComboboxRef.current.contains(e.target);
      const isInsideName = nameComboboxRef.current && nameComboboxRef.current.contains(e.target);
      const isInsideMobile = mobileComboboxRef.current && mobileComboboxRef.current.contains(e.target);
      const isInsideAddress = addressComboboxRef.current && addressComboboxRef.current.contains(e.target);
      const isInsideSpForId = spForIdRef.current && spForIdRef.current.contains(e.target);
      const isInsideSpForName = spForNameRef.current && spForNameRef.current.contains(e.target);

      if (!isInsideDs && !isInsideName && !isInsideMobile && !isInsideAddress && !isInsideSpForId && !isInsideSpForName) {
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
    if (spCalculationType !== 'Adjust') {
      setForId(customer.ds_id || '');
      setForName(customer.name || '');
    }
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
    setForId('');
    setForName('');
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

  const filteredSpForId = customersList.filter(c => {
    if (!forId.trim()) return true;
    return (c.ds_id || '').toLowerCase().includes(forId.trim().toLowerCase()) ||
           (c.name || '').toLowerCase().includes(forId.trim().toLowerCase());
  });

  const filteredSpForName = customersList.filter(c => {
    if (!forName.trim()) return true;
    return (c.name || '').toLowerCase().includes(forName.trim().toLowerCase()) ||
           (c.ds_id || '').toLowerCase().includes(forName.trim().toLowerCase());
  });

  const totalBuySP = paidAgainst === 'Advanced' ? (parseFloat(buySp) || 0) : 0;
  const distributedSP = customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0);
  const remainingSP = totalBuySP - distributedSP;

  const ACTION_TYPE_ORDER = ['Bill Approved', 'Activation', 'Repurchase'];

  const handleActionTypeToggle = (type) => {
    setSelectedActionTypes((prev) => {
      const exists = prev.includes(type);
      const next = exists ? prev.filter((t) => t !== type) : [...prev, type];
      if (exists) {
        if (type === 'Activation') setActivationSubAction('');
        if (type === 'Repurchase') setRepurchaseSubAction('');
      }
      return ACTION_TYPE_ORDER.filter((t) => next.includes(t));
    });
  };

  useEffect(() => {
    if (spCalculationType === 'Adjust') {
      setSelectedActionTypes([]);
      setActivationSubAction('');
      setRepurchaseSubAction('');
      setForId('');
      setForName('');
      setActionRemarks('');
      setCustomerActionsList([]);
      setUseSP('');
    }
  }, [spCalculationType]);

  useEffect(() => {
    if (paidAgainst !== 'Advanced' || spCalculationType === 'Adjust') {
      setUseSP('');
      return;
    }
    const rem = totalBuySP - distributedSP;
    setUseSP(rem >= 0 ? rem.toString() : '0');
  }, [totalBuySP, distributedSP, paidAgainst, spCalculationType]);

  const resetSpCalculationStates = () => {
    setSpCalculationType('Regular');
    setSelectedActionTypes([]);
    setActivationSubAction('');
    setRepurchaseSubAction('');
    setForId('');
    setForName('');
    setUseSP('');
    setActionRemarks('');
    setCustomerActionsList([]);
  };

  const handleAddCustomerAction = () => {
    if (selectedActionTypes.length === 0) {
      alert("Please select Bill Approved, Activation, or Repurchase.");
      return;
    }
    if (selectedActionTypes.includes('Activation') && !activationSubAction) {
      alert("Please select 27, 52, or 100 for Activation.");
      return;
    }
    if (selectedActionTypes.includes('Repurchase') && !repurchaseSubAction) {
      alert("Please select SAO or SGO for Repurchase.");
      return;
    }

    const rem = totalBuySP - distributedSP;
    const val = parseFloat(useSP) || 0;
    if (val <= 0 && totalBuySP > 0) {
      alert("Use SP cannot be zero.");
      return;
    }
    if (val > rem) {
      alert("Use SP cannot be greater than Remaining SP.");
      return;
    }

    const hasActivation = selectedActionTypes.includes('Activation');
    const hasRepurchase = selectedActionTypes.includes('Repurchase');
    const subParts = [];
    if (hasActivation && activationSubAction) subParts.push(activationSubAction);
    if (hasRepurchase && repurchaseSubAction) subParts.push(repurchaseSubAction);

    const newAction = {
      types: selectedActionTypes,
      type: selectedActionTypes.join(', '),
      subType: subParts.join(', '),
      activationSubType: hasActivation ? activationSubAction : '',
      repurchaseSubType: hasRepurchase ? repurchaseSubAction : '',
      forId: forId,
      forName: forName,
      useSP: val,
      remarks: actionRemarks
    };
    setCustomerActionsList([...customerActionsList, newAction]);
    setSelectedActionTypes([]);
    setActivationSubAction('');
    setRepurchaseSubAction('');
    setActionRemarks('');
    setForName('');
  };

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
    resetSpCalculationStates();
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
      } else if (!['Hold', 'Adjust'].includes(spCalculationType) && remainingSP > 0) {
        alert("Kripya poora Buy SP SP Calculation box me Add karein ya Calculation Mode ko Hold/Adjust karein!");
        return;
      }
    }

    setLoading(true);

    const selectedCust = customersList.find(c => String(c.id) === String(selectedCustomerId));
    const finalMobile = (mobileSearch || selectedCust?.mobile || selectedCust?.mobile1 || selectedCust?.mobile2 || '').trim();
    const finalName = (nameSearch || selectedCustomerName || selectedCust?.name || '').trim();

    let finalRemarks = remarks;
    if (mode === 'Cash & UPI') {
      const splitInfo = `[Cash: ₹${cashAmount || 0}, UPI: ₹${upiAmount || 0}]`;
      finalRemarks = remarks ? `${splitInfo} - ${remarks}` : splitInfo;
    }

    const currentFirm = firmProfile?.firm_id || getCurrentFirmId();
    const payload = {
      customer_id: selectedCustomerId,
      customer_name: finalName,
      customer_mobile: finalMobile,
      mobile: finalMobile,
      date: currentDate,
      mode: mode,
      amount: parseFloat(amount),
      for_bill_no: forBillNo,
      paid_against: paidAgainst,
      buy_sp: paidAgainst === 'Advanced' ? (parseFloat(buySp) || 0) : 0,
      spCalculationType: paidAgainst === 'Advanced' ? spCalculationType : 'Regular',
      customerActions: paidAgainst === 'Advanced' && spCalculationType === 'Regular' ? customerActionsList : [],
      remarks: finalRemarks,
      firm_id: currentFirm
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

          // 3. WhatsApp & QR Share Modal show karna
          const headerMobile = response.headers.get("x-customer-mobile") || response.headers.get("X-Customer-Mobile") || '';
          const targetMobileVal = (finalMobile || headerMobile || selectedCust?.mobile || selectedCust?.mobile1 || '').replace(/\D/g, '').slice(-10);

          setSavedReceiptInfo({
            id: receiptId,
            customerName: finalName,
            mobile: targetMobileVal,
            amount: parseFloat(amount),
            pdfBlobUrl: pdfUrl
          });
          setIsShareModalOpen(true);
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
                    resetSpCalculationStates();
                  } else if (selectedCustomerId && spCalculationType !== 'Adjust') {
                    setForId(dsCodeSearch || '');
                    setForName(nameSearch || selectedCustomerName || '');
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

        {/* 3. SP CALCULATION SECTION (Appears when Paid Against === 'Advanced', same rules & look as Sales page) */}
        {paidAgainst === 'Advanced' && (
          <div className="voucher-section sp-calculation-section receipt-sp-section">
            <div className="section-label">SP Calculation</div>

            {/* Header: Calculation Mode on the LEFT */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: spCalculationType === 'Hold' ? '0' : '15px',
              paddingBottom: '10px',
              borderBottom: spCalculationType === 'Hold' ? 'none' : '1px solid #333'
            }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#bfa15f', margin: 0, textTransform: 'uppercase' }}>
                Calculation Mode:
              </label>
              <select
                value={spCalculationType}
                onChange={(e) => setSpCalculationType(e.target.value)}
                className="uniform-input"
                style={{
                  width: '140px',
                  height: '32px',
                  fontWeight: 'bold',
                  color: spCalculationType === 'Hold' ? '#f39c12' : (spCalculationType === 'Adjust' ? '#2ecc71' : '#fff'),
                  borderColor: spCalculationType === 'Hold' ? '#f39c12' : (spCalculationType === 'Adjust' ? '#2ecc71' : '#555')
                }}
              >
                <option value="Regular">Regular</option>
                <option value="Hold">Hold</option>
                <option value="Adjust">Adjust</option>
              </select>

              {spCalculationType === 'Adjust' && selectedCustomerId && (
                <span style={{ fontSize: '12px', color: '#2ecc71', fontWeight: 'bold', backgroundColor: '#1a1a1a', padding: '3px 10px', borderRadius: '4px', border: '1px solid #2ecc71' }}>
                  Available Adv. SP: {parseFloat(currentAdvSp || 0).toFixed(2)}
                </span>
              )}
            </div>

            {spCalculationType === 'Hold' ? (
              <div style={{ padding: '15px', backgroundColor: '#1a1a1a', border: '1px dashed #f39c12', borderRadius: '4px', color: '#f39c12', fontSize: '13px', textAlign: 'center', marginTop: '10px' }}>
                ⏸️ <strong>SP on Hold:</strong> All SP adjustment options are hidden. Submit is enabled, and Buy SP ({totalBuySP.toFixed(2)}) will be recorded as <strong>Hold</strong> in Adjust SP Settlement.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', opacity: spCalculationType === 'Adjust' ? 0.5 : 1 }}>
                  {/* Action Type Checkboxes */}
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', minHeight: '34px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" value="Bill Approved" disabled={spCalculationType === 'Adjust'} checked={selectedActionTypes.includes('Bill Approved')} onChange={() => handleActionTypeToggle('Bill Approved')} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Bill Approved
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" value="Activation" disabled={spCalculationType === 'Adjust'} checked={selectedActionTypes.includes('Activation')} onChange={() => handleActionTypeToggle('Activation')} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Activation
                      </label>
                      {selectedActionTypes.includes('Activation') && (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', padding: '3px 8px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '4px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            <input type="radio" name="receiptActSubType" value="27" disabled={spCalculationType === 'Adjust'} checked={activationSubAction === '27'} onChange={(e) => setActivationSubAction(e.target.value)} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 27
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            <input type="radio" name="receiptActSubType" value="52" disabled={spCalculationType === 'Adjust'} checked={activationSubAction === '52'} onChange={(e) => setActivationSubAction(e.target.value)} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 52
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            <input type="radio" name="receiptActSubType" value="100" disabled={spCalculationType === 'Adjust'} checked={activationSubAction === '100'} onChange={(e) => setActivationSubAction(e.target.value)} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 100
                          </label>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" value="Repurchase" disabled={spCalculationType === 'Adjust'} checked={selectedActionTypes.includes('Repurchase')} onChange={() => handleActionTypeToggle('Repurchase')} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Repurchase
                      </label>
                      {selectedActionTypes.includes('Repurchase') && (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', padding: '3px 8px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '4px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            <input type="radio" name="receiptRepSubType" value="SAO" disabled={spCalculationType === 'Adjust'} checked={repurchaseSubAction === 'SAO'} onChange={(e) => setRepurchaseSubAction(e.target.value)} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> SAO
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            <input type="radio" name="receiptRepSubType" value="SGO" disabled={spCalculationType === 'Adjust'} checked={repurchaseSubAction === 'SGO'} onChange={(e) => setRepurchaseSubAction(e.target.value)} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> SGO
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input Fields Row with Searchable Comboboxes for For ID and For Name */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Searchable Combobox: For ID */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative' }} ref={spForIdRef}>
                      <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For ID</label>
                      <div className="sales-combobox-wrapper">
                        <input
                          type="text"
                          className="uniform-input"
                          value={forId}
                          disabled={spCalculationType === 'Adjust'}
                          autoComplete="off"
                          onFocus={() => setActiveDropdown('sp_for_id')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForId(val);
                            setActiveDropdown('sp_for_id');
                            const query = val.trim().toLowerCase();
                            if (query) {
                              const match = customersList.find(c => (c.ds_id || '').toLowerCase() === query);
                              if (match) setForName(match.name || '');
                            }
                          }}
                          style={{ width: '130px', height: '32px' }}
                          placeholder="Search / For ID"
                        />
                        {activeDropdown === 'sp_for_id' && spCalculationType !== 'Adjust' && (
                          <ul className="sales-dropdown-list" style={{ minWidth: '220px' }}>
                            {filteredSpForId.length > 0 ? (
                              filteredSpForId.slice(0, 30).map((c) => (
                                <li
                                  key={c.id}
                                  className="sales-dropdown-item"
                                  onMouseDown={() => {
                                    setForId(c.ds_id || '');
                                    setForName(c.name || '');
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <span className="sales-drop-code">{c.ds_id || '(No ID)'}</span>
                                  <span className="sales-drop-sub">{c.name}</span>
                                </li>
                              ))
                            ) : (
                              <li className="sales-dropdown-empty">No matching customer found</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Searchable Combobox: For Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative' }} ref={spForNameRef}>
                      <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For Name</label>
                      <div className="sales-combobox-wrapper">
                        <input
                          type="text"
                          className="uniform-input"
                          value={forName}
                          disabled={spCalculationType === 'Adjust'}
                          autoComplete="off"
                          onFocus={() => setActiveDropdown('sp_for_name')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForName(val);
                            setActiveDropdown('sp_for_name');
                            const query = val.trim().toLowerCase();
                            if (query) {
                              const match = customersList.find(c => (c.name || '').toLowerCase() === query);
                              if (match && match.ds_id) setForId(match.ds_id);
                            }
                          }}
                          style={{ width: '150px', height: '32px' }}
                          placeholder="Search / For Name"
                        />
                        {activeDropdown === 'sp_for_name' && spCalculationType !== 'Adjust' && (
                          <ul className="sales-dropdown-list" style={{ minWidth: '220px' }}>
                            {filteredSpForName.length > 0 ? (
                              filteredSpForName.slice(0, 30).map((c) => (
                                <li
                                  key={c.id}
                                  className="sales-dropdown-item"
                                  onMouseDown={() => {
                                    setForName(c.name || '');
                                    setForId(c.ds_id || '');
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <span className="sales-drop-code">{c.name}</span>
                                  <span className="sales-drop-sub">DS: {c.ds_id || '-'}</span>
                                </li>
                              ))
                            ) : (
                              <li className="sales-dropdown-empty">No matching customer found</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Use SP</label>
                      <input type="number" step="0.01" className="uniform-input" value={useSP} disabled={spCalculationType === 'Adjust'} onChange={(e) => setUseSP(e.target.value)} style={{ width: '70px', height: '32px' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Remain SP</label>
                      <input type="text" readOnly disabled={spCalculationType === 'Adjust'} className="uniform-input" value={spCalculationType === 'Adjust' ? '0.00' : (remainingSP - (parseFloat(useSP) || 0)).toFixed(2)} style={{ width: '70px', height: '32px', backgroundColor: '#333', color: '#999' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Remarks</label>
                      <input type="text" className="uniform-input" value={actionRemarks} disabled={spCalculationType === 'Adjust'} onChange={(e) => setActionRemarks(e.target.value)} style={{ width: '110px', height: '32px' }} placeholder="Remarks" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        type="button"
                        className="btn-add"
                        onClick={handleAddCustomerAction}
                        disabled={spCalculationType === 'Adjust' || (totalBuySP > 0 && remainingSP <= 0)}
                        style={{ padding: '0 18px', height: '32px', fontSize: '13px', borderRadius: '4px', opacity: (spCalculationType === 'Adjust' || (totalBuySP > 0 && remainingSP <= 0)) ? 0.5 : 1, cursor: spCalculationType === 'Adjust' ? 'not-allowed' : 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Datagrid / Table */}
                {customerActionsList.length > 0 && (
                  <div style={{ marginTop: '15px', overflowX: 'auto' }}>
                    <table className="items-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Action</th>
                          <th>Type</th>
                          <th>Sub Type</th>
                          <th>For ID</th>
                          <th>For Name</th>
                          <th>Use SP</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerActionsList.map((action, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-remove"
                                onClick={() => {
                                  const newList = customerActionsList.filter((_, i) => i !== idx);
                                  setCustomerActionsList(newList);
                                }}
                                style={{ padding: '2px 8px', fontSize: '12px' }}
                              >
                                X
                              </button>
                            </td>
                            <td>{action.type}</td>
                            <td>{action.subType || '-'}</td>
                            <td>{action.forId || '-'}</td>
                            <td>{action.forName || '-'}</td>
                            <td>{action.useSP || '0'}</td>
                            <td>{action.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="receipt-actions-bar">
          <button
            type="submit"
            disabled={loading || (paidAgainst === 'Advanced' && !['Hold', 'Adjust'].includes(spCalculationType) && totalBuySP > 0 && remainingSP > 0)}
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
      {/* 📱 On-Demand WhatsApp & QR Share Modal */}
      <ShareBillModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type="receipt"
        id={savedReceiptInfo?.id}
        customerName={savedReceiptInfo?.customerName}
        mobile={savedReceiptInfo?.mobile}
        amount={savedReceiptInfo?.amount}
        pdfBlobUrl={savedReceiptInfo?.pdfBlobUrl}
        onNewBill={handleReset}
      />
    </div>
  );
};

export default ReceiptVoucher;
