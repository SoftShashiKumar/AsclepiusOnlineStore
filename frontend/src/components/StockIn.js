import React, { useState, useEffect, useRef } from 'react';
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

    // Searchable TAG combobox states
    const [tagSearch, setTagSearch] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
    const tagComboboxRef = useRef(null);
    const tagRef = useRef(null);
    const quantityRef = useRef(null);

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

    // Close tag dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (tagComboboxRef.current && !tagComboboxRef.current.contains(e.target)) {
                setIsTagDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            // Do not autofill Remarks or Quantity as they are transaction specific, but preserve existing
            remarks: masterItem.remarks || prev.remarks
        }));
    };

    // Filter available tags dynamically by typing (starts-with query)
    const filteredTags = tagOptions.filter(tag => {
        if (!tagSearch.trim()) return true;
        return tag && tag.toLowerCase().startsWith(tagSearch.trim().toLowerCase());
    });

    const selectTag = (selected) => {
        setTagSearch(selected);
        setIsTagDropdownOpen(false);
        setHighlightedTagIndex(-1);

        // Check if item is already in local grid for quick edit
        const localItem = itemsList.find(item => item.tagText === selected);
        if (localItem) {
            setFormData(localItem);
            setIsEditing(true);
            setIsDBRecord(false);
            const namesForGroup = masterItems.filter(m => m.item_group === localItem.itemGroup).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
            setTimeout(() => {
                if (quantityRef.current) quantityRef.current.focus();
            }, 50);
            return;
        }

        // Auto-fill from master items
        const selectedMaster = masterItems.find(m => m.tag_text === selected);
        if (selectedMaster) {
            autoFillFromMaster(selectedMaster);
            const namesForGroup = masterItems.filter(m => m.item_group === selectedMaster.item_group).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
        } else {
            setFormData(prev => ({ ...prev, tagText: selected }));
        }

        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 50);
    };

    const handleTagInputChange = (e) => {
        const val = e.target.value;
        setTagSearch(val);
        setIsTagDropdownOpen(true);
        setHighlightedTagIndex(0);

        if (!val.trim()) {
            setFormData(prev => ({
                ...prev,
                tagText: '',
                itemGroup: '',
                itemName: '',
                mrp: '',
                dp: '',
                sp: ''
            }));
            return;
        }

        const exact = tagOptions.find(t => t.toLowerCase() === val.trim().toLowerCase());
        if (exact) {
            const selectedMaster = masterItems.find(m => m.tag_text === exact);
            if (selectedMaster) {
                autoFillFromMaster(selectedMaster);
                const namesForGroup = masterItems.filter(m => m.item_group === selectedMaster.item_group).map(m => m.item_name);
                setItemOptions([...new Set(namesForGroup)].sort());
            } else {
                setFormData(prev => ({ ...prev, tagText: exact }));
            }
        } else {
            setFormData(prev => ({ ...prev, tagText: val }));
        }
    };

    const handleTagInputFocus = () => {
        setIsTagDropdownOpen(true);
        if (filteredTags.length > 0) {
            setHighlightedTagIndex(0);
        }
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isTagDropdownOpen) {
                setIsTagDropdownOpen(true);
                setHighlightedTagIndex(0);
                return;
            }
            if (filteredTags.length > 0) {
                setHighlightedTagIndex(prev => {
                    const next = prev < filteredTags.length - 1 ? prev + 1 : 0;
                    const el = document.getElementById(`stockin-tag-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredTags.length > 0) {
                setHighlightedTagIndex(prev => {
                    const next = prev > 0 ? prev - 1 : filteredTags.length - 1;
                    const el = document.getElementById(`stockin-tag-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isTagDropdownOpen && filteredTags.length > 0) {
                const selected = (highlightedTagIndex >= 0 && highlightedTagIndex < filteredTags.length)
                    ? filteredTags[highlightedTagIndex]
                    : filteredTags[0];
                selectTag(selected);
            } else {
                if (quantityRef.current) quantityRef.current.focus();
            }
        } else if (e.key === 'Escape') {
            setIsTagDropdownOpen(false);
        } else if (e.key === 'Tab') {
            if (isTagDropdownOpen && highlightedTagIndex >= 0 && filteredTags[highlightedTagIndex]) {
                selectTag(filteredTags[highlightedTagIndex]);
            }
            setIsTagDropdownOpen(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'tagText') {
            // Handled by handleTagInputChange
        } else if (name === 'itemGroup') {
            const namesForGroup = masterItems.filter(m => m.item_group === value).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
            setFormData(prev => ({ ...prev, itemGroup: value, itemName: '', tagText: '' }));
            setTagSearch('');
        } else if (name === 'itemName') {
            // Find specific master item using Group + Item Name
            const selectedMaster = masterItems.find(m => m.item_group === formData.itemGroup && m.item_name === value);
            if (selectedMaster) {
                autoFillFromMaster(selectedMaster);
                setTagSearch(selectedMaster.tag_text || '');
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEditLocalItem = (item) => {
        setFormData(item);
        setTagSearch(item.tagText || '');
        setIsEditing(true);
        setIsDBRecord(false);
        const namesForGroup = masterItems.filter(m => m.item_group === item.itemGroup).map(m => m.item_name);
        setItemOptions([...new Set(namesForGroup)].sort());
        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 50);
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
                    setTagSearch('');
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
        } else {
            const duplicate = itemsList.some(item => item.tagText === formData.tagText);
            if (duplicate) {
                alert("Yeh Tag ID pehle se current bill grid me hai! Agar update karna hai toh table row click karein ya remove karein.");
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
        setTagSearch('');
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

                    <div className="form-group" style={{ gridColumn: 'span 1', position: 'relative' }} ref={tagComboboxRef}>
                        <label style={{ color: '#ff7300', fontWeight: 'bold' }}>TagText</label>
                        <div className="tag-combobox-wrapper">
                            <input 
                                type="text"
                                ref={tagRef}
                                name="tagText"
                                value={tagSearch}
                                onChange={handleTagInputChange}
                                onFocus={handleTagInputFocus}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Type TAG..."
                                style={{ borderColor: '#ff7300', width: '100%' }}
                                autoComplete="off"
                            />
                            {isTagDropdownOpen && (
                                <ul className="tag-dropdown-list">
                                    {filteredTags.length > 0 ? (
                                        filteredTags.map((tag, idx) => (
                                            <li 
                                                key={tag}
                                                id={`stockin-tag-opt-${idx}`}
                                                className={`tag-dropdown-item ${idx === highlightedTagIndex ? 'highlighted' : ''}`}
                                                onMouseDown={() => selectTag(tag)}
                                            >
                                                {tag}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="tag-dropdown-empty">No matching Tag found</li>
                                    )}
                                </ul>
                            )}
                        </div>
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
                        <input 
                            ref={quantityRef}
                            type="number" 
                            min="1" 
                            name="quantity" 
                            value={formData.quantity} 
                            onChange={handleInputChange} 
                            style={{ borderColor: '#00f5d4' }} 
                        />
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
                                <tr 
                                    key={index} 
                                    onClick={() => handleEditLocalItem(item)} 
                                    style={{ cursor: 'pointer' }}
                                    title="Click to edit item"
                                >
                                    <td>
                                        <button 
                                            type="button" 
                                            className="btn-remove" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveItem(item.tagText);
                                            }}
                                        >
                                            Remove
                                        </button>
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
