import React, { useState, useEffect, useCallback } from 'react';
import { baseURL } from '../apiConfig';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
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

  // Management Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Photo Zoom / Lightbox State (Scoped to Selected Product)
  const [lightboxData, setLightboxData] = useState(null);

  // Customer Enquiry Modal States
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryItem, setEnquiryItem] = useState({ tagId: '', itemName: '' });
  const [enquiryForm, setEnquiryForm] = useState({
    customerName: '',
    customerMobile: '',
    customerRemarks: ''
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

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
        const items = Array.isArray(response.data) ? response.data : (response.data.data || []);
        
        // Extract unique Groups
        const uniqueGroups = [...new Set(items.map(m => m.item_group).filter(Boolean))].sort();
        setGroupOptions(uniqueGroups);

        // Extract unique Items for the default "all" state
        const uniqueItems = [...new Set(items.map(m => m.item_name).filter(Boolean))].sort();
        setItemOptions(uniqueItems);
        
        // Store raw master list inside window or state if needed for faster dropdown filtering
        window.masterCatalog = items;
      }
    } catch (error) {
      console.error("Master Table fetch error:", error);
    }
  };

  const handleGroupChange = (selectedGroup) => {
    setGroup(selectedGroup);
    setItemName('all');

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
      const response = await axios.get(`${baseURL}/api/stock-report/?group=${group}&item=${itemName}`);
      if (response.data.success) {
        setStockData(response.data.data);
      }
    } catch (error) {
      console.error("Data lane me error:", error);
    }
    setLoading(false);
  }, [group, itemName]);

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
  }, []);

  // Fetch Stock jab filter ya page load ho
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Sorting
  const getSortedData = () => {
    let sorted = [...stockData];
    if (sortBy === 'groupAsc') {
      sorted.sort((a, b) => a.group.localeCompare(b.group));
    } else if (sortBy === 'groupDesc') {
      sorted.sort((a, b) => b.group.localeCompare(a.group));
    } else if (sortBy === 'itemAsc') {
      sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
    } else if (sortBy === 'itemDesc') {
      sorted.sort((a, b) => b.itemName.localeCompare(a.itemName));
    }
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
  const addToCart = (item) => {
    if (!item.available_quantity || parseFloat(item.available_quantity) <= 0) {
      alert("Sorry ! This item is currently out of Stock, Please ! Try Later");
      return;
    }

    const savedCart = localStorage.getItem('userCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];

    // Check if already in cart
    const exists = cart.find(c => c.tagId === item.tagId);
    if (exists) {
      alert("Yeh item pehle se cart me add hai!");
      return;
    }

    // Default rate hum DP lenge
    const itemRate = parseFloat(item.dp || 0);
    const itemSp = parseFloat(item.sp || 0);

    const newCartItem = {
      tagId: item.tagId,
      itemName: item.itemName,
      rate: itemRate,
      sp: itemSp,
      quantity: 1,
      maxQty: parseFloat(item.available_quantity), // Store max available quantity
      itemTotal: itemRate * 1,
      itemTotalSP: itemSp * 1
    };

    cart.push(newCartItem);
    localStorage.setItem('userCart', JSON.stringify(cart));
    alert(`${item.itemName} Cart me add ho gaya hai! Upar cart icon par click karke order place karein.`);
  };

  const finalSortedStock = getSortedData();

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

      {/* 🛠️ 2. Manage Settings Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px' }}>
        <button 
          onClick={() => setShowScreensaverSettings(!showScreensaverSettings)}
          style={{
            background: '#212121',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {showScreensaverSettings ? '✖ Close Screensaver Settings' : '🖥️ Screensaver Settings'}
        </button>

        {isStaffUser(userRole) && (
          <button 
            onClick={() => setIsEditingOffer(!isEditingOffer)}
            style={{
              background: '#212121',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {isEditingOffer ? '⚙️ Close Control Panel' : '⚙️ Manage Offer Banner'}
          </button>
        )}
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

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Group:</label>
          <select value={group} onChange={(e) => handleGroupChange(e.target.value)}>
            <option value="all">All Groups</option>
            {groupOptions.map((g, index) => (
              <option key={index} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Item Name:</label>
          <select value={itemName} onChange={(e) => setItemName(e.target.value)}>
            <option value="all">All Items</option>
            {itemOptions.map((p, index) => (
              <option key={index} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="groupAsc">Group (A-Z)</option>
            <option value="groupDesc">Group (Z-A)</option>
            <option value="itemAsc">Item Name (A-Z)</option>
            <option value="itemDesc">Item Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="loading-text">Bhai, maal load ho raha hai...</div>
      ) : (
        <div className="products-grid">
          {finalSortedStock.length === 0 ? (
            <div className="no-data">Bhai, is filter me koi item nahi mila!</div>
          ) : (
            finalSortedStock.map((item) => {
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
                      <button 
                        className="upload-btn" 
                        onClick={() => addToCart(item)}
                        style={{ backgroundColor: '#2874f0', color: '#fff', borderColor: '#2874f0' }}
                      >
                        🛒 Add to Cart
                      </button>
                    ) : (
                      <button className="upload-btn" onClick={() => openUploadModal(item.tagId)}>
                        {item.imageUrl ? '🔄 Add/Change Photos' : '📸 Upload Photos'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
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