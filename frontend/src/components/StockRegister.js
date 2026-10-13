import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { baseURL } from '../apiConfig';
import axios from 'axios';
import './StockRegister.css'; 

const StockRegister = () => {
  const { firmProfile } = useContext(FirmProfileContext);
  
  // Search Fields
  const [tag, setTag] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [item, setItem] = useState('');
  
  // Data States
  const [stockData, setStockData] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dropdown Options
  const [masterTags, setMasterTags] = useState([]);
  const [masterGroups, setMasterGroups] = useState([]);
  const [masterItems, setMasterItems] = useState([]);

  // Fetch initial master data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/master/all/`);
        if (response.data) {
          const items = Array.isArray(response.data) ? response.data : (response.data.data || []);
          
          window.masterCatalog = items;

          const uniqueTags = [...new Set(items.map(m => m.tag_text).filter(Boolean))].sort();
          const uniqueGroups = [...new Set(items.map(m => m.item_group).filter(Boolean))].sort();
          const uniqueItems = [...new Set(items.map(m => m.item_name).filter(Boolean))].sort();
          
          setMasterTags(uniqueTags);
          setMasterGroups(uniqueGroups);
          setMasterItems(uniqueItems);
        }
      } catch (error) {
        console.error("Master Table fetch error:", error);
      }
    };
    loadInitialData();
    fetchStockReport('', '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers for detailed search
  const handleTagChange = (e) => {
    const selectedTag = e.target.value;
    setTag(selectedTag);

    if (window.masterCatalog && selectedTag) {
      const matchedItem = window.masterCatalog.find(m => m.tag_text === selectedTag);
      if (matchedItem) {
        setItemGroup(matchedItem.item_group || '');
        setItem(matchedItem.item_name || '');
        
        // Ensure the items dropdown allows the newly set item
        const uniqueItems = [...new Set(window.masterCatalog.filter(m => m.item_group === matchedItem.item_group).map(m => m.item_name).filter(Boolean))].sort();
        setMasterItems(uniqueItems);
      }
    } else if (selectedTag === '') {
      setItemGroup('');
      setItem('');
      if (window.masterCatalog) {
         const uniqueItems = [...new Set(window.masterCatalog.map(m => m.item_name).filter(Boolean))].sort();
         setMasterItems(uniqueItems);
      }
    }
  };

  const handleGroupChange = (e) => {
    const selectedGroup = e.target.value;
    setItemGroup(selectedGroup);
    setItem(''); // Reset item
    setTag(''); // Reset tag when group changes manually
    
    if (window.masterCatalog) {
      if (selectedGroup === '') {
        const uniqueItems = [...new Set(window.masterCatalog.map(m => m.item_name).filter(Boolean))].sort();
        setMasterItems(uniqueItems);
      } else {
        const uniqueItems = [...new Set(window.masterCatalog.filter(m => m.item_group === selectedGroup).map(m => m.item_name).filter(Boolean))].sort();
        setMasterItems(uniqueItems);
      }
    }
  };

  const handleItemChange = (e) => {
    const selectedItem = e.target.value;
    setItem(selectedItem);

    if (window.masterCatalog && selectedItem) {
      // Find the first tag associated with this Item Name (and Group if selected)
      const matchedItem = window.masterCatalog.find(m => 
        m.item_name === selectedItem && 
        (itemGroup === '' || m.item_group === itemGroup)
      );
      
      if (matchedItem) {
        setTag(matchedItem.tag_text || '');
        if (itemGroup === '') {
          setItemGroup(matchedItem.item_group || '');
          // Update item list based on new group
          const uniqueItems = [...new Set(window.masterCatalog.filter(m => m.item_group === matchedItem.item_group).map(m => m.item_name).filter(Boolean))].sort();
          setMasterItems(uniqueItems);
        }
      }
    } else if (selectedItem === '') {
      setTag('');
    }
  };

  // 🚀 MAIN FETCH LOGIC
  const fetchStockReport = async (customTag = tag, customGroup = itemGroup, customItem = item) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseURL}/api/stock-report/?tag=${customTag || 'all'}&group=${customGroup || 'all'}&item=${customItem || 'all'}`
      );
      const result = await response.json();
      
      if (result.success === true) {
        setStockData(result.data);
        setShowReport(true);
      } else {
        alert("Error: " + result.message);
      }
    } catch (err) {
      alert("Server connection Error !");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 QUICK SEARCH LOGIC (Groups)
  const handleQuickSearch = (groupName) => {
    setTag('');
    setItemGroup(groupName);
    setItem('');
    
    if (window.masterCatalog) {
      const uniqueItems = [...new Set(window.masterCatalog.filter(m => m.item_group === groupName).map(m => m.item_name).filter(Boolean))].sort();
      setMasterItems(uniqueItems);
    }

    fetchStockReport('', groupName, ''); 
  };

  const quickSearchGroups = [
    "Agriculture", "Apparels", "Baby Care", "Food", "Home Care", 
    "Oral Care", "Other Products", "Sniss Elite", "Sniss Fragrances", 
    "Sniss Herbal", "Spices", "Vetrinery", "Wellness", "Wellroot"
  ];

  return (
    <div className="register-container">
      <div className="tagstock-branding-header">
        <h2>Stock Register</h2>
      </div>
      
      <div className="tagstock-main-card">
        
        {/* 1. DETAILED SEARCH */}
        <fieldset className="tagstock-fieldset">
          <legend>Detailed Search</legend>
          <div className="tagstock-search-grid">
            
            <div className="tagstock-input-box">
              <label>Tag</label>
              <select value={tag} onChange={handleTagChange}>
                <option value="">All Tags</option>
                {masterTags.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="tagstock-input-box">
              <label>Group</label>
              <select value={itemGroup} onChange={handleGroupChange}>
                <option value="">All Groups</option>
                {masterGroups.map((g, idx) => (
                  <option key={idx} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="tagstock-input-box">
              <label>Item Name</label>
              <select value={item} onChange={handleItemChange}>
                <option value="">All Items</option>
                {masterItems.map((i, idx) => (
                  <option key={idx} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div className="tagstock-input-box tagstock-btn-wrapper">
              <button className="btn-show" onClick={() => fetchStockReport()}>
                Show Report
              </button>
            </div>

          </div>
        </fieldset>

        {/* 2. QUICK SEARCH */}
        <fieldset className="tagstock-fieldset">
          <legend>Quick Search (By Group)</legend>
          <div className="tagstock-quick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {quickSearchGroups.map((groupName, index) => (
              <button 
                key={index}
                onClick={() => handleQuickSearch(groupName)}
                style={{ backgroundColor: '#06b6d4', color: '#fff' }}
                className="btn-quick-touch"
              >
                {groupName}
              </button>
            ))}
          </div>
        </fieldset>

      </div>

      {loading && <p className="tagstock-loader-text">Stock data load ho raha hai...</p>}

      {showReport && !loading && (
        <div className="print-actions no-print">
          <button className="btn-print" onClick={window.print}>🖨️ Print / Save as PDF</button>
        </div>
      )}

      {/* --- REPORT SHEET (A4 PDF VIEW) --- */}
      {showReport && !loading && (
        <div className="report-paper-view-wrapper">
          <div className="report-paper-view">
            <div className="a4-print-sheet">
             <table className="print-report-header" style={{ width: '100%', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '8px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '20%', verticalAlign: 'middle' }}>
                    <div style={{ width: '50px', height: '50px', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      {firmProfile?.invoice_prefix || 'SW'}
                    </div>
                  </td>
                  <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'middle' }}>
                    <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '800' }}>{firmProfile?.firm_name || 'Shree Wellness Centre'}</h1>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#444' }}>{firmProfile?.address_line_1 || 'Authorized C&F Asclepius wellness Pvt. Ltd., Sudama Tara Kunj, Bharat Mata Chowk, Bargachh'}, {firmProfile?.address_line_2 || 'Bari khanjarur - 1'}</p>
                  </td>
                  <td style={{ width: '20%', textAlign: 'right', verticalAlign: 'middle' }}>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700' }}>Stock Register</h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px' }}>Group: {itemGroup || 'All'} | Item: {item || 'All'} | Tag: {tag || 'All'}</p>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: 'right', fontSize: '13px', fontStyle: 'italic', marginBottom: '8px', fontWeight: 'bold' }}>
              Report Printing Date & Time: {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>

              <table className="register-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>Sl no.</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Tag ID</th>
                    <th style={{ width: '32%', textAlign: 'center' }}>Item Name</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Group</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>MRP</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>DP</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>SP</th>
                    <th style={{ width: '6%', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Koi stock data nahi mila</td>
                    </tr>
                  ) : (
                    stockData.map((row, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: 'bold' }}>{row.tagId}</td>
                        <td style={{ textAlign: 'left' }}>{row.itemName}</td>
                        <td>{row.group}</td>
                        <td style={{ textAlign: 'right' }}>₹{row.mrp}</td>
                        <td style={{ textAlign: 'right' }}>₹{row.dp}</td>
                        <td style={{ textAlign: 'right' }}>{row.sp ? parseFloat(row.sp).toFixed(2) : '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: row.available_quantity === 0 ? '#ef4444' : '#10b981' }}>
                          {row.available_quantity}
                        </td>
                        <td style={{ textAlign: 'left' }}>{row.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockRegister;