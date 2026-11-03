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

    // 🔍 Searchable TagText combobox states
    const [tagSearch, setTagSearch] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
    const tagComboboxRef = useRef(null);
    const tagRef = useRef(null);

    // 🔍 Searchable Group combobox states
    const [groupSearch, setGroupSearch] = useState('');
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [highlightedGroupIndex, setHighlightedGroupIndex] = useState(-1);
    const groupComboboxRef = useRef(null);
    const groupRef = useRef(null);

    // 🔍 Searchable Item Name combobox states
    const [itemSearch, setItemSearch] = useState('');
    const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
    const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);
    const itemComboboxRef = useRef(null);
    const itemRef = useRef(null);

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
                const uniqueItems = [...new Set(items.map(m => m.item_name).filter(Boolean))].sort();
                
                setTagOptions(uniqueTags);
                setGroupOptions(uniqueGroups);
                setItemOptions(uniqueItems);
            }
        } catch (error) {
            console.error("Error fetching master items:", error);
        }
    };

    useEffect(() => {
        fetchMasterItems();
    }, []);

    // Close all dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (tagComboboxRef.current && !tagComboboxRef.current.contains(e.target)) {
                setIsTagDropdownOpen(false);
            }
            if (groupComboboxRef.current && !groupComboboxRef.current.contains(e.target)) {
                setIsGroupDropdownOpen(false);
            }
            if (itemComboboxRef.current && !itemComboboxRef.current.contains(e.target)) {
                setIsItemDropdownOpen(false);
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
            remarks: masterItem.remarks || prev.remarks
        }));
        setTagSearch(masterItem.tag_text || '');
        setGroupSearch(masterItem.item_group || '');
        setItemSearch(masterItem.item_name || '');
    };

    // Filter available tags dynamically by typing (substring query)
    const filteredTags = tagOptions.filter(tag => {
        if (!tagSearch.trim()) return true;
        const q = tagSearch.trim().toLowerCase();
        return tag && tag.toLowerCase().includes(q);
    });

    // Filter available groups dynamically by typing (substring query)
    const filteredGroups = groupOptions.filter(grp => {
        if (!groupSearch.trim()) return true;
        const q = groupSearch.trim().toLowerCase();
        return grp && grp.toLowerCase().includes(q);
    });

    // Filter available items dynamically by typing (substring query)
    const filteredItems = itemOptions.filter(item => {
        if (!itemSearch.trim()) return true;
        const q = itemSearch.trim().toLowerCase();
        return item && item.toLowerCase().includes(q);
    });

    // =========================================================================
    // 🎯 1. TAG TEXT SELECTION & CHANGE HANDLERS
    // =========================================================================
    const selectTag = (selected) => {
        setTagSearch(selected);
        setIsTagDropdownOpen(false);
        setHighlightedTagIndex(-1);

        // Check if item is already in local grid for quick edit
        const localItem = itemsList.find(item => item.tagText && item.tagText.toLowerCase() === selected.toLowerCase());
        if (localItem) {
            setFormData(localItem);
            setTagSearch(localItem.tagText || '');
            setGroupSearch(localItem.itemGroup || '');
            setItemSearch(localItem.itemName || '');
            setIsEditing(true);
            setIsDBRecord(false);
            const namesForGroup = masterItems.filter(m => m.item_group === localItem.itemGroup).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
            setTimeout(() => {
                if (quantityRef.current) quantityRef.current.focus();
            }, 50);
            return;
        }

        // Auto-fill from master items: Tag Text se Group aur Item Name dono auto change ho jayenge
        const selectedMaster = masterItems.find(m => m.tag_text && m.tag_text.toLowerCase() === selected.toLowerCase());
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
        setIsGroupDropdownOpen(false);
        setIsItemDropdownOpen(false);
        setHighlightedTagIndex(0);

        if (!val.trim()) {
            setFormData(prev => ({
                ...prev,
                tagText: '',
                mrp: '',
                dp: '',
                sp: ''
            }));
            return;
        }

        const exact = masterItems.find(m => m.tag_text && m.tag_text.toLowerCase() === val.trim().toLowerCase());
        if (exact) {
            autoFillFromMaster(exact);
            const namesForGroup = masterItems.filter(m => m.item_group === exact.item_group).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
        } else {
            setFormData(prev => ({ ...prev, tagText: val }));
        }
    };

    const handleTagInputFocus = () => {
        setIsTagDropdownOpen(true);
        setIsGroupDropdownOpen(false);
        setIsItemDropdownOpen(false);
        if (filteredTags.length > 0) setHighlightedTagIndex(0);
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

    // =========================================================================
    // 🎯 2. GROUP SELECTION & CHANGE HANDLERS
    // =========================================================================
    const selectGroup = (selected) => {
        setGroupSearch(selected);
        setIsGroupDropdownOpen(false);
        setHighlightedGroupIndex(-1);

        const namesForGroup = masterItems.filter(m => m.item_group && m.item_group.toLowerCase() === selected.toLowerCase()).map(m => m.item_name);
        const tagsForGroup = masterItems.filter(m => m.item_group && m.item_group.toLowerCase() === selected.toLowerCase()).map(m => m.tag_text);
        setItemOptions([...new Set(namesForGroup)].sort());
        setTagOptions([...new Set(tagsForGroup)].sort());

        // Check if current item belongs to selected group
        const currentItemBelongs = masterItems.some(m => 
            m.item_group && m.item_group.toLowerCase() === selected.toLowerCase() &&
            m.item_name && m.item_name.toLowerCase() === (itemSearch || '').toLowerCase()
        );

        if (!currentItemBelongs) {
            setFormData(prev => ({
                ...prev,
                itemGroup: selected,
                itemName: '',
                tagText: '',
                mrp: '',
                dp: '',
                sp: ''
            }));
            setItemSearch('');
            setTagSearch('');
        } else {
            setFormData(prev => ({ ...prev, itemGroup: selected }));
        }

        setTimeout(() => {
            if (itemRef.current) itemRef.current.focus();
        }, 50);
    };

    const handleGroupInputChange = (e) => {
        const val = e.target.value;
        setGroupSearch(val);
        setIsGroupDropdownOpen(true);
        setIsTagDropdownOpen(false);
        setIsItemDropdownOpen(false);
        setHighlightedGroupIndex(0);

        if (!val.trim()) {
            setFormData(prev => ({ ...prev, itemGroup: '' }));
            const allNames = masterItems.map(m => m.item_name);
            const allTags = masterItems.map(m => m.tag_text);
            setItemOptions([...new Set(allNames)].sort());
            setTagOptions([...new Set(allTags)].sort());
            return;
        }

        const exact = groupOptions.find(g => g.toLowerCase() === val.trim().toLowerCase());
        if (exact) {
            selectGroup(exact);
        } else {
            setFormData(prev => ({ ...prev, itemGroup: val }));
            const namesForGroup = masterItems.filter(m => m.item_group && m.item_group.toLowerCase().includes(val.trim().toLowerCase())).map(m => m.item_name);
            const tagsForGroup = masterItems.filter(m => m.item_group && m.item_group.toLowerCase().includes(val.trim().toLowerCase())).map(m => m.tag_text);
            setItemOptions([...new Set(namesForGroup)].sort());
            setTagOptions([...new Set(tagsForGroup)].sort());
        }
    };

    const handleGroupInputFocus = () => {
        setIsGroupDropdownOpen(true);
        setIsTagDropdownOpen(false);
        setIsItemDropdownOpen(false);
        if (filteredGroups.length > 0) setHighlightedGroupIndex(0);
    };

    const handleGroupKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isGroupDropdownOpen) {
                setIsGroupDropdownOpen(true);
                setHighlightedGroupIndex(0);
                return;
            }
            if (filteredGroups.length > 0) {
                setHighlightedGroupIndex(prev => {
                    const next = prev < filteredGroups.length - 1 ? prev + 1 : 0;
                    const el = document.getElementById(`stockin-grp-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredGroups.length > 0) {
                setHighlightedGroupIndex(prev => {
                    const next = prev > 0 ? prev - 1 : filteredGroups.length - 1;
                    const el = document.getElementById(`stockin-grp-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isGroupDropdownOpen && filteredGroups.length > 0) {
                const selected = (highlightedGroupIndex >= 0 && highlightedGroupIndex < filteredGroups.length)
                    ? filteredGroups[highlightedGroupIndex]
                    : filteredGroups[0];
                selectGroup(selected);
            } else {
                if (itemRef.current) itemRef.current.focus();
            }
        } else if (e.key === 'Escape') {
            setIsGroupDropdownOpen(false);
        } else if (e.key === 'Tab') {
            if (isGroupDropdownOpen && highlightedGroupIndex >= 0 && filteredGroups[highlightedGroupIndex]) {
                selectGroup(filteredGroups[highlightedGroupIndex]);
            }
            setIsGroupDropdownOpen(false);
        }
    };

    // =========================================================================
    // 🎯 3. ITEM NAME SELECTION & CHANGE HANDLERS
    // =========================================================================
    const selectItem = (selected) => {
        setItemSearch(selected);
        setIsItemDropdownOpen(false);
        setHighlightedItemIndex(-1);

        // Auto-fill from master items: Item Name se Tag Text aur Group dono auto change ho jayenge
        const selectedMaster = masterItems.find(m => 
            m.item_name && m.item_name.toLowerCase() === selected.toLowerCase() &&
            (groupSearch ? (m.item_group && m.item_group.toLowerCase() === groupSearch.toLowerCase()) : true)
        ) || masterItems.find(m => m.item_name && m.item_name.toLowerCase() === selected.toLowerCase());

        if (selectedMaster) {
            autoFillFromMaster(selectedMaster);
            const namesForGroup = masterItems.filter(m => m.item_group === selectedMaster.item_group).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
        } else {
            setFormData(prev => ({ ...prev, itemName: selected }));
        }

        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 50);
    };

    const handleItemInputChange = (e) => {
        const val = e.target.value;
        setItemSearch(val);
        setIsItemDropdownOpen(true);
        setIsTagDropdownOpen(false);
        setIsGroupDropdownOpen(false);
        setHighlightedItemIndex(0);

        if (!val.trim()) {
            setFormData(prev => ({
                ...prev,
                itemName: '',
                mrp: '',
                dp: '',
                sp: ''
            }));
            return;
        }

        const exact = masterItems.find(m => 
            m.item_name && m.item_name.toLowerCase() === val.trim().toLowerCase() &&
            (groupSearch ? (m.item_group && m.item_group.toLowerCase() === groupSearch.toLowerCase()) : true)
        ) || masterItems.find(m => m.item_name && m.item_name.toLowerCase() === val.trim().toLowerCase());

        if (exact) {
            autoFillFromMaster(exact);
            const namesForGroup = masterItems.filter(m => m.item_group === exact.item_group).map(m => m.item_name);
            setItemOptions([...new Set(namesForGroup)].sort());
        } else {
            setFormData(prev => ({ ...prev, itemName: val }));
        }
    };

    const handleItemInputFocus = () => {
        setIsItemDropdownOpen(true);
        setIsTagDropdownOpen(false);
        setIsGroupDropdownOpen(false);
        if (filteredItems.length > 0) setHighlightedItemIndex(0);
    };

    const handleItemKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isItemDropdownOpen) {
                setIsItemDropdownOpen(true);
                setHighlightedItemIndex(0);
                return;
            }
            if (filteredItems.length > 0) {
                setHighlightedItemIndex(prev => {
                    const next = prev < filteredItems.length - 1 ? prev + 1 : 0;
                    const el = document.getElementById(`stockin-item-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredItems.length > 0) {
                setHighlightedItemIndex(prev => {
                    const next = prev > 0 ? prev - 1 : filteredItems.length - 1;
                    const el = document.getElementById(`stockin-item-opt-${next}`);
                    if (el) el.scrollIntoView({ block: 'nearest' });
                    return next;
                });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isItemDropdownOpen && filteredItems.length > 0) {
                const selected = (highlightedItemIndex >= 0 && highlightedItemIndex < filteredItems.length)
                    ? filteredItems[highlightedItemIndex]
                    : filteredItems[0];
                selectItem(selected);
            } else {
                if (quantityRef.current) quantityRef.current.focus();
            }
        } else if (e.key === 'Escape') {
            setIsItemDropdownOpen(false);
        } else if (e.key === 'Tab') {
            if (isItemDropdownOpen && highlightedItemIndex >= 0 && filteredItems[highlightedItemIndex]) {
                selectItem(filteredItems[highlightedItemIndex]);
            }
            setIsItemDropdownOpen(false);
        }
    };

    // Generic input handler for remaining fields (purchaseBillNo, quantity, remarks)
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditLocalItem = (item) => {
        setFormData(item);
        setTagSearch(item.tagText || '');
        setGroupSearch(item.itemGroup || '');
        setItemSearch(item.itemName || '');
        setIsEditing(true);
        setIsDBRecord(false);
        const namesForGroup = masterItems.filter(m => m.item_group === item.itemGroup).map(m => m.item_name);
        setItemOptions([...new Set(namesForGroup)].sort());
        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 50);
    };

    // =========================================================================
    // 🎯 4. ADD / UPDATE / SAVE WITH STRICT RECORD VALIDATION
    // =========================================================================
    const handleAddOrUpdateItem = async () => {
        if (!formData.tagText || !formData.itemName || !formData.quantity) {
            alert("Tag ID, Item Name aur Quantity zaroor bharein!");
            return;
        }

        // 🔍 Strict Check: Kya ItemMaster me iska record update hone ke liye maujood hai?
        const masterMatch = masterItems.find(m => 
            (m.tag_text && m.tag_text.toLowerCase() === (formData.tagText || '').trim().toLowerCase()) ||
            (m.item_name && m.item_name.toLowerCase() === (formData.itemName || '').trim().toLowerCase())
        );
        if (!masterMatch) {
            alert("something went wrong in stock entry");
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
                    setGroupSearch('');
                    setItemSearch('');
                    setIsEditing(false);
                    setIsDBRecord(false);
                    fetchMasterItems(); // Refresh master quantities
                } else {
                    alert(result.message || "something went wrong in stock entry");
                }
            } catch (error) {
                alert("something went wrong in stock entry");
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
        setGroupSearch('');
        setItemSearch('');
    };

    const handleRemoveItem = (tagToRemove) => {
        setItemsList(prev => prev.filter(item => item.tagText !== tagToRemove));
    };

    const handleSaveToDatabase = async () => {
        if (itemsList.length === 0) {
            alert("Pehle table me kam-se-kam ek item Add kijiye!");
            return;
        }

        // 🔍 Strict Check: Kya sabhi items ka record update hone ke liye ItemMaster me hai?
        for (const item of itemsList) {
            const masterMatch = masterItems.find(m => 
                (m.tag_text && m.tag_text.toLowerCase() === (item.tagText || '').trim().toLowerCase()) ||
                (m.item_name && m.item_name.toLowerCase() === (item.itemName || '').trim().toLowerCase())
            );
            if (!masterMatch) {
                alert("something went wrong in stock entry");
                return;
            }
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
                alert(data.message || "something went wrong in stock entry");
            }
        } catch (error) {
            alert("something went wrong in stock entry");
        }
    };

    return (
        <div className="stockin-container">
            <div className="stockin-header">Stock Entry (In)</div>

            <fieldset className="stockin-fieldset">
                <legend>Item Details</legend>
                <div className="form-grid">
                    {/* Purchase Bill No */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>Purchase Bill No</label>
                        <input type="text" name="purchaseBillNo" value={formData.purchaseBillNo} onChange={handleInputChange} />
                    </div>

                    {/* 🔍 1. TagText Editable Search Box */}
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
                                placeholder="Type or select Tag..."
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

                    {/* 🔍 2. Group Editable Search Box */}
                    <div className="form-group" style={{ gridColumn: window.innerWidth > 900 ? 'span 2' : 'span 1', position: 'relative' }} ref={groupComboboxRef}>
                        <label style={{ color: '#00f5d4', fontWeight: 'bold' }}>Group</label>
                        <div className="tag-combobox-wrapper">
                            <input 
                                type="text"
                                ref={groupRef}
                                name="itemGroup"
                                value={groupSearch}
                                onChange={handleGroupInputChange}
                                onFocus={handleGroupInputFocus}
                                onKeyDown={handleGroupKeyDown}
                                placeholder="Type or select Group..."
                                style={{ borderColor: '#00f5d4', width: '100%' }}
                                autoComplete="off"
                            />
                            {isGroupDropdownOpen && (
                                <ul className="tag-dropdown-list group-dropdown-list">
                                    {filteredGroups.length > 0 ? (
                                        filteredGroups.map((grp, idx) => (
                                            <li 
                                                key={grp}
                                                id={`stockin-grp-opt-${idx}`}
                                                className={`tag-dropdown-item ${idx === highlightedGroupIndex ? 'highlighted' : ''}`}
                                                onMouseDown={() => selectGroup(grp)}
                                            >
                                                {grp}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="tag-dropdown-empty">No matching Group found</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* 🔍 3. Item Name Editable Search Box */}
                    <div className="form-group" style={{ gridColumn: window.innerWidth > 900 ? 'span 2' : 'span 1', position: 'relative' }} ref={itemComboboxRef}>
                        <label style={{ color: '#ffb703', fontWeight: 'bold' }}>Item Name</label>
                        <div className="tag-combobox-wrapper">
                            <input 
                                type="text"
                                ref={itemRef}
                                name="itemName"
                                value={itemSearch}
                                onChange={handleItemInputChange}
                                onFocus={handleItemInputFocus}
                                onKeyDown={handleItemKeyDown}
                                placeholder="Type or select Item Name..."
                                style={{ borderColor: '#ffb703', width: '100%' }}
                                autoComplete="off"
                            />
                            {isItemDropdownOpen && (
                                <ul className="tag-dropdown-list item-dropdown-list">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => (
                                            <li 
                                                key={item}
                                                id={`stockin-item-opt-${idx}`}
                                                className={`tag-dropdown-item ${idx === highlightedItemIndex ? 'highlighted' : ''}`}
                                                onMouseDown={() => selectItem(item)}
                                            >
                                                {item}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="tag-dropdown-empty">No matching Item found</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* MRP */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>MRP</label>
                        <input type="number" step="0.01" name="mrp" value={formData.mrp} onChange={handleInputChange} readOnly />
                    </div>

                    {/* DP */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>DP</label>
                        <input type="number" step="0.01" name="dp" value={formData.dp} onChange={handleInputChange} readOnly />
                    </div>

                    {/* SP */}
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                        <label>SP</label>
                        <input type="number" step="0.01" name="sp" value={formData.sp} onChange={handleInputChange} readOnly />
                    </div>

                    {/* Quantity */}
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

                    {/* Remarks */}
                    <div className="form-group-full" style={{ gridColumn: window.innerWidth > 900 ? 'span 4' : 'span 1' }}>
                        <label>Remarks</label>
                        <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} />
                    </div>

                    {/* Add / Update Button */}
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
