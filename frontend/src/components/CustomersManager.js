import React, { useState, useEffect, useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { baseURL } from '../apiConfig';
import './CustomersManager.css';

function CustomersManager() {
  const { firmProfile } = useContext(FirmProfileContext);
  const [formData, setFormData] = useState({
    cname: '',
    mobile1: '',
    mobile2: '',
    email: '',
    ds_id: '',
    address: '',
    remarks: ''
  });

  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  const [customersList, setCustomersList] = useState([]); 
  const [sortOption, setSortOption] = useState('id-asc'); 

  // 📦 Customer Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔍 Search States for Registered Customers Strip
  const [searchField, setSearchField] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 📖 Customer Ledger Modal States
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Track body class when ledger modal is open to ensure clean white printing
  useEffect(() => {
    if (isLedgerOpen) {
      document.body.classList.add('ledger-view-open');
    } else {
      document.body.classList.remove('ledger-view-open');
    }
    return () => {
      document.body.classList.remove('ledger-view-open');
    };
  }, [isLedgerOpen]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${baseURL}/api/get_customers/`);
      const result = await response.json();
      if (result.success === true) {
        setCustomersList(result.customers);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    handleClear();
    setIsModalOpen(true);
  };

  const handleEditCustomer = (cust) => {
    setFormData({
      cname: cust.name || '',
      mobile1: cust.mobile || '',
      mobile2: cust.mobile2 || '',
      email: cust.email || '',
      ds_id: cust.ds_id || '',
      address: cust.address || '',
      remarks: cust.remarks || ''
    });
    setCurrentCustomerId(cust.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.cname.trim()) {
      alert("Name dalna zaroori hai!");
      return;
    }

    const formattedCName = formData.cname
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const payload = {
      ...formData,
      cname: formattedCName,
      id: currentCustomerId
    };

    try {      
      const response = await fetch(`${baseURL}/api/customers/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success === true) {
        alert(result.message);
        handleClear();
        setIsModalOpen(false); // Close popup on save
        fetchCustomers(); 
      } else {
        alert("Sorry ! Kuch Problem hai: " + result.message);
      }
    } catch (err) {
      alert("Some error in connect to Backend !");
    }
  };

  const handleClear = () => {
    setFormData({ cname: '', mobile1: '', mobile2: '', email: '', ds_id: '', address: '', remarks: '' });
    setCurrentCustomerId(null);
  };

  const handleDelete = async () => {
    if (!currentCustomerId) {
      alert("Pehle koi Customer select kijiye jise delete karna hai.");
      return;
    }

    const customerToDelete = customersList.find(c => c.id === currentCustomerId);
    if (!customerToDelete) return;

    // 🔒 Credit balance validation check
    if (parseFloat(customerToDelete.current_dues || 0) !== 0) {
      alert("Inka credit clear nahi hai, isliye inka details delete nahi kiya ja sakta hai.");
      return;
    }

    if (window.confirm(`Kya aap sach me customer '${customerToDelete.name}' ko delete karna chahte hain?`)) {
      try {
        const response = await fetch(`${baseURL}/api/customers/delete/${currentCustomerId}/`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          alert("Customer successfully delete ho gaya!");
          handleClear();
          setIsModalOpen(false);
          fetchCustomers();
        } else {
          alert(data.message || "Delete Error: Record delete nahi ho paya.");
        }
      } catch (error) {
        alert("Server error during deletion.");
      }
    }
  };

  // 🖨️ Master Print Function for Customer Register List
  const handlePrintRegister = () => {
    document.body.classList.remove('printing-ledger');
    window.print();
  };

  // 📖 Customer Ledger Functions
  const handleOpenLedger = async (cust) => {
    setSelectedLedgerCustomer(cust);
    setIsLedgerOpen(true);
    setLoadingLedger(true);
    setLedgerData(null);

    try {
      const response = await fetch(`${baseURL}/api/customers/ledger/${cust.id}/`);
      const result = await response.json();
      if (result.success) {
        setLedgerData(result);
      } else {
        alert("Ledger data nahi mil paya: " + (result.message || "Error"));
      }
    } catch (err) {
      console.error("Error loading ledger:", err);
      alert("Server error while fetching ledger details.");
    } finally {
      setLoadingLedger(false);
    }
  };

  const handlePrintLedger = () => {
    document.body.classList.add('printing-ledger');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-ledger');
    }, 1000);
  };

  // 🔍 Filter & Sort Customers List
  const getFilteredAndSortedCustomers = () => {
    let list = [...customersList];

    // Search Filtering
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const mobile1 = (c.mobile || '').toLowerCase();
        const mobile2 = (c.mobile2 || '').toLowerCase();
        const ds_id = (c.ds_id || '').toLowerCase();
        const address = (c.address || '').toLowerCase();
        const idStr = String(c.id || '');

        if (searchField === 'name') return name.includes(q);
        if (searchField === 'mobile') return mobile1.includes(q) || mobile2.includes(q);
        if (searchField === 'ds_id') return ds_id.includes(q);
        if (searchField === 'address') return address.includes(q);
        if (searchField === 'id') return idStr.includes(q);

        // 'all' fields
        return name.includes(q) || mobile1.includes(q) || mobile2.includes(q) || ds_id.includes(q) || address.includes(q) || idStr.includes(q);
      });
    }

    // Sorting
    if (sortOption === 'id-asc') {
      list.sort((a, b) => a.id - b.id);
    } else if (sortOption === 'id-desc') {
      list.sort((a, b) => b.id - a.id);
    } else if (sortOption === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'name-desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortOption === 'credit-desc') {
      list.sort((a, b) => (parseFloat(b.current_dues) || 0) - (parseFloat(a.current_dues) || 0));
    } else if (sortOption === 'credit-asc') {
      list.sort((a, b) => (parseFloat(a.current_dues) || 0) - (parseFloat(b.current_dues) || 0));
    }

    return list;
  };

  const displayedCustomers = getFilteredAndSortedCustomers();

  // 🧮 Helper functions to format Paid and Due columns with breakdown details
  const getPaidInfo = (tx) => {
    if (tx.type === 'Receipt') {
      const amt = parseFloat(tx.received_amount) || 0;
      if (amt <= 0) return { amt: 0, display: '-' };
      const mode = tx.payment_mode || 'Cash';
      return {
        amt: amt,
        display: `₹${amt.toLocaleString('en-IN')}`,
        detail: `(${mode})`
      };
    }

    // Sale
    const cash = parseFloat(tx.cash) || 0;
    const upi = parseFloat(tx.upi) || 0;
    const totalPaid = cash + upi;

    if (totalPaid <= 0) {
      return { amt: 0, display: '-' };
    }

    let detailStr = '';
    if (cash > 0 && upi > 0) {
      detailStr = `(Cash: ₹${cash.toLocaleString('en-IN')}, UPI: ₹${upi.toLocaleString('en-IN')})`;
    } else if (cash > 0) {
      detailStr = `(Cash: ₹${cash.toLocaleString('en-IN')})`;
    } else if (upi > 0) {
      detailStr = `(UPI: ₹${upi.toLocaleString('en-IN')})`;
    }

    return {
      amt: totalPaid,
      display: `₹${totalPaid.toLocaleString('en-IN')}`,
      detail: detailStr
    };
  };

  const getDueInfo = (tx) => {
    if (tx.type === 'Receipt') {
      return { amt: 0, display: '-' };
    }

    // Sale
    const credit = parseFloat(tx.credit_added !== undefined ? tx.credit_added : tx.credit) || 0;
    if (credit <= 0) {
      return { amt: 0, display: '-' };
    }

    return {
      amt: credit,
      display: `₹${credit.toLocaleString('en-IN')}`,
      detail: `(Credit: ₹${credit.toLocaleString('en-IN')})`
    };
  };

  // Calculate Grand Totals and Net Balance
  const transactions = ledgerData?.transactions || [];

  let grandTotalBill = 0;
  let grandTotalTSP = 0;
  let grandTotalPaid = 0;
  let grandTotalDue = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'Sale') {
      grandTotalBill += parseFloat(tx.total_amount) || 0;
      grandTotalTSP += parseFloat(tx.tsp) || 0;
      const cash = parseFloat(tx.cash) || 0;
      const upi = parseFloat(tx.upi) || 0;
      grandTotalPaid += (cash + upi);
      const credit = parseFloat(tx.credit_added !== undefined ? tx.credit_added : tx.credit) || 0;
      grandTotalDue += credit;
    } else if (tx.type === 'Receipt') {
      const rcv = parseFloat(tx.received_amount) || 0;
      grandTotalPaid += rcv;
      if (tx.tsp) grandTotalTSP += parseFloat(tx.tsp) || 0;
    }
  });

  // NET Balance: Total Bills - Total Paid (or Total Due - Total Receipts)
  const netBalance = grandTotalBill - grandTotalPaid;

  return (
    <div className="customer-page-container">
      {/* Upper Area: Hidden during printing */}
      <div className="no-print">
        <div className="sales-banner">Customer / Direct Seller Management</div>
      </div>

      {/* 📜 CUSTOMERS DATABASE REGISTER LIST AREA */}
      <div className="customer-register-section printable-content">
        {/* Printable Header - visible only on A4 print paper */}
        <div className="print-only-header">
          <h2>{firmProfile?.firm_name}</h2>
          <p>{firmProfile?.address_line_1}, {firmProfile?.address_line_2}</p>
          <p>Customer / Direct Seller Registration Report</p>
        </div>

        <div className="register-header-bar">
          <div className="register-title">Registered Customers & Direct Sellers</div>
          
          {/* Controls Wrapper on Registered Customers Strip */}
          <div className="db-controls-wrapper no-print">
            {/* ➕ Add New Button */}
            <button 
              type="button" 
              className="btn-add-customer" 
              onClick={handleOpenAddModal}
              title="Add New Customer"
            >
              ➕ Add New
            </button>

            {/* 🔍 Pehla Box: Kis field me search karna hai */}
            <div className="search-field-block">
              <select 
                value={searchField} 
                onChange={(e) => setSearchField(e.target.value)} 
                className="search-field-select"
                title="Select search field"
              >
                <option value="all">🔍 Search In: All Fields</option>
                <option value="name">Customer Name</option>
                <option value="mobile">Mobile Number</option>
                <option value="ds_id">DS Code</option>
                <option value="address">Address</option>
                <option value="id">Customer ID</option>
              </select>
            </div>

            {/* 🔍 Dusra Box: Kya dhundna hai */}
            <div className="search-input-wrapper">
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Type to search..." 
                className="search-query-input" 
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn" 
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 🔀 Sort Controller */}
            <div className="sort-controller-block">
              <label className="sort-label-text">Sort By: </label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="sort-dropdown-field">
                <option value="id-asc">🔢 ID (Ascending)</option>
                <option value="id-desc">🔢 ID (Descending)</option>
                <option value="name-asc">🔤 Name (A - Z)</option>
                <option value="name-desc">🔤 Name (Z - A)</option>
                <option value="credit-desc">💰 Balance (High to Low)</option>
                <option value="credit-asc">💰 Balance (Low to High)</option>
              </select>
            </div>
            
            <button className="btn-print-register-mobile" onClick={handlePrintRegister}>
              🖨️ Print List
            </button>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="customer-data-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Sl No.</th>
                <th>Name</th>
                <th>Mobile 1</th>
                <th>Mobile 2</th>
                <th>DS Code</th>
                <th>Address</th>
                <th style={{ textAlign: 'center' }}>Balance</th>
                <th className="no-print" style={{ width: '85px', textAlign: 'center' }}>Ledger</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.map((cust, index) => {
                const duesVal = parseFloat(cust.current_dues) || 0;
                const advSpVal = parseFloat(cust.advanced_sp) || 0;
                const isCreditDue = duesVal > 0;

                return (
                  <tr 
                    key={cust.id} 
                    className="clickable-row" 
                    onClick={() => handleEditCustomer(cust)}
                    title="Click to view or edit customer"
                  >
                    <td className="text-center"><strong>{index + 1}</strong></td>
                    <td className="text-left"><strong>{cust.name}</strong></td>
                    <td>{cust.mobile || '-'}</td>
                    <td>{cust.mobile2 || '-'}</td>
                    <td>{cust.ds_id || '-'}</td>
                    <td className="text-left address-col">{cust.address || '-'}</td>
                    <td className="text-center balance-cell">
                      <span 
                        style={{ 
                          color: isCreditDue ? '#ff4d4f' : '#28a745', 
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        ₹{Math.abs(duesVal).toLocaleString('en-IN')}
                      </span>
                      {advSpVal > 0 ? (
                        <div 
                          style={{ 
                            color: '#28a745', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            marginTop: '2px' 
                          }}
                        >
                          (Adv. SP: {advSpVal % 1 === 0 ? advSpVal : advSpVal.toFixed(2)})
                        </div>
                      ) : (duesVal < 0 ? (
                        <div 
                          style={{ 
                            color: '#28a745', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            marginTop: '2px' 
                          }}
                        >
                          (Advance)
                        </div>
                      ) : null)}
                    </td>
                    <td className="no-print text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button" 
                        className="btn-ledger-action" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLedger(cust);
                        }}
                        title={`View Ledger statement for ${cust.name}`}
                      >
                        📖 Ledger
                    </button>
                  </td>
                </tr>
              );
            })}
              {displayedCustomers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', color: '#aaa', textAlign: 'center' }}>
                    {searchQuery ? `No customer found matching "${searchQuery}"` : 'Koi records nahi mile!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>          

          <div className="print-only-footer">
            <div className="print-footer-content">
              <span>📅 Report Generated On: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>              
            </div>
          </div>
        </div>
      </div>

      {/* 📦 CUSTOMER POPUP MODAL (Add New / Edit Customer) */}
      {isModalOpen && (
        <div className="customer-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="customer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="customer-modal-header">
              <h3>{currentCustomerId ? '✏️ Edit Customer / Direct Seller' : '➕ Add New Customer / Direct Seller'}</h3>
              <button 
                type="button" 
                className="customer-modal-close-btn" 
                onClick={() => setIsModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="customer-modal-body">
              {/* ID and Name */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>ID</label>
                  <div className="readonly-id-box">
                    {currentCustomerId ? `${firmProfile?.invoice_prefix || 'CUST'}-${currentCustomerId}` : '(Auto Generated)'}
                  </div>
                </div>
                <div className="form-group-row">
                  <label>Name</label>
                  <input 
                    type="text" 
                    name="cname" 
                    value={formData.cname} 
                    onChange={handleChange} 
                    placeholder="Type customer name" 
                    autoFocus 
                  />
                </div>
              </div>

              {/* Mobile 1 and Mobile 2 */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>Mobile 1</label>
                  <input 
                    type="text" 
                    name="mobile1" 
                    value={formData.mobile1} 
                    onChange={handleChange} 
                    placeholder="Primary mobile" 
                  />
                </div>
                <div className="form-group-row">
                  <label>Mobile 2</label>
                  <input 
                    type="text" 
                    name="mobile2" 
                    value={formData.mobile2} 
                    onChange={handleChange} 
                    placeholder="Alternative mobile" 
                  />
                </div>
              </div>

              {/* Email and DS Code */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="e.g. customer@gmail.com" 
                  />
                </div>
                <div className="form-group-row">
                  <label>DS Code</label>
                  <input 
                    type="text" 
                    name="ds_id" 
                    value={formData.ds_id} 
                    onChange={handleChange} 
                    placeholder="Direct Seller Code" 
                  />
                </div>
              </div>

              {/* Address */}
              <div className="form-group-row">
                <label>Address</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  rows="2" 
                  placeholder="Full address details..."
                />
              </div>

              {/* Remarks */}
              <div className="form-group-row">
                <label>Remarks</label>
                <textarea 
                  name="remarks" 
                  value={formData.remarks} 
                  onChange={handleChange} 
                  rows="2" 
                  placeholder="Any special notes..."
                />
              </div>
            </div>

            {/* Modal Actions Footer: Save, Clear / New, Delete, Close */}
            <div className="customer-modal-footer">
              <button type="button" className="btn-modal-action btn-modal-save" onClick={handleSave}>
                💾 Save
              </button>
              <button type="button" className="btn-modal-action btn-modal-clear" onClick={handleClear}>
                🔄 Clear / New
              </button>
              {currentCustomerId && (
                <button type="button" className="btn-modal-action btn-modal-delete" onClick={handleDelete}>
                  🗑️ Delete
                </button>
              )}
              <button type="button" className="btn-modal-action btn-modal-cancel" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📖 CUSTOMER LEDGER / STATEMENT MODAL */}
      {isLedgerOpen && (
        <div className="customer-ledger-modal-overlay" onClick={() => setIsLedgerOpen(false)}>
          <div className="customer-ledger-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Top Bar for Modal Actions (hidden in print) */}
            <div className="ledger-modal-topbar no-print">
              <div className="ledger-topbar-title">
                <span>📖 Customer Ledger & Statement of Account</span>
              </div>
              <div className="ledger-topbar-actions">
                <button 
                  type="button" 
                  className="btn-print-ledger" 
                  onClick={handlePrintLedger}
                  title="Print Ledger Report"
                >
                  🖨️ Print Ledger
                </button>
                <button 
                  type="button" 
                  className="btn-close-ledger" 
                  onClick={() => setIsLedgerOpen(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingLedger ? (
              <div className="ledger-loading-spinner">
                <p>⏳ Loading customer ledger details...</p>
              </div>
            ) : (
              <div className="ledger-printable-content">
                {/* 🏢 Firm Details Header */}
                <div className="ledger-print-firm-header">
                  <h1 className="ledger-firm-name">{firmProfile?.firm_name || 'Asclepius Wellness'}</h1>
                  <p className="ledger-firm-address">
                    {[firmProfile?.address_line_1, firmProfile?.address_line_2, firmProfile?.city, firmProfile?.state].filter(Boolean).join(', ')}
                  </p>
                  {firmProfile?.mobile_1 && (
                    <p className="ledger-firm-contact">
                      Mob: {firmProfile.mobile_1} {firmProfile?.email ? ` | Email: ${firmProfile.email}` : ''}
                    </p>
                  )}
                  <div className="ledger-statement-title-strip">
                    CUSTOMER STATEMENT OF ACCOUNT / LEDGER
                  </div>
                </div>

                {/* 👤 Customer & Statement Metadata */}
                <div className="ledger-info-grid">
                  <div className="ledger-info-col">
                    <p><strong>Customer Name:</strong> {ledgerData?.customer_info?.name || selectedLedgerCustomer?.name}</p>
                    <p><strong>DS Code:</strong> {ledgerData?.customer_info?.ds_code || selectedLedgerCustomer?.ds_id || '-'}</p>
                    <p><strong>Address:</strong> {ledgerData?.customer_info?.address || selectedLedgerCustomer?.address || '-'}</p>
                  </div>
                  <div className="ledger-info-col text-right">
                    <p><strong>Customer ID:</strong> CUST-{selectedLedgerCustomer?.id}</p>
                    <p><strong>Primary Mobile:</strong> {ledgerData?.customer_info?.mobile1 || selectedLedgerCustomer?.mobile || '-'}</p>
                    <p><strong>Statement Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* 📜 Detailed Date-Wise Transactions Table (Particulars removed, TSP followed by Paid and Due) */}
                <div className="ledger-table-wrapper">
                  <table className="ledger-report-table">
                    <thead>
                      <tr>
                        <th style={{ width: '5%' }} className="text-center">Sl</th>
                        <th style={{ width: '13%' }} className="text-center">Date</th>
                        <th style={{ width: '10%' }} className="text-center">Type</th>
                        <th style={{ width: '14%' }} className="text-center">Voucher / Bill</th>
                        <th style={{ width: '14%' }} className="text-right">Bill Total (₹)</th>
                        <th style={{ width: '8%' }} className="text-center">TSP</th>
                        <th style={{ width: '18%' }} className="text-right">Paid</th>
                        <th style={{ width: '18%' }} className="text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((tx, idx) => {
                          const paidInfo = getPaidInfo(tx);
                          const dueInfo = getDueInfo(tx);

                          return (
                            <tr key={idx} className={tx.type === 'Sale' ? 'ledger-row-sale' : 'ledger-row-receipt'}>
                              <td className="text-center">{idx + 1}</td>
                              <td className="text-center"><strong>{tx.display_date || tx.date}</strong></td>
                              <td className="text-center">
                                <span className={`ledger-type-badge ${tx.type === 'Sale' ? 'badge-sale' : 'badge-receipt'}`}>
                                  {tx.type === 'Sale' ? '🏷️ Sale' : '💳 Receipt'}
                                </span>
                              </td>
                              <td className="text-center"><strong>{tx.doc_no}</strong></td>
                              <td className="text-right">
                                {tx.type === 'Sale' && tx.total_amount > 0 ? `₹${tx.total_amount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="text-center">
                                {tx.tsp && parseFloat(tx.tsp) > 0 ? (
                                  <div>
                                    <strong>{tx.tsp}</strong>
                                    {tx.tsp_status && (
                                      <div style={{ fontSize: '10.5px', color: '#111', fontWeight: 'bold', marginTop: '1px', background: 'none', backgroundColor: 'transparent' }}>
                                        ({tx.tsp_status})
                                      </div>
                                    )}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="text-right">
                                {paidInfo.display !== '-' ? (
                                  <div className="amt-cell-wrapper">
                                    <span className="amt-val text-paid">{paidInfo.display}</span>
                                    {paidInfo.detail && <span className="amt-detail text-paid-detail"> {paidInfo.detail}</span>}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="text-right">
                                {dueInfo.display !== '-' ? (
                                  <div className="amt-cell-wrapper">
                                    <span className="amt-val text-due">{dueInfo.display}</span>
                                    {dueInfo.detail && <span className="amt-detail text-due-detail"> {dueInfo.detail}</span>}
                                  </div>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center no-records-td">
                            Is customer ka koi sales ya receipt transaction record nahi mila.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {transactions.length > 0 && (
                      <tfoot>
                        <tr className="ledger-totals-row">
                          <td colSpan="4" className="text-left net-balance-td">
                            <div className="net-balance-strip">
                              <span className="net-label">NET Balance: </span>
                              {netBalance > 0 ? (
                                <span className="net-val net-due-red">
                                  ₹{netBalance.toLocaleString('en-IN')} (Due)
                                </span>
                              ) : netBalance < 0 ? (
                                <span className="net-val net-advanced-green">
                                  ₹{Math.abs(netBalance).toLocaleString('en-IN')} (Advanced)
                                  {ledgerData?.customer_info?.advanced_sp > 0 && ` (Adv. SP: ${ledgerData.customer_info.advanced_sp})`}
                                </span>
                              ) : (
                                <span className="net-val net-advanced-green">
                                  ₹0 (All Clear)
                                  {ledgerData?.customer_info?.advanced_sp > 0 && ` (Adv. SP: ${ledgerData.customer_info.advanced_sp})`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right">
                            <strong>₹{grandTotalBill.toLocaleString('en-IN')}</strong>
                          </td>
                          <td className="text-center">
                            <strong>{grandTotalTSP.toLocaleString('en-IN')}</strong>
                          </td>
                          <td className="text-right">
                            <strong>₹{grandTotalPaid.toLocaleString('en-IN')}</strong>
                          </td>
                          <td className="text-right">
                            <strong>₹{grandTotalDue.toLocaleString('en-IN')}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* ✍️ Signature Blocks & Print Verification */}
                <div className="ledger-statement-footer">
                  <div className="sig-block">
                    <div className="sig-line"></div>
                    <span>Customer Signature</span>
                  </div>
                  <div className="sig-block text-right">
                    <div className="sig-line"></div>
                    <span>Authorised Signatory ({firmProfile?.firm_name || 'Asclepius Wellness'})</span>
                  </div>
                </div>

                <div className="ledger-print-timestamp">
                  Computer-generated statement printed on {new Date().toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersManager;
