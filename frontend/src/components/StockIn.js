import React, { useState, useEffect } from 'react';
import { baseURL } from '../apiConfig';
import './StockIn.css';
import axios from 'axios';

const StockIn = () => {    
    const [formData, setFormData] = useState({
        purchaseBillNo: '',
        tagText: '',
        itemGroup: '',
        itemName: '',
        mrp: '',
        dp: '',
        sp: '',
        quantity: 10,
        remarks: ''
    });

    const [itemsList, setItemsList] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isDBRecord, setIsDBRecord] = useState(false); 
    const [masterItems, setMasterItems] = useState([]);

    // Derived distinct lists from masterItems
    const [tagOptions, setTagOptions] = useState([]);
    const [groupOptions, setGroupOptions] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);

    // Fetch master items exactly like we did in ItemMasterSettings
    const fetchMasterItems = async () => {
        try {
            const response = await axios.get(`${baseURL}/api/master/all/`);
            if (response.data) {
                const items = Array.isArray(response.data) ? response.data : (response.data.data || []);
                setMasterItems(items);
                
                // Extract unique values
                const uniqueTags = [...new Set(items.map(m => m.tag_text).filter(Boolean))].sort();
                const uniqueGroups = [...new Set(items.map(m => m.item_group).filter(Boolean))].sort();
                
                setTagOptions(uniqueTags);
                setGroupOptions(uniqueGroups);
            }
        } catch (error) {
            console.error("Error fetching master items:", error);
        }
    };

    useEffect(() => {
        fetchMasterItems();
    }, []);

    // Helper: auto fill details from master item
    const autoFillFromMaster = (masterItem) => {
        setFormData(prev => ({
            ...prev,
            tagText: masterItem.tag_text || '',
            itemGroup: masterItem.item_group || '',
            itemName: masterItem.item_name || '',
            mrp: masterItem.mrp || '',
            dp: masterItem.dp || '',
            sp: masterItem.sp || '',
            // Do not autofill Remarks or Quantity as they are transaction specific, but user asked for remarks
            remarks: masterItem.remarks || prev.remarks
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'tagText') {
            const selectedMaster = masterItems.find(m => m.tag_text === value);
            if (selectedMaster) {
                autoFillFromMaster(selectedMaster);
                // Also update itemOptions based on this group
                const namesForGroup = masterItems.filter(m => m.item_group === selectedMaster.item_group).map(m => m.item_name);
                setItemOptions([...new Set(namesForGroup)].sort());
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else if (name === 'itemGroup') {
            const namesForGroup = masterItems.filter(m => m.item_group === value).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
            setFormData(prev => ({ ...prev, itemGroup: value, itemName: '', tagText: '' }));
        } else if (name === 'itemName') {
            // Find specific master item using Group + Item Name
            const selectedMaster = masterItems.find(m => m.item_group === formData.itemGroup && m.item_name === value);
            if (selectedMaster) {
                autoFillFromMaster(selectedMaster);
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSearch = async () => {
        if (!formData.tagText) {
            alert("Pehle Search karne ke liye Tag ID (TagText) chune ya likhein!");
            return;
        }

        // Search local grid first
        const localItem = itemsList.find(item => item.tagText === formData.tagText);
        if (localItem) {
            setFormData(localItem);
            setIsEditing(true);
            setIsDBRecord(false);
            return;
        }

        // Search database
        try {
            const response = await fetch(`${baseURL}/api/get_stock_by_tag/?tag=${formData.tagText}`);
            const data = await response.json();
            
            if (data.status === 'sold_error') {
                alert(data.message);
                setIsEditing(false);
                setIsDBRecord(false);
                return;
            }

            if (data.status === 'success') {
                const fetchedData = {
                    purchaseBillNo: data.purchaseBillNo || '',
                    itemGroup: data.itemGroup || '',
                    itemName: data.itemName || '',
                    tagText: formData.tagText,                
                    quantity: data.quantity || 10,
                    remarks: data.remarks || '',
                    // Get MRP/DP/SP from MasterItems because stock transaction might not have it
                };

                const masterMatch = masterItems.find(m => m.tag_text === formData.tagText);
                if (masterMatch) {
                    fetchedData.mrp = masterMatch.mrp || '';
                    fetchedData.dp = masterMatch.dp || '';
                    fetchedData.sp = masterMatch.sp || '';
                }

                setFormData(fetchedData);
                setIsEditing(true);
                setIsDBRecord(true); 
                // alert("Database se Tag ki purani entry mil gayi!");
            } else {
                alert(data.message || "Yeh Tag ID ki purchase entry nahi mili!");
                setIsEditing(false);
                setIsDBRecord(false);
            }
        } catch (error) {
            alert("Backend server connection Error!");
        }
    };

    const handleAddOrUpdateItem = async () => {
        if (!formData.tagText || !formData.itemName || !formData.quantity) {
            alert("Tag ID, Item Name aur Quantity zaroor bharein!");
            return;
        }

        if (isDBRecord) {
            try {
                const response = await fetch(`${baseURL}/api/update_single_stock/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert(result.message);
                    setFormData({
                        purchaseBillNo: formData.purchaseBillNo,
                        tagText: '',
                        itemGroup: '',
                        itemName: '',
                        mrp: '',
                        dp: '',
                        sp: '',
                        quantity: 10,
                        remarks: ''
                    });
                    setIsEditing(false);
                    setIsDBRecord(false);
                    fetchMasterItems(); // Refresh master quantities
                } else {
                    alert("Error: " + result.message);
                }
            } catch (error) {
                alert("Database update Error!");
            }
            return;
        }

        // LOCAL GRID ADDITION LOGIC
        if (isEditing && !isDBRecord) {
            setItemsList(prev => prev.map(item => item.tagText === formData.tagText ? formData : item));
            setIsEditing(false);
            // alert("Local grid table me update ho gaya!");
        } else {
            const duplicate = itemsList.some(item => item.tagText === formData.tagText);
            if (duplicate) {
                alert("Yeh Tag ID pehle se current bill grid me hai! Agar update karna hai toh search karein ya grid se remove karein.");
                return;
            }
            // Add to Grid
            setItemsList(prev => [...prev, formData]);
        }

        // Reset inputs to default state for next entry, keeping Bill No intact
        setFormData(prev => ({
            purchaseBillNo: prev.purchaseBillNo,
            tagText: '',
            itemGroup: '',
            itemName: '',
            mrp: '',
            dp: '',
            sp: '',
            quantity: 10,
            remarks: ''
        }));
    };

    const handleRemoveItem = (tagToRemove) => {
        setItemsList(prev => prev.filter(item => item.tagText !== tagToRemove));
    };

    const handleSaveToDatabase = async () => {
        if (itemsList.length === 0) {
            alert("Pehle table me kam-se-kam ek item Add kijiye!");
            return;
        }

        try {
            const response = await fetch(`${baseURL}/api/save_bulk_stock/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsList })
            });

            const data = await response.json();
            if (data.success) {
                alert("Saara Stock save ho gaya hai !");
                setItemsList([]);
                fetchMasterItems(); // Sync latest master quantities
            } else {
                alert("Bulk save failed: " + data.message);
            }
        } catch (error) {
            alert("Server connection failed!");
        }
    };

    return (
        <div className="stockin-container">
            <div className="stockin-header">Stock Entry (In)</div>

            <fieldset className="stockin-fieldset">
                <legend>Item Details</legend>
                <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>Purchase Bill No</label>
                        <input type="text" name="purchaseBillNo" value={formData.purchaseBillNo} onChange={handleInputChange} />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label style={{ color: '#ff7300', fontWeight: 'bold' }}>TagText</label>
                        <select name="tagText" value={formData.tagText} onChange={handleInputChange} style={{ borderColor: '#ff7300' }}>
                            <option value="">-- Select Tag --</option>
                            {tagOptions.map((t, i) => <option key={i} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: window.innerWidth > 900 ? 'span 2' : 'span 1' }}>
                        <label>Group</label>
                        <select name="itemGroup" value={formData.itemGroup} onChange={handleInputChange}>
                            <option value="">-- Select Group --</option>
                            {groupOptions.map((g, i) => <option key={i} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: window.innerWidth > 900 ? 'span 2' : 'span 1' }}>
                        <label>Item Name</label>
                        <select name="itemName" value={formData.itemName} onChange={handleInputChange}>
                            <option value="">-- Select Item --</option>
                            {itemOptions.map((n, i) => <option key={i} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>MRP</label>
                        <input type="number" step="0.01" name="mrp" value={formData.mrp} onChange={handleInputChange} readOnly />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>DP</label>
                        <input type="number" step="0.01" name="dp" value={formData.dp} onChange={handleInputChange} readOnly />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>SP</label>
                        <input type="number" step="0.01" name="sp" value={formData.sp} onChange={handleInputChange} readOnly />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label style={{ color: '#00f5d4' }}>Quantity</label>
                        <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleInputChange} style={{ borderColor: '#00f5d4' }} />
                    </div>

                    <div className="form-group-full" style={{ gridColumn: window.innerWidth > 900 ? 'span 4' : 'span 1' }}>
                        <label>Remarks</label>
                        <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} />
                    </div>

                    <div className="form-group btn-grid-actions-wrapper">
                        <label className="btn-spacer-label">&nbsp;</label>
                        <div className="action-buttons-flex">
                            <button 
                                type="button" 
                                className={isDBRecord ? "btn-update" : "btn-add"}
                                onClick={handleAddOrUpdateItem}
                            >
                                {isDBRecord ? "✏️ Update" : (isEditing ? "Update" : "Add to Grid")}
                            </button>
                            <button type="button" className="btn-search" onClick={handleSearch}>Search</button>
                        </div>
                    </div>
                </div>
                
            </fieldset>

            <div className="grid-container">
                <table className="stockin-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Bill No</th>
                            <th>Tag ID</th>
                            <th>Group</th>
                            <th>Item Name</th>
                            <th>MRP</th>
                            <th>DP</th>
                            <th>SP</th>
                            <th>Qty</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsList.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', color: '#888' }}>Grid me koi item added nahi hai.</td>
                            </tr>
                        ) : (
                            itemsList.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <button type="button" className="btn-remove" onClick={() => handleRemoveItem(item.tagText)}>Remove</button>
                                    </td>
                                    <td>{item.purchaseBillNo}</td>
                                    <td style={{ fontWeight: 'bold' }}>{item.tagText}</td>
                                    <td>{item.itemGroup}</td>
                                    <td>{item.itemName}</td>
                                    <td>{item.mrp}</td>
                                    <td>{item.dp}</td>
                                    <td>{item.sp ? parseFloat(item.sp).toFixed(2) : '-'}</td>
                                    <td style={{ color: '#00f5d4', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td>{item.remarks}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="final-submit-bar">
                <button type="button" className="btn-bulk-save" onClick={handleSaveToDatabase}>Save Stock</button>
            </div>
        </div>
    );
};

export default StockIn;