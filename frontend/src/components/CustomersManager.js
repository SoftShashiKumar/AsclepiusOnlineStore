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

  useEffect(() => {
    fetchCustomers();
  }, []);

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

    const payload = {
      ...formData,
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

    if (parseFloat(customerToDelete.current_dues || 0) !== 0) {
      alert(`This Customer could not be Deleted because it has a credit amount of ${customerToDelete.current_dues}`);
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
          alert("Delete Error: " + data.message);
        }
      } catch (error) {
        alert("Server error during deletion.");
      }
    }
  };

  // 🖨️ Master Print Function for Customer Register List
  const handlePrintRegister = () => {
    window.print();
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
            {/* ➕ Add New Button (Shifted before sort by) */}
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
                <option value="ds_id">DS ID</option>
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
                <option value="credit-desc">💰 Credit Balance (High to Low)</option>
                <option value="credit-asc">💰 Credit Balance (Low to High)</option>
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
                <th>ID</th>
                <th>Name</th>
                <th>Mobile 1</th>
                <th>Mobile 2</th>
                <th>DS_id</th>
                <th>Address</th>
                <th>Credit Balance</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.map((cust) => (
                <tr 
                  key={cust.id} 
                  className="clickable-row" 
                  onClick={() => handleEditCustomer(cust)}
                  title="Click to view or edit customer"
                >
                  <td><strong>{cust.id}</strong></td>
                  <td className="text-left"><strong>{cust.name}</strong></td>
                  <td>{cust.mobile || '-'}</td>
                  <td>{cust.mobile2 || '-'}</td>
                  <td>{cust.ds_id || '-'}</td>
                  <td className="text-left address-col">{cust.address || '-'}</td>
                  <td className="credit-amount">
                    {cust.current_dues > 0 ? `₹${cust.current_dues.toLocaleString('en-IN')}` : '₹0'}
                  </td>
                </tr>
              ))}
              {displayedCustomers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', color: '#aaa' }}>
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

              {/* Email and DS_id */}
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
                  <label>DS_id</label>
                  <input 
                    type="text" 
                    name="ds_id" 
                    value={formData.ds_id} 
                    onChange={handleChange} 
                    placeholder="Direct Seller ID" 
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
    </div>
  );
}

export default CustomersManager;
