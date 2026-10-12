import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { baseURL } from '../apiConfig'; // <-- Apni nayi central file se baseURL import kiya
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
        fetchCustomers(); 
      } else {
        alert("Sorry ! Kuch Problem hai: " + result.message);
      }
    } catch (err) {
      alert("Some error in connect to Backend !");
    }
  };

  const handleSearch = async (searchType) => {
    const searchInput = prompt(`Enter ${searchType === 'name' ? 'Name' : 'Mobile Number'} to search:`);
    if (!searchInput || !searchInput.trim()) return;

    const query = searchInput.trim().toLowerCase();
    const found = customersList.find(c => {
      if (searchType === 'name') {
        return c.name && c.name.toLowerCase().includes(query);
      } else {
        return (c.mobile && c.mobile.includes(query)) || (c.mobile2 && c.mobile2.includes(query));
      }
    });

    if (found) {
      setFormData({
        cname: found.name || '',
        mobile1: found.mobile || '',
        mobile2: found.mobile2 || '',
        email: found.email || '',
        ds_id: found.ds_id || '',
        address: found.address || '',
        remarks: found.remarks || ''
      });
      setCurrentCustomerId(found.id);
    } else {
      alert(`No record found.`);
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

  const getSortedCustomers = () => {
    let sorted = [...customersList];
    if (sortOption === 'id-asc') {
      sorted.sort((a, b) => a.id - b.id);
    } else if (sortOption === 'name-asc') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'credit-desc') {
      sorted.sort((a, b) => (b.current_dues || 0) - (a.current_dues || 0));
    }
    return sorted;
  };

  return (
    <div className="customer-page-container">
      {/* Upper Area: Hidden during printing */}
      <div className="no-print">
        <div className="sales-banner">Customer / Direct Seller Management</div>
        
        <div className="customer-main-box">
          <div className="info-section">
            <fieldset className="form-fieldset">
              <legend className="fieldset-legend">Information</legend>
              
              {/* ✅ ID aur Name 1 line me */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>ID</label>
                  <div className="readonly-id-box">
                    {/* {currentCustomerId ? `TIYA-CUST-${currentCustomerId}` : '(Auto Generated)'} */}
                    {currentCustomerId ? `${firmProfile.invoice_prefix || 'CUST'}-${currentCustomerId}` : '(Auto Generated)'}
                  </div>
                </div>
                <div className="form-group-row">
                  <label>Name</label>
                  <input type="text" name="cname" value={formData.cname} onChange={handleChange} placeholder="Type name" />
                </div>
              </div>

              {/* ✅ Mobile 1 aur Mobile 2 ek line me */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>Mobile 1</label>
                  <input type="text" name="mobile1" value={formData.mobile1} onChange={handleChange} placeholder="Primary mobile" />
                </div>
                <div className="form-group-row">
                  <label>Mobile 2</label>
                  <input type="text" name="mobile2" value={formData.mobile2} onChange={handleChange} placeholder="Alternative mobile" />
                </div>
              </div>

              {/* ✅ Email aur DS_id ek line me */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. customer@gmail.com" />
                </div>
                <div className="form-group-row">
                  <label>DS_id</label>
                  <input type="text" name="ds_id" value={formData.ds_id} onChange={handleChange} placeholder="Direct Seller ID" />
                </div>
              </div>

              {/* Address aur Remarks me zyada text hota hai, isliye inko alag-alag lines me hi rakhna better hai */}
              <div className="form-group-row">
                <label>Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Full address details..."></textarea>
              </div>

              <div className="form-group-row">
                <label>Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" placeholder="Any special notes..."></textarea>
              </div>
            </fieldset>
          </div>

          <div className="actions-section">
            <fieldset className="form-fieldset">
              <legend className="fieldset-legend">Commands</legend>
              <button className="btn-action btn-save" onClick={handleSave}>Save</button>
              <button className="btn-action btn-clear" onClick={handleClear} style={{backgroundColor: '#6c757d', marginBottom: '12px'}}>Clear / New</button>
              <button className="btn-action btn-delete" onClick={handleDelete}>Delete</button>
            </fieldset>
            
            <fieldset className="form-fieldset search-fieldset">
              <legend className="fieldset-legend">Search By</legend>
              <button className="btn-action btn-search" onClick={() => handleSearch('name')}>Name</button>
              <button className="btn-action btn-search" onClick={() => handleSearch('mobile')}>Mobile</button>
            </fieldset>
          </div>
        </div>
      </div>

      {/* 📜 CUSTOMERS DATABASE REGISTER LIST AREA */}
      <div className="customer-register-section printable-content">
        {/* Printable Header - visible only on A4 print paper */}
        {/* <div className="print-only-header">
          <h2>TIYA JEWELLERS</h2>
          <p>Customer Ledger Balance & Registration Report</p>
          <hr /> */}
        <div className="print-only-header">
          <h2>{firmProfile.firm_name}</h2>
          <p>{firmProfile.address_line_1}, {firmProfile.address_line_2}</p>
          <p>Customer / Direct Seller Registration Report</p>
        </div>

        <div className="register-header-bar">
          <div className="register-title">Registered Customers & Direct Sellers</div>
          
          {/* 🔥 Controls Wrapper: Iske andar mobile me sab line-wise set ho jayega */}
          <div className="db-controls-wrapper no-print">
            <div className="sort-controller-block">
              <label className="sort-label-text">Sort By: </label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="sort-dropdown-field">
                <option value="id-asc">🔢 ID (Ascending)</option>
                <option value="name-asc">🔤 Name (A - Z)</option>
                <option value="credit-desc">💰 Credit Balance (High to Low)</option>
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
              {getSortedCustomers().map((cust) => (
                <tr key={cust.id}>
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
              {getSortedCustomers().length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '30px', color: '#aaa' }}>Koi records nahi mile!</td>
                </tr>
              )}
            </tbody>
          </table>          

          {/* 👇 YEH NAYA PRINT ONLY FOOTER ADD KAREIN */}
          <div className="print-only-footer">
            <div className="print-footer-content">
              <span>📅 Report Generated On: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomersManager;