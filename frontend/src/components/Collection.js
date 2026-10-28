import React, { useState, useEffect, useCallback, useRef } from 'react';
import { baseURL } from '../apiConfig';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { FaSearch, FaShoppingCart } from 'react-icons/fa';
import './Collection.css'; 

const Collection = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 👥 User Role State
  const [userRole, setUserRole] = useState('Guest');

  // Filters State
  const [group, setGroup] = useState('all');
  const [itemName, setItemName] = useState('all');
  const [sortBy, setSortBy] = useState('groupAsc');

  // Dynamic Master Lists
  const [groupOptions, setGroupOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [activeImages, setActiveImages] = useState({});

  // 🔍 Searchable Item Name Combobox States (Requirement A)
  const [itemSearch, setItemSearch] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1);
  const itemComboboxRef = useRef(null);

  // 🛒 Cart Count State (Requirement C)
  const [cartCount, setCartCount] = useState(0);

  // 🔢 Card Quantity State (Quan input per item)
  const [cardQuantities, setCardQuantities] = useState({});

  const handleQuantityChange = (tagId, value) => {
    if (value === '') {
      setCardQuantities(prev => ({ ...prev, [tagId]: '' }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return;
    setCardQuantities(prev => ({ ...prev, [tagId]: parsed < 1 ? 1 : parsed }));
  };

  const handleQuantityBlur = (tagId, maxStock) => {
    setCardQuantities(prev => {
      const current = prev[tagId];
      if (current === '' || current === undefined || current < 1) {
        return { ...prev, [tagId]: 1 };
      }
      if (maxStock && current > maxStock) {
        return { ...prev, [tagId]: Math.max(1, maxStock) };
      }
      return prev;
    });
  };

  // 📱 Mobile Search Strip Toggle & 10-Second Auto Disappear Timer (Requirement B)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimerRef = useRef(null);

  // 🚩 Flag1 update state tracker
  const [updatingFlags, setUpdatingFlags] = useState({});

  // Management Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Photo Zoom / Lightbox State (Scoped to Selected Product)
  const [lightboxData, setLightboxData] = useState(null);

  // Customer Enquiry Modal States
  // const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  // const [enquiryItem, setEnquiryItem] = useState({ tagId: '', itemName: '' });
  // const [enquiryForm, setEnquiryForm] = useState({
  //   customerName: '',
  //   customerMobile: '',
  //   customerRemarks: ''
  // });
  // const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  // Offer Banner States
  const [offerText, setOfferText] = useState('');
  const [isOfferActive, setIsOfferActive] = useState(false);
  const [isEditingOffer, setIsEditingOffer] = useState(false); 
  const [inputOfferText, setInputOfferText] = useState('');

  // Screensaver States
  const [showScreensaverSettings, setShowScreensaverSettings] = useState(false);
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);
  const [screensaverTimeout, setScreensaverTimeout] = useState(15);

  useEffect(() => {
     const en = localStorage.getItem('screensaver_enabled');
     const to = localStorage.getItem('screensaver_timeout');
     if(en !== null) setScreensaverEnabled(JSON.parse(en));
     if(to) setScreensaverTimeout(parseInt(to, 10));
  }, []);

  // 🛒 Sync cart count with localStorage and events
  const updateCartCount = useCallback(() => {
    try {
      const savedCart = localStorage.getItem('userCart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const count = parsed.reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 1), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, [updateCartCount]);

  // ⏱️ 10-Second Auto Disappear Timer for Mobile Search Bar (Requirement B)
  const resetInactivityTimer = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    // Only auto-close on mobile screen width (<= 768px)
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      searchTimerRef.current = setTimeout(() => {
        setIsSearchOpen(false);
      }, 10000);
    }
  }, []);

  const handleToggleSearch = () => {
    setIsSearchOpen(prev => {
      const next = !prev;
      if (next) {
        resetInactivityTimer();
        setTimeout(() => {
          const inputEl = document.querySelector('.item-combobox-input');
          if (inputEl) inputEl.focus();
        }, 100);
      } else {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleOpenCart = () => {
    window.dispatchEvent(new CustomEvent('openCartModal'));
  };

  // 🔑 Helper Function: Guest ko chhor ke sab ko management access
  const isStaffUser = (role) => {
    if (!role) return false;
    const normalized = role.toString().trim().toLowerCase();
    return normalized !== 'guest' && normalized !== 'customer';
  };

  // 🔄 Load Dropdowns (Groups and Items from ItemMaster via /api/master/all/)
  const loadInitialFilterData = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/master/all/`);
      if (response.data) {
        let items = Array.isArray(response.data) ? response.data : (response.data.data || []);
        
        // 🔒 Non-admin/Guest users only see groups & items for products that are live (Flag1 === '1')
        const currentRole = sessionStorage.getItem('userRole') || 
                            localStorage.getItem('userRole') || 
                            localStorage.getItem('role') || 
                            'Guest';
        if (!isStaffUser(currentRole)) {
          items = items.filter(m => String(m.flag1) === '1');
        }

        // Extract unique Groups
        const uniqueGroups = [...new Set(items.map(m => m.item_group).filter(Boolean))].sort();
        setGroupOptions(uniqueGroups);

        // Extract unique Items for the default "all" state
        const uniqueItems = [...new Set(items.map(m => m.item_name).filter(Boolean))].sort();
        setItemOptions(uniqueItems);
        
        // Store master list inside window for faster dropdown filtering
        window.masterCatalog = items;
      }
    } catch (error) {
      console.error("Master Table fetch error:", error);
    }
  };

  const handleGroupChange = (selectedGroup) => {
    setGroup(selectedGroup);
    setItemName('all');
    setItemSearch('');
    setIsItemDropdownOpen(false);
    resetInactivityTimer();

    if (window.masterCatalog) {
      if (selectedGroup === 'all') {
        const uniqueItems = [...new Set(window.masterCatalog.map(m => m.item_name).filter(Boolean))].sort();
        setItemOptions(uniqueItems);
      } else {
        const uniqueItems = [...new Set(window.masterCatalog.filter(m => m.item_group === selectedGroup).map(m => m.item_name).filter(Boolean))].sort();
        setItemOptions(uniqueItems);
      }
    }
  };

  // 🖱️ Click outside handler for Item Combobox
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemComboboxRef.current && !itemComboboxRef.current.contains(e.target)) {
        setIsItemDropdownOpen(false);
        if (itemName === 'all') {
          setItemSearch('');
        } else {
          setItemSearch(itemName);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemName]);

  // 🔍 Filter available items dynamically by typing (starts-with query) (Requirement A)
  const filteredItemOptions = itemOptions.filter(name => {
    if (!itemSearch.trim()) return true;
    return name && name.toLowerCase().startsWith(itemSearch.trim().toLowerCase());
  });

  // Construct displayList with "All Items"
  const displayList = [];
  const searchLower = itemSearch.trim().toLowerCase();
  if (!searchLower || 'all items'.startsWith(searchLower) || 'all'.startsWith(searchLower)) {
    displayList.push('All Items');
  }
  filteredItemOptions.forEach(p => {
    if (p !== 'All Items') displayList.push(p);
  });

  const handleSelectItem = (selected) => {
    if (selected === 'All Items' || selected === 'all') {
      setItemName('all');
      setItemSearch('');
    } else {
      setItemName(selected);
      setItemSearch(selected);
    }
    setIsItemDropdownOpen(false);
    setHighlightedItemIndex(-1);
    resetInactivityTimer();
  };

  const handleItemSearchChange = (e) => {
    const val = e.target.value;
    setItemSearch(val);
    setIsItemDropdownOpen(true);
    setHighlightedItemIndex(0);
    resetInactivityTimer();

    if (!val.trim()) {
      setItemName('all');
    } else {
      const exact = itemOptions.find(p => p.toLowerCase() === val.trim().toLowerCase());
      if (exact) {
        setItemName(exact);
      }
    }
  };

  const handleClearItemSearch = () => {
    setItemName('all');
    setItemSearch('');
    setIsItemDropdownOpen(false);
    setHighlightedItemIndex(-1);
    resetInactivityTimer();
  };

  const handleItemKeyDown = (e) => {
    resetInactivityTimer();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isItemDropdownOpen) {
        setIsItemDropdownOpen(true);
        setHighlightedItemIndex(0);
        return;
      }
      if (displayList.length > 0) {
        setHighlightedItemIndex(prev => {
          const next = prev < displayList.length - 1 ? prev + 1 : 0;
          const el = document.getElementById(`item-opt-${next}`);
          if (el) el.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (displayList.length > 0) {
        setHighlightedItemIndex(prev => {
          const next = prev > 0 ? prev - 1 : displayList.length - 1;
          const el = document.getElementById(`item-opt-${next}`);
          if (el) el.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isItemDropdownOpen && displayList.length > 0) {
        const selected = (highlightedItemIndex >= 0 && highlightedItemIndex < displayList.length)
          ? displayList[highlightedItemIndex]
          : displayList[0];
        handleSelectItem(selected);
      }
    } else if (e.key === 'Escape') {
      setIsItemDropdownOpen(false);
    } else if (e.key === 'Tab') {
      if (isItemDropdownOpen && highlightedItemIndex >= 0 && displayList[highlightedItemIndex]) {
        handleSelectItem(displayList[highlightedItemIndex]);
      }
      setIsItemDropdownOpen(false);
    }
  };

  const fetchOfferSettings = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/get-active-offer/`);
      if (response.data.success) {
        setOfferText(response.data.offer_text);
        setIsOfferActive(response.data.is_active);
        setInputOfferText(response.data.offer_text);
      }
    } catch (error) {
      console.error("Offer settings fetch error:", error);
    }
  };

  const handleUpdateOffer = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/update-offer/`, {
        offer_text: inputOfferText,
        is_active: isOfferActive
      });
      if (response.data.success) {
        setOfferText(inputOfferText);
        setIsEditingOffer(false); 
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Offer save error:", error);
      alert("Offer details save Error !");
    }
  };

  // 📦 Fetch Stock Items
  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const currentRole = sessionStorage.getItem('userRole') || 
                          localStorage.getItem('userRole') || 
                          localStorage.getItem('role') || 
                          'Guest';
      const flagQuery = !isStaffUser(currentRole) ? '&flag1=1' : '';
      const response = await axios.get(`${baseURL}/api/stock-report/?group=${group}&item=${itemName}${flagQuery}`);
      if (response.data.success) {
        setStockData(response.data.data);
      }
    } catch (error) {
      console.error("Data lane me error:", error);
    }
    setLoading(false);
  }, [group, itemName]);

  // 🚩 Live Flag1 Checkbox Toggle (Admin Only)
  const handleToggleFlag = async (item, isChecked) => {
    const newFlag = isChecked ? '1' : '0';
    const tagId = item.tagId;
    const oldFlag = String(item.flag1 || '0');

    // Optimistically update stockData
    setUpdatingFlags(prev => ({ ...prev, [tagId]: true }));
    setStockData(prev => 
      prev.map(p => p.tagId === tagId ? { ...p, flag1: newFlag } : p)
    );

    // Also update window.masterCatalog if present
    if (window.masterCatalog) {
      window.masterCatalog = window.masterCatalog.map(m => 
        (m.tag_text === tagId || m.tagId === tagId) ? { ...m, flag1: newFlag } : m
      );
    }

    try {
      const response = await axios.post(`${baseURL}/api/master/update-flag/`, {
        tag_text: tagId,
        id: item.id,
        flag1: newFlag
      });

      if (!response.data || !response.data.success) {
        // Revert on API response error
        setStockData(prev => 
          prev.map(p => p.tagId === tagId ? { ...p, flag1: oldFlag } : p)
        );
        if (window.masterCatalog) {
          window.masterCatalog = window.masterCatalog.map(m => 
            (m.tag_text === tagId || m.tagId === tagId) ? { ...m, flag1: oldFlag } : m
          );
        }
        alert(response.data?.message || "Flag1 update nahi ho saka!");
      }
    } catch (error) {
      console.error("Flag update error:", error);
      // Revert on network/server error
      setStockData(prev => 
        prev.map(p => p.tagId === tagId ? { ...p, flag1: oldFlag } : p)
      );
      if (window.masterCatalog) {
        window.masterCatalog = window.masterCatalog.map(m => 
          (m.tag_text === tagId || m.tagId === tagId) ? { ...m, flag1: oldFlag } : m
        );
      }
      const errMsg = error.response?.data?.message || "Flag1 update karne me error aayi!";
      alert(errMsg);
    } finally {
      setUpdatingFlags(prev => {
        const copy = { ...prev };
        delete copy[tagId];
        return copy;
      });
    }
  };

  // Page Load Setup
  useEffect(() => {
    const role = sessionStorage.getItem('userRole') || 
                 localStorage.getItem('userRole') || 
                 localStorage.getItem('role') || 
                 'Guest';
                 
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === 'guest' || normalizedRole === 'customer') {
      setUserRole('Guest');
    } else {
      setUserRole(role);
    }

    loadInitialFilterData();
    fetchOfferSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Stock jab filter ya page load ho
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // 🌟 Sorting & Filtering (Group-First: Same groups always stay together - TiyaOnline Style)
  const getSortedData = () => {
    let sorted = [...stockData];

    // Guest view: only Flag1 === '1' items
    if (!isStaffUser(userRole)) {
      sorted = sorted.filter(item => String(item.flag1) === '1');
    }

    // Fallback group filter
    if (group && group.toLowerCase() !== 'all') {
      sorted = sorted.filter(item => {
        const itemGrp = (item.group || '').trim().toLowerCase();
        return itemGrp === group.trim().toLowerCase();
      });
    }

    // Fallback item name filter
    if (itemName && itemName.toLowerCase() !== 'all') {
      sorted = sorted.filter(item => {
        const name = (item.itemName || '').trim().toLowerCase();
        return name === itemName.trim().toLowerCase();
      });
    }

    // 🌟 Group-First Sorting: Har group ke saare items ek sath display honge
    sorted.sort((a, b) => {
      const grpA = (a.group || '').trim() || 'General / Other Products';
      const grpB = (b.group || '').trim() || 'General / Other Products';

      const groupMultiplier = sortBy === 'groupDesc' ? -1 : 1;
      const cmpGroup = grpA.localeCompare(grpB, undefined, { sensitivity: 'base' }) * groupMultiplier;
      if (cmpGroup !== 0) {
        return cmpGroup;
      }

      // Inside the same group, sort according to sortBy
      if (sortBy === 'itemDesc') {
        return (b.itemName || '').localeCompare(a.itemName || '');
      } else if (sortBy === 'priceLow') {
        return parseFloat(a.sp || a.dp || a.mrp || 0) - parseFloat(b.sp || b.dp || b.mrp || 0);
      } else if (sortBy === 'priceHigh') {
        return parseFloat(b.sp || b.dp || b.mrp || 0) - parseFloat(a.sp || a.dp || a.mrp || 0);
      } else {
        // Default (groupAsc or itemAsc): item name A-Z inside group
        return (a.itemName || '').localeCompare(b.itemName || '');
      }
    });

    return sorted;
  };

  // Management functions
  const openUploadModal = (tagId) => {
    setSelectedTag(tagId);
    setSelectedFiles([]);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert("Pehle koi photo to select kijiye !");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('tag_text', selectedTag);
    
    // Compression Options
    const options = {
      maxSizeMB: 1, // Compress up to 1MB
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      // Compress all selected images
      const compressedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await imageCompression(file, options);
          } catch (error) {
            console.error("Compression error:", error);
            return file; // fallback to original file if compression fails
          }
        })
      );

      compressedFiles.forEach((file) => formData.append('item_images', file));

      const response = await axios.post(`${baseURL}/api/upload-stock-image/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert(response.data.message);
        setIsModalOpen(false);
        fetchStock();
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error in photo uploading !");
    }
    setUploading(false);
  };

  const handleDeleteImage = async (tagId, imageUrl, e) => {
    e.stopPropagation(); 
    if (!window.confirm("Bhai, kya aap sach me is photo ko hatana chahte hain?")) return;

    try {
      const response = await axios.post(`${baseURL}/api/delete-stock-image/`, {
        tag_text: tagId,
        image_url: imageUrl
      });

      if (response.data.success) {
        alert(response.data.message);
        if (activeImages[tagId] === imageUrl) {
          setActiveImages(prev => {
            const newState = { ...prev };
            delete newState[tagId];
            return newState;
          });
        }
        fetchStock(); 
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Photo delete nahi ho payi!");
    }
  };

  // Cart Functions
  const addToCart = (item, selectedQty = 1) => {
    if (!item.available_quantity || parseFloat(item.available_quantity) <= 0) {
      alert("Sorry ! This item is currently out of Stock, Please ! Try Later");
      return;
    }

    const qty = Math.max(1, parseInt(selectedQty, 10) || 1);
    const maxStock = parseFloat(item.available_quantity);
    if (maxStock && qty > maxStock) {
      alert(`Iss item ki sirf ${maxStock} quantity hi available hai!`);
      return;
    }

    const savedCart = localStorage.getItem('userCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];

    // Default rate hum DP lenge
    const itemRate = parseFloat(item.dp || 0);
    const itemSp = parseFloat(item.sp || 0);

    // Check if already in cart
    const existingIndex = cart.findIndex(c => c.tagId === item.tagId);
    if (existingIndex > -1) {
      cart[existingIndex].quantity = qty;
      cart[existingIndex].maxQty = maxStock;
      cart[existingIndex].rate = itemRate;
      cart[existingIndex].sp = itemSp;
      cart[existingIndex].itemTotal = itemRate * qty;
      cart[existingIndex].itemTotalSP = itemSp * qty;
      localStorage.setItem('userCart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      alert(`${item.itemName} Cart me update ho gaya hai! (Quantity: ${qty})`);
      return;
    }

    const newCartItem = {
      tagId: item.tagId,
      itemName: item.itemName,
      rate: itemRate,
      sp: itemSp,
      quantity: qty,
      maxQty: maxStock, // Store max available quantity
      itemTotal: itemRate * qty,
      itemTotalSP: itemSp * qty
    };

    cart.push(newCartItem);
    localStorage.setItem('userCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    alert(`${item.itemName} (${qty} pcs) Cart me add ho gaya hai! Upar cart icon par click karke order place karein.`);
  };

  // 🖼️ Open Lightbox scoped ONLY to the selected product's images
  const openLightbox = (clickedUrl, item) => {
    const images = [];
    if (item.imageUrl) images.push(item.imageUrl);
    if (item.angleUrls && Array.isArray(item.angleUrls)) {
      item.angleUrls.forEach((url) => {
        if (url && !images.includes(url)) {
          images.push(url);
        }
      });
    }

    if (clickedUrl && !images.includes(clickedUrl)) {
      images.unshift(clickedUrl);
    }

    let startIndex = images.indexOf(clickedUrl);
    if (startIndex === -1) startIndex = 0;

    setLightboxData({
      item,
      images,
      currentIndex: startIndex
    });
  };

  const handleCloseLightbox = useCallback(() => {
    setLightboxData(null);
  }, []);

  // 🔁 Circular navigation: 4/4 -> 1/4
  const handleNextImage = useCallback(() => {
    setLightboxData((prev) => {
      if (!prev || !prev.images || prev.images.length <= 1) return prev;
      const nextIndex = (prev.currentIndex + 1) % prev.images.length;
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  // 🔁 Circular navigation: 1/4 -> 4/4
  const handlePrevImage = useCallback(() => {
    setLightboxData((prev) => {
      if (!prev || !prev.images || prev.images.length <= 1) return prev;
      const prevIndex = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
      return { ...prev, currentIndex: prevIndex };
    });
  }, []);

  // ⌨️ Keyboard Navigation: ArrowLeft (<), ArrowRight (>), Escape (Close)
  useEffect(() => {
    if (!lightboxData) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxData, handleNextImage, handlePrevImage, handleCloseLightbox]);

  const displayedStock = getSortedData();

  // 🏷️ Group items by group name so items of the same group display together (TiyaOnline Style)
  const groupedStock = displayedStock.reduce((acc, item) => {
    const grp = (item.group || '').trim() || 'General / Other Products';
    if (!acc[grp]) {
      acc[grp] = [];
    }
    acc[grp].push(item);
    return acc;
  }, {});

  // 📦 Helper to render individual product card
  const renderProductCard = (item) => {
    const currentMainImage = activeImages[item.tagId] || item.imageUrl;

    const allAvailableAngles = [];
    if (item.imageUrl) allAvailableAngles.push(item.imageUrl);
    if (item.angleUrls && item.angleUrls.length > 0) {
      item.angleUrls.forEach(url => {
        if (url !== item.imageUrl) allAvailableAngles.push(url);
      });
    }

    // Dynamic Status Colors
    let qtyColor = '#ff4d4f'; // Red for 0
    if (item.available_quantity > 20) {
      qtyColor = '#52c41a'; // Green
    } else if (item.available_quantity >= 1) {
      qtyColor = '#faad14'; // Yellow/Orange
    }

    return (
      <div className="product-card" key={item.tagId}>
        {/* 👑 Admin Only: Flag1 Visibility Toggle Checkbox at Top-Right */}
        {isStaffUser(userRole) && (
          <div 
            className={`card-admin-flag-badge ${String(item.flag1) === '1' ? 'flag-live' : 'flag-hidden'}`}
            onClick={(e) => e.stopPropagation()}
            title={String(item.flag1) === '1' ? "Visible to Guests (Flag1 = 1) - Click to Hide" : "Hidden from Guests (Flag1 = 0) - Click to Show"}
          >
            <input 
              type="checkbox"
              id={`flag1-chk-${item.tagId}`}
              className="card-flag-checkbox"
              checked={String(item.flag1) === '1'}
              disabled={updatingFlags[item.tagId]}
              onChange={(e) => handleToggleFlag(item, e.target.checked)}
            />
            <label htmlFor={`flag1-chk-${item.tagId}`} className="card-flag-label">
              {updatingFlags[item.tagId] ? '...' : (String(item.flag1) === '1' ? 'Live' : 'Hidden')}
            </label>
          </div>
        )}

        <div className="card-image-box" style={{ position: 'relative' }}>
          {currentMainImage ? (
            <>
              <img 
                src={currentMainImage} 
                alt={item.itemName} 
                className="product-image" 
                onClick={() => openLightbox(currentMainImage, item)} 
                style={{ cursor: 'pointer' }} 
              />
              {/* 🔒 Delete Button: Only Non-Guest */}
              {isStaffUser(userRole) && (
                <button 
                  type="button"
                  className="main-image-delete-btn"
                  onClick={(e) => handleDeleteImage(item.tagId, currentMainImage, e)}
                  title="Delete main photo"
                >
                  ×
                </button>
              )}
            </>
          ) : (
            <div className="no-image-placeholder"><span>No Photo</span></div>
          )}
        </div>

        {/* Thumbnails */}
        {allAvailableAngles.length > 1 && (
          <div className="thumbnails-container">
            {allAvailableAngles.map((url, idx) => (
              <div 
                key={idx} 
                className={`thumb-box ${currentMainImage === url ? 'active-thumb' : ''}`}
                onMouseEnter={() => setActiveImages(prev => ({ ...prev, [item.tagId]: url }))}
                onClick={() => setActiveImages(prev => ({ ...prev, [item.tagId]: url }))}
                style={{ position: 'relative' }}
              >
                <img src={url} alt="angle" />
                {isStaffUser(userRole) && (
                  <button 
                    type="button"
                    className="thumb-delete-btn"
                    onClick={(e) => handleDeleteImage(item.tagId, url, e)}
                    title="Delete photo"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card Details */}
        <div className="card-details">
          <h3 className="item-name">{item.itemName || 'Product Item'}</h3>
          
          <div className="tag-status-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 10px 0' }}>
            <div className="tag-badge" style={{ marginBottom: 0 }}>Tag: {item.tagId}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span 
                style={{ 
                  display: 'inline-block',
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  backgroundColor: qtyColor, 
                  boxShadow: `0 0 8px ${qtyColor}` 
                }} 
                title={`Stock Qty: ${item.available_quantity}`}
              ></span>
            </div>
          </div>
                             
          <div className="specs-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div className="price-col">
              <span className="price-label">MRP:</span>
              <span className="price-value">₹{item.mrp}</span>
            </div>
            <div className="price-col">
              <span className="price-label">DP:</span>
              <span className="price-value">₹{item.dp}</span>
            </div>
            <div className="price-col">
              <span className="price-label">SP:</span>
              <span className="price-value">₹{item.sp}</span>
            </div>
          </div>
          
          {item.remarks && <p className="item-remarks">{item.remarks}</p>}
          
          {/* Conditional Action Button */}
          {!isStaffUser(userRole) ? (
            <div className="card-cart-action-row">
              <div className="card-quan-wrapper">
                <span className="card-quan-label">Quan</span>
                <input 
                  type="number" 
                  name="Quan" 
                  className="card-quan-input" 
                  min="1" 
                  max={item.available_quantity ? Math.max(1, parseFloat(item.available_quantity)) : 999}
                  value={cardQuantities[item.tagId] !== undefined ? cardQuantities[item.tagId] : 1} 
                  onChange={(e) => handleQuantityChange(item.tagId, e.target.value)} 
                  onBlur={() => handleQuantityBlur(item.tagId, item.available_quantity ? parseFloat(item.available_quantity) : undefined)}
                />
              </div>
              <button 
                className="upload-btn cart-action-btn" 
                onClick={() => addToCart(item, cardQuantities[item.tagId] !== undefined && cardQuantities[item.tagId] !== '' ? cardQuantities[item.tagId] : 1)}
                style={{ backgroundColor: '#2874f0', color: '#fff', borderColor: '#2874f0' }}
              >
                🛒 Add to Cart
              </button>
            </div>
          ) : (
            <button className="upload-btn" onClick={() => openUploadModal(item.tagId)}>
              {item.imageUrl ? '🔄 Add/Change Photos' : '📸 Upload Photos'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="collection-container">
      
      {/* 📢 1. Offer Banner */}
      {isOfferActive && offerText && (
        <div style={{
          background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
          color: '#fff',
          textAlign: 'center',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: 'bold',
          borderRadius: '8px',
          marginBottom: '15px',
          boxShadow: '0 4px 10px rgba(255, 77, 79, 0.2)'
        }}>
          🔥 {offerText} 🔥
        </div>
      )}

      {/* 🛠️ 2. Top Control & Sticky Search/Cart Strip */}
      <div className="collection-control-strip">
        <div className="control-strip-left">
          <button 
            type="button"
            className="control-strip-btn screensaver-toggle-btn"
            onClick={() => setShowScreensaverSettings(!showScreensaverSettings)}
          >
            {showScreensaverSettings ? '✖ Screensaver' : '🖥️ Screensaver'}
          </button>

          {isStaffUser(userRole) && (
            <button 
              type="button"
              className="control-strip-btn offer-toggle-btn"
              onClick={() => setIsEditingOffer(!isEditingOffer)}
            >
              {isEditingOffer ? '⚙️ Close Offer' : '⚙️ Manage Offer'}
            </button>
          )}
        </div>

        <div className="control-strip-right">
          <button 
            type="button" 
            className={`control-strip-icon-btn search-toggle-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={handleToggleSearch}
            title="Search / Filter Products"
            aria-label="Search Products"
          >
            <FaSearch />
            <span className="control-btn-text">Search</span>
          </button>

          <button 
            type="button" 
            className="control-strip-icon-btn cart-toggle-btn"
            onClick={handleOpenCart}
            title="My Cart"
            aria-label="My Cart"
          >
            <FaShoppingCart />
            <span className="control-btn-text">Cart</span>
            {cartCount > 0 && <span className="strip-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* 🖥️ Screensaver Settings Panel */}
      {showScreensaverSettings && (
          <div style={{
            background: '#fff',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            border: '1px solid #e0e0e0',
            color: '#000'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#222' }}>🖥️ Screensaver Settings</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Enable Screensaver:</label>
              <input 
                type="checkbox" 
                checked={screensaverEnabled}
                onChange={(e) => {
                   setScreensaverEnabled(e.target.checked);
                   localStorage.setItem('screensaver_enabled', e.target.checked);
                   window.dispatchEvent(new Event('screensaverSettingsChanged'));
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Timeout (Seconds):</label>
              <input 
                type="number" 
                min="5"
                value={screensaverTimeout}
                onChange={(e) => {
                   setScreensaverTimeout(e.target.value);
                   localStorage.setItem('screensaver_timeout', e.target.value);
                   window.dispatchEvent(new Event('screensaverSettingsChanged'));
                }}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', width: '80px', color: '#000' }}
              />
            </div>
          </div>
      )}

      {/* 📝 3. Offer Control Panel (Non-Guest Users) */}
      {isStaffUser(userRole) && isEditingOffer && (
        <div style={{
          background: '#fff',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          border: '1px solid #e0e0e0'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#222' }}>⚙️ Operator Offer Control Panel</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
              Offer Message Text:
              <input 
                type="text" 
                value={inputOfferText} 
                onChange={(e) => setInputOfferText(e.target.value)} 
                placeholder="Ex: Diwali Special Offer!"
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 'bold', color: '#555', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isOfferActive} 
                onChange={(e) => setIsOfferActive(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Turn On/OFF Offer Banner
            </label>
            <button 
              onClick={handleUpdateOffer}
              style={{ background: '#2874f0', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              🚀 Save & Go Live
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar (Auto-disappears after 10s of inactivity on mobile) */}
      <div 
        className={`filter-bar ${!isSearchOpen ? 'mobile-hidden' : 'mobile-visible'}`}
        onMouseMove={resetInactivityTimer}
        onTouchStart={resetInactivityTimer}
        onClick={resetInactivityTimer}
        onKeyDown={resetInactivityTimer}
      >
        <div className="mobile-search-bar-top">
          <span className="mobile-search-title">🔍 Search & Filters</span>
          <button 
            type="button" 
            className="mobile-search-close-btn" 
            onClick={() => {
              setIsSearchOpen(false);
              if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            }}
            title="Close Search"
          >
            ✕
          </button>
        </div>

        <div className="filter-group">
          <label>Group:</label>
          <select value={group} onChange={(e) => { handleGroupChange(e.target.value); resetInactivityTimer(); }}>
            <option value="all">All Groups</option>
            {groupOptions.map((g, index) => (
              <option key={index} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-item-autocomplete" ref={itemComboboxRef}>
          <label>Item Name:</label>
          <div className="item-combobox-wrapper">
            <input
              type="text"
              className="item-combobox-input"
              placeholder="Type Item Name (e.g. S, Sa...)"
              value={itemSearch}
              onChange={handleItemSearchChange}
              onFocus={() => { setIsItemDropdownOpen(true); setHighlightedItemIndex(0); resetInactivityTimer(); }}
              onKeyDown={handleItemKeyDown}
              autoComplete="off"
            />
            {itemSearch && (
              <button 
                type="button" 
                className="item-combobox-clear" 
                onClick={handleClearItemSearch}
                title="Clear"
              >
                ×
              </button>
            )}
            {isItemDropdownOpen && (
              <ul className="item-dropdown-list">
                {displayList.length > 0 ? (
                  displayList.map((p, idx) => (
                    <li
                      key={idx}
                      id={`item-opt-${idx}`}
                      className={`item-dropdown-item ${((p === 'All Items' && itemName === 'all') || p === itemName) ? 'active-selection' : ''} ${idx === highlightedItemIndex ? 'highlighted' : ''}`}
                      onMouseDown={() => handleSelectItem(p)}
                    >
                      {p}
                    </li>
                  ))
                ) : (
                  <li className="item-dropdown-empty">No matching Item</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); resetInactivityTimer(); }}>
            <option value="groupAsc">Group (A-Z)</option>
            <option value="groupDesc">Group (Z-A)</option>
            <option value="itemAsc">Item Name (A-Z)</option>
            <option value="itemDesc">Item Name (Z-A)</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
          </select>
        </div>

        {/* 👑 Admin Mode Live Summary (TiyaOnline Style) */}
        {isStaffUser(userRole) && (
          <div className="admin-stock-summary">
            👑 Admin Mode: {stockData.length} Total Items ({stockData.filter(i => String(i.flag1) === '1').length} Live for Guests)
          </div>
        )}
      </div>

      {/* Main Grid / Grouped Sections (TiyaOnline Style) */}
      {loading ? (
        <div className="loading-text">Bhai, maal load ho raha hai...</div>
      ) : displayedStock.length === 0 ? (
        <div className="no-data">Bhai, is filter me koi item nahi mila!</div>
      ) : (
        <div className="collection-groups-container">
          {Object.entries(groupedStock).map(([groupTitle, items]) => (
            <section key={groupTitle} className="collection-group-section">
              <div className="collection-group-header">
                <div className="group-header-title-box">
                  <span className="group-header-icon">✨</span>
                  <h2 className="group-header-title">{groupTitle}</h2>
                  <span className="group-header-count">
                    ({items.length} {items.length === 1 ? 'Product' : 'Products'})
                  </span>
                </div>
                <div className="group-header-line"></div>
              </div>

              <div className="products-grid">
                {items.map((item) => renderProductCard(item))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Upload Modal (Non-Guest Users) */}
      {isModalOpen && isStaffUser(userRole) && (
        <div className="tx-modal-overlay">
          <div className="tx-modal-content">
            <h3>📸 Tag ID: {selectedTag} ke liye Photos Upload</h3>
            <p className="modal-help-text">Aap ek sath 4-6 alag angles ki photos select kar sakte hain.</p>
            
            <form onSubmit={handleUploadSubmit}>
              <div className="file-input-group">
                <input type="file" multiple accept="image/*" onChange={handleFileChange} id="multi-file-picker" />
                <label htmlFor="multi-file-picker" className="custom-file-label">
                  📁 Select Images ({selectedFiles.length} selected)
                </label>
              </div>
              <div className="preview-selected-container">
                {selectedFiles.map((file, idx) => (
                  <div className="preview-selected-badge" key={idx}>{file.name}</div>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : '🚀 Start Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Zoom Modal (Scoped to Selected Product) */}
      {lightboxData && lightboxData.images.length > 0 && (
        <div 
          className="lightbox-overlay" 
          onClick={handleCloseLightbox}
        >
          {/* Close Button */}
          <button 
            type="button"
            className="lightbox-close-btn" 
            onClick={(e) => { e.stopPropagation(); handleCloseLightbox(); }}
            title="Close (Esc)"
          >
            ×
          </button>

          {/* Prev Navigation Button `<` (Shown only if product has multiple images) */}
          {lightboxData.images.length > 1 && (
            <button 
              type="button"
              className="lightbox-nav-btn prev" 
              onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
              title="Previous Image (Left Arrow)"
              aria-label="Previous image"
            >
              &#10094;
            </button>
          )}

          {/* Zoomed Image Container */}
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxData.images[lightboxData.currentIndex]} 
              alt={lightboxData.item.itemName || 'Zoomed Item'} 
              className="lightbox-image" 
            />
          </div>

          {/* Next Navigation Button `>` (Shown only if product has multiple images) */}
          {lightboxData.images.length > 1 && (
            <button 
              type="button"
              className="lightbox-nav-btn next" 
              onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
              title="Next Image (Right Arrow)"
              aria-label="Next image"
            >
              &#10095;
            </button>
          )}

          {/* Informational Pill / Counter Bar */}
          <div className="lightbox-info-bar" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-info-title">
              {lightboxData.item.itemName}
            </span>
            <span className="lightbox-info-tag">
              Tag: {lightboxData.item.tagId}
            </span>
            <span className="lightbox-info-counter">
              {lightboxData.currentIndex + 1} / {lightboxData.images.length}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default Collection;
