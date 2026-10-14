import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import './ItemMasterSettings.css';

const API_BASE = baseURL;

const ItemMasterSettings = () => {
    const groupOptions = [
        "Agriculture", "Apparels", "Baby Care", "Food", "Home Care", 
        "Oral Care", "Other Products", "Sniss Elite", "Sniss Fragrances", 
        "Sniss Herbal", "Spices", "Vetrinery", "Wellness", "Wellroot"
    ].sort();

    const [formData, setFormData] = useState({
        item_group: groupOptions[0],
        item_name: '',
        mrp: '',
        dp: '',
        sp: '',
        tag_text: '',
        reorder_level: 20, // Default 20 set kiya gaya hai
        remarks: ''
    });

    const [tableData, setTableData] = useState([]);

    // Navigation ke liye Refs banaye
    const groupRef = useRef(null);
    const itemNameRef = useRef(null);
    const mrpRef = useRef(null);
    const dpRef = useRef(null);
    const spRef = useRef(null);
    const tagRef = useRef(null);
    const reorderRef = useRef(null);
    const remarksRef = useRef(null);
    const saveBtnRef = useRef(null);

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/master/all/`);
            if (response.data) {
                const items = Array.isArray(response.data) ? response.data : (response.data.data || []);
                setTableData(items);
            }
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    useEffect(() => {
        fetchItems();
        // Page khulte hi Group par focus
        if (groupRef.current) {
            groupRef.current.focus();
        }
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Enter key dabne par next text box par focus shift karne ka logic
    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Default form submit rokne ke liye (jab tak last textbox par na ho)
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // 🛑 B) Client-side Duplicate Check
        const enteredItemName = formData.item_name.trim().toLowerCase();
        const enteredTag = formData.tag_text.trim().toLowerCase();

        // Check if item_name already exists
        const isDuplicateItem = tableData.find(item => item.item_name && item.item_name.toLowerCase() === enteredItemName);
        if (isDuplicateItem) {
            alert("This item is already added");
            // Focus back to item name if they want to correct it
            itemNameRef.current?.focus();
            return;
        }

        // Check if tag already exists
        const isDuplicateTag = tableData.find(item => item.tag_text && item.tag_text.toLowerCase() === enteredTag);
        if (isDuplicateTag) {
            alert("This tag name is already used, Try another Tag name");
            // Focus back to tag input
            tagRef.current?.focus();
            return;
        }

        // Agar duplicates nahi hai toh Backend me save karenge
        try {
            const response = await axios.post(`${API_BASE}/api/master/save/`, formData);
            if(response.status === 200 || response.status === 201) {
                alert("Configuration saved successfully!");
                fetchItems(); // Table refresh
                
                // Form reset karo but reorder_level wapas 20 kardo
                setFormData({
                    ...formData,
                    item_name: '',
                    mrp: '',
                    dp: '',
                    sp: '',
                    tag_text: '',
                    reorder_level: 20, 
                    remarks: ''
                });

                // Reset karne ke baad cursor wapas group/item name par le aao (Optional but good UX)
                groupRef.current?.focus();
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            const errorMsg = error.response?.data?.message || error.message || "Unknown error occurred";
            alert("Error saving configuration: " + errorMsg);
        }
    };

    const handlePrintReorder = () => {
        const reorderItems = tableData.filter(item => {
            const stock = Number(item.available_quantity) || 0;
            const limit = Number(item.reorder_level) || 0;
            return stock <= limit;
        });

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Reorder List</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    @media print {
                        @page { size: A4; margin: 15mm; }
                    }
                </style>
            </head>
            <body>
                <h2>Items Reorder List</h2>
                <div style="text-align: right; font-size: 13px; font-style: italic; margin-bottom: 8px; font-weight: bold;">
                  Report Printing Date & Time: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Group</th>
                            <th>Item Name</th>
                            <th>Tag</th>
                            <th>Current Stock</th>
                            <th>Reorder Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reorderItems.length > 0 ? reorderItems.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.item_group || '-'}</td>
                                <td>${item.item_name || '-'}</td>
                                <td>${item.tag_text || '-'}</td>
                                <td>${item.available_quantity || 0}</td>
                                <td>${item.reorder_level || 0}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="6">No items need to be reordered</td></tr>'}
                    </tbody>
                </table>
                <script>
                    window.onload = function() { 
                        window.print(); 
                        setTimeout(function(){ window.close(); }, 500); 
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="item-master-container">
            <h1 className="page-title">SHOP MASTER ITEM SETTINGS & CURRENT STOCK</h1>
            
            {/* Top Section: Configure Items Form */}
            <div className="top-section">
                <div className="configure-card">
                    <form onSubmit={handleSave}>
                        <fieldset>
                            <legend>Configure Items</legend>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Group</label>
                                    <select 
                                        className="form-control" 
                                        name="item_group" 
                                        value={formData.item_group} 
                                        onChange={handleChange}
                                        ref={groupRef}
                                        onKeyDown={(e) => handleKeyDown(e, itemNameRef)}
                                        required>
                                        {groupOptions.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Item Name</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        name="item_name" 
                                        value={formData.item_name} 
                                        onChange={handleChange} 
                                        ref={itemNameRef}
                                        onKeyDown={(e) => handleKeyDown(e, mrpRef)}
                                        placeholder="Item Name" 
                                        required />
                                </div>

                                <div className="form-group">
                                    <label>MRP</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="form-control" 
                                        name="mrp" 
                                        value={formData.mrp} 
                                        onChange={handleChange} 
                                        ref={mrpRef}
                                        onKeyDown={(e) => handleKeyDown(e, dpRef)}
                                        placeholder="0.00" />
                                </div>

                                <div className="form-group">
                                    <label>DP</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="form-control" 
                                        name="dp" 
                                        value={formData.dp} 
                                        onChange={handleChange}
                                        ref={dpRef}
                                        onKeyDown={(e) => handleKeyDown(e, spRef)}
                                        placeholder="0.00" />
                                </div>

                                <div className="form-group">
                                    <label>SP</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="form-control" 
                                        name="sp" 
                                        value={formData.sp} 
                                        onChange={handleChange} 
                                        ref={spRef}
                                        onKeyDown={(e) => handleKeyDown(e, tagRef)}
                                        placeholder="0.00" />
                                </div>

                                <div className="form-group">
                                    <label>Tag</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        name="tag_text" 
                                        value={formData.tag_text} 
                                        onChange={handleChange} 
                                        ref={tagRef}
                                        onKeyDown={(e) => handleKeyDown(e, reorderRef)}
                                        placeholder="Tag" 
                                        required />
                                </div>
                                
                                <div className="form-group">
                                    <label>Reorder Level</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        name="reorder_level" 
                                        value={formData.reorder_level} 
                                        onChange={handleChange} 
                                        ref={reorderRef}
                                        onKeyDown={(e) => handleKeyDown(e, remarksRef)}
                                        placeholder="0" />
                                </div>
                                
                                <div className="form-group">
                                    <label>Remarks</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        name="remarks" 
                                        value={formData.remarks} 
                                        onChange={handleChange} 
                                        ref={remarksRef}
                                        onKeyDown={(e) => handleKeyDown(e, saveBtnRef)}
                                        placeholder="Remarks..." />
                                </div>
                            </div>
                            
                            <div className="form-action">
                                <button 
                                    type="submit" 
                                    className="save-btn"
                                    ref={saveBtnRef}
                                >
                                    💾 SAVE CONFIGURATION
                                </button>
                            </div>
                        </fieldset>
                    </form>
                </div>
            </div>

            {/* Bottom Section: Active Items Table */}
            <div className="bottom-section">
                <div className="table-card">
                    <div className="table-header-bar">
                        <h3>Active Items Table with Current Stock</h3>
                        <div className="table-actions">
                            <button type="button" className="print-btn" onClick={handlePrintReorder}>🖨️ ReOrder List</button>
                            <button type="button" className="refresh-btn" onClick={fetchItems}>🔄 Refresh</button>
                        </div>
                    </div>
                    
                    <div className="table-responsive">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Group</th>
                                    <th>Item Name</th>
                                    <th>Tag</th>
                                    <th>MRP</th>
                                    <th>DP</th>
                                    <th>SP</th>
                                    <th>Stock</th>
                                    <th>Reorder Level</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.length > 0 ? (
                                    tableData.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.item_group || '-'}</td>
                                            <td>{item.item_name || '-'}</td>
                                            <td>{item.tag_text || '-'}</td>
                                            <td>{item.mrp || '-'}</td>
                                            <td>{item.dp || '-'}</td>
                                            <td>{item.sp ? parseFloat(item.sp).toFixed(2) : '-'}</td>
                                            <td className="text-green font-bold">{item.available_quantity || 0}</td>
                                            <td className="text-red font-bold">{item.reorder_level || 0}</td>
                                            <td>{item.remarks || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9">No Data Available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemMasterSettings;