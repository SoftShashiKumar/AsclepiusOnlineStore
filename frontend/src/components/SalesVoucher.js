import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { baseURL } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import ShareBillModal from './ShareBillModal';
import './SalesVoucher.css';

function SalesVoucher() {
  const { firmProfile } = useContext(FirmProfileContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [salesOrderId, setSalesOrderId] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [savedBillInfo, setSavedBillInfo] = useState(null);

  // --- REFS FOR FOCUS MANAGEMENT ---
  const salesOrderRef = React.useRef(null);
  const tagRef = React.useRef(null);
  const groupRef = React.useRef(null);
  const itemNameRef = React.useRef(null);
  const quantityRef = React.useRef(null);
  const addItemRef = React.useRef(null);
  const paymentModeRef = React.useRef(null);

  // --- CATALOG ITEMS STATE (from item_master) ---
  const [catalogItems, setCatalogItems] = useState([]);
  
  // Filtering and cascading options
  const [availableTags, setAvailableTags] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [availableItemNames, setAvailableItemNames] = useState([]);

  // --- ITEM INPUT STATES ---
  const [tagId, setTagId] = useState('-');
  const [group, setGroup] = useState('-');
  const [itemName, setItemName] = useState('-');
  const [quantity, setQuantity] = useState('1'); 
  const [priceType, setPriceType] = useState('DP'); // Default is DP
  
  // Dynamic prices based on selected item
  const [itemMRP, setItemMRP] = useState(0);
  const [itemDP, setItemDP] = useState(0);
  const [itemSP, setItemSP] = useState(0); // For Sponsor Point / Sales Point
  
  // Single item calculated total
  const [itemTotal, setItemTotal] = useState(0);

  // --- GRID / CART STATE ---
  const [itemsList, setItemsList] = useState([]);
  const [overallBillTotal, setOverallBillTotal] = useState(0);
  const [overallSPTotal, setOverallSPTotal] = useState(0);

  // --- CUSTOMER & VOUCHER STATES ---
  const [customersList, setCustomersList] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]); // Array to store pending sales orders
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [asclepiusId, setAsclepiusId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  
  const [billDate, setBillDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }); 
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [cashAmount, setCashAmount] = useState('');
  const [creditAmount, setCreditAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  // Searchable TAG combobox states
  const [tagSearch, setTagSearch] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
  const tagComboboxRef = React.useRef(null);

  // Customer Modal States (for Credit Sales Registration)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [modalCustomerForm, setModalCustomerForm] = useState({
    cname: '',
    mobile1: '',
    mobile2: '',
    email: '',
    ds_id: '',
    address: '',
    remarks: ''
  });

  const handleClearModalCustomer = () => {
    setModalCustomerForm({
      cname: '',
      mobile1: '',
      mobile2: '',
      email: '',
      ds_id: '',
      address: '',
      remarks: ''
    });
  };

  const handleOpenAddCustomerModal = () => {
    handleClearModalCustomer();
    setIsCustomerModalOpen(true);
  };
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const isCreditPaymentMode = (mode) => {
    return mode === 'Credit' || mode === 'Cash & Credit' || mode === 'Cash & UPI & Credit' || mode === 'Adjust';
  };

  // --- NEW STATES FOR CREDIT AND AVAIL QTY ---
  const [currentDues, setCurrentDues] = useState(0);
  const [itemAvailableQty, setItemAvailableQty] = useState(0);

  // --- SP CALCULATION & ACTION STATES ---
  const [spCalculationType, setSpCalculationType] = useState('Regular'); // 'Regular', 'Hold', 'Adjust'
  const [selectedActionType, setSelectedActionType] = useState('');
  const [activationSubAction, setActivationSubAction] = useState('');
  const [repurchaseSubAction, setRepurchaseSubAction] = useState('');
  const [forId, setForId] = useState('');
  const [forName, setForName] = useState('');
  const [useSP, setUseSP] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [customerActionsList, setCustomerActionsList] = useState([]);

  // --- SEARCHABLE COMBOBOX REFS & ACTIVE DROPDOWN STATE ---
  const [activeCustDropdown, setActiveCustDropdown] = useState(null);
  const custDsRef = React.useRef(null);
  const custNameRef = React.useRef(null);
  const custMobileRef = React.useRef(null);
  const custAddressRef = React.useRef(null);
  const spForIdRef = React.useRef(null);
  const spForNameRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInside = 
        (custDsRef.current && custDsRef.current.contains(e.target)) ||
        (custNameRef.current && custNameRef.current.contains(e.target)) ||
        (custMobileRef.current && custMobileRef.current.contains(e.target)) ||
        (custAddressRef.current && custAddressRef.current.contains(e.target)) ||
        (spForIdRef.current && spForIdRef.current.contains(e.target)) ||
        (spForNameRef.current && spForNameRef.current.contains(e.target));
      if (!isInside) {
        setActiveCustDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (c) => {
    if (!c) return;
    setSelectedCustomerId(c.id);
    setAsclepiusId(c.ds_id || '');
    setCustomerName(c.name || '');
    setMobile(c.mobile || '');
    setAddress(c.address || '');
    setCurrentDues(parseFloat(c.current_dues || 0));
    setForId(c.ds_id || '');
    setForName(c.name || '');
    setActiveCustDropdown(null);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setAsclepiusId('');
    setCustomerName('');
    setMobile('');
    setAddress('');
    setCurrentDues(0);
    setActiveCustDropdown(null);
  };

  const filteredCustByDs = customersList.filter(c => {
    if (!asclepiusId.trim()) return true;
    return (c.ds_id || '').toLowerCase().includes(asclepiusId.trim().toLowerCase());
  });

  const filteredCustByName = customersList.filter(c => {
    if (!customerName.trim()) return true;
    return (c.name || '').toLowerCase().includes(customerName.trim().toLowerCase());
  });

  const filteredCustByMobile = customersList.filter(c => {
    if (!mobile.trim()) return true;
    return (c.mobile || '').includes(mobile.trim()) || (c.mobile2 || '').includes(mobile.trim());
  });

  const filteredCustByAddress = customersList.filter(c => {
    if (!address.trim()) return true;
    return (c.address || '').toLowerCase().includes(address.trim().toLowerCase());
  });

  const filteredSpForId = customersList.filter(c => {
    if (!forId.trim()) return true;
    return (c.ds_id || '').toLowerCase().includes(forId.trim().toLowerCase()) ||
           (c.name || '').toLowerCase().includes(forId.trim().toLowerCase());
  });

  const filteredSpForName = customersList.filter(c => {
    if (!forName.trim()) return true;
    return (c.name || '').toLowerCase().includes(forName.trim().toLowerCase()) ||
           (c.ds_id || '').toLowerCase().includes(forName.trim().toLowerCase());
  });

  const handleForIdChange = (val) => {
    setForId(val);
    const query = (val || '').trim().toLowerCase();
    if (!query) {
      setForName('');
      return;
    }
    const matched = customersList.find(c => {
      const ref = (c.ds_id || c.referance || '').trim().toLowerCase();
      return ref === query;
    });
    if (matched) {
      setForName(matched.name || matched.cname || '');
    } else {
      setForName('');
    }
  };

  const handleActionTypeChange = (type) => {
      if (type === 'Activation' && overallSPTotal < 27) {
          alert("TSP minimum 27 se v kam hai!");
          return;
      }
      setSelectedActionType(type);
      if (type !== 'Activation') setActivationSubAction('');
      if (type !== 'Repurchase') setRepurchaseSubAction('');
  };

  useEffect(() => {
      const distSP = customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0);
      const rem = overallSPTotal - distSP;
      setUseSP(rem >= 0 ? rem.toString() : '0');
  }, [overallSPTotal, customerActionsList]);

  const handleAddCustomerAction = () => {
      if (!selectedActionType) {
          alert("Please select Bill Approved, Activation, or Repurchase.");
          return;
      }
      if (selectedActionType === 'Activation' && !activationSubAction) {
          alert("Please select 27, 52, or 100 for Activation.");
          return;
      }
      if (selectedActionType === 'Repurchase' && !repurchaseSubAction) {
          alert("Please select SAO or SGO for Repurchase.");
          return;
      }

      const distSP = customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0);
      const rem = overallSPTotal - distSP;
      const val = parseFloat(useSP) || 0;
      if (val <= 0 && overallSPTotal > 0) {
          alert("Use SP cannot be zero.");
          return;
      }
      if (val > rem) {
          alert("Use SP cannot be greater than Remaining SP.");
          return;
      }

      if (selectedActionType === 'Activation') {
          const reqSp = parseInt(activationSubAction, 10);
          if (val < reqSp) {
              alert(`Activation ${reqSp} ke liye Use SP kam se kam ${reqSp} hona chahiye!`);
              return;
          }
      }

      const newAction = {
          type: selectedActionType,
          subType: selectedActionType === 'Activation' ? activationSubAction : (selectedActionType === 'Repurchase' ? repurchaseSubAction : ''),
          forId: forId,
          forName: forName,
          useSP: val,
          remarks: actionRemarks
      };
      setCustomerActionsList([...customerActionsList, newAction]);
      setSelectedActionType('');
      setActivationSubAction('');
      setRepurchaseSubAction('');
      setActionRemarks('');
      setForName('');
  };

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const initializeData = async () => {
      fetchNextInvoiceNumber();
      fetchCustomers();
      fetchPendingOrders();
      const inStockItems = await fetchCatalogItems();

      if (salesOrderRef.current) {
          salesOrderRef.current.focus();
      }

      if (location.state && location.state.orderData) {
        const order = location.state.orderData;
        setSalesOrderId(order.order_number);
        setIsManualCustomer(true); // Ensure text inputs are shown
        setAsclepiusId(order.asclepius_id || '');
        setForId(order.asclepius_id || '');
        const formattedCustName = (order.customer_name || '').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        setForName(formattedCustName || order.customer_name || '');
        setCustomerName(formattedCustName || order.customer_name || '');
        setMobile(order.customer_mobile || '');
        setAddress(order.customer_address || '');
        
        // Load items
        if (order.items && order.items.length > 0) {
          let total = 0;
          let spTotal = 0;
          const newItems = order.items.map((item, idx) => {
            const qty = item.order_qty || 1;
            const rate = item.order_rate || 0;
            const itemTotalVal = qty * rate;
            
            // Find in catalog for SP
            const catItem = inStockItems.find(c => c.tag_text === item.tag_id);
            const sp = catItem ? parseFloat(catItem.sp || 0) : 0;
            const itemTotalSP = qty * sp;
            
            total += itemTotalVal;
            spTotal += itemTotalSP;
            
            return {
              id: Date.now() + idx,
              tagId: item.tag_id,
              group: catItem ? catItem.item_group : '-', 
              itemName: item.item_name,
              quantity: qty,
              priceType: 'DP', 
              rate: rate,
              sp: sp,
              itemTotal: itemTotalVal,
              itemTotalSP: itemTotalSP,
              itemId: item.tag_id || `AUTO-${Date.now() + idx}`
            };
          });
          setItemsList(newItems);
          setOverallBillTotal(total);
          setOverallSPTotal(spTotal);
        }
      }
    };
    
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSalesOrderKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (salesOrderId) {
            if (paymentModeRef.current) paymentModeRef.current.focus();
        } else {
            if (tagRef.current) tagRef.current.focus();
        }
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
          const el = document.getElementById(`tag-opt-${next}`);
          if (el) el.scrollIntoView({ block: 'nearest' });
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        setHighlightedTagIndex(prev => {
          const next = prev > 0 ? prev - 1 : filteredTags.length - 1;
          const el = document.getElementById(`tag-opt-${next}`);
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
      } else if (tagId && tagId !== '-') {
        if (quantityRef.current) quantityRef.current.focus();
      } else {
        if (groupRef.current) groupRef.current.focus();
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

  const handleGroupKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (itemNameRef.current) itemNameRef.current.focus();
    }
  };

  const handleItemNameKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (quantityRef.current) quantityRef.current.focus();
    }
  };

  const handleQuantityKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (addItemRef.current) addItemRef.current.focus();
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await fetch(`${baseURL}/api/get_next_invoice_no/`);
      const data = await response.json();
      if (data.success) {
        setInvoiceNumber(data.next_invoice_no);
      }
    } catch (error) {
      console.error("Network error while fetching invoice number:", error);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      // Strictly fetch stock_for_sale tags with available_quantity > 0
      const res = await fetch(`${baseURL}/api/sales/catalog/`);
      const data = await res.json();
      if (data.success) {
        const inStockItems = (data.data || []).filter(item => 
          item.tag_text && item.tag_text !== '-' && parseFloat(item.available_quantity || 0) > 0
        );
        setCatalogItems(inStockItems);
        updateDropdowns(inStockItems, itemsList);
        return inStockItems;
      }
    } catch (err) {
      console.error("Failed to fetch catalog:", err);
    }
    return [];
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${baseURL}/api/get_customers/`);
      const data = await res.json();
      if (data.success) {
        setCustomersList(data.customers);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch(`${baseURL}/api/sales-order/list/`);
      const data = await res.json();
      if (data.success) {
        // We only want Pending orders.
        // Group by order_number since one order can have multiple items.
        const pending = data.data.filter(o => o.status === 'Pending');
        const grouped = {};
        pending.forEach(order => {
          const ordNum = order.order_number;
          if (!grouped[ordNum]) {
            grouped[ordNum] = {
              order_number: ordNum,
              asclepius_id: order.asclepius_id || '',
              customer_name: order.customer_name || '',
              customer_mobile: order.customer_mobile || '',
              customer_address: order.customer_address || '',
              items: []
            };
          }
          grouped[ordNum].items.push(order);
        });
        setPendingOrders(Object.values(grouped));
      }
    } catch (err) {
      console.error("Failed to fetch pending orders:", err);
    }
  };

  // Keep tagSearch in sync with tagId (e.g. on reset or auto-fill)
  useEffect(() => {
    if (tagId && tagId !== '-') {
      setTagSearch(tagId);
    } else {
      setTagSearch('');
    }
  }, [tagId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagComboboxRef.current && !tagComboboxRef.current.contains(e.target)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available tags dynamically by typing (starts-with query)
  const filteredTags = availableTags.filter(tag => {
    if (!tagSearch.trim()) return true;
    return tag && tag.toLowerCase().startsWith(tagSearch.trim().toLowerCase());
  });

  const selectTag = (selected) => {
    setTagId(selected);
    setTagSearch(selected);
    setIsTagDropdownOpen(false);
    setHighlightedTagIndex(-1);
    handleTagChange(selected);
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
      setTagId('-');
      handleTagChange('-');
    } else {
      const exact = availableTags.find(t => t.toLowerCase() === val.trim().toLowerCase());
      if (exact) {
        setTagId(exact);
        handleTagChange(exact);
      }
    }
  };

  const handleTagInputFocus = () => {
    setIsTagDropdownOpen(true);
    if (filteredTags.length > 0) {
      setHighlightedTagIndex(0);
    }
  };

  // Helper to remove items already added to the cart from the dropdowns
  const updateDropdowns = (allItems, currentGridItems) => {
    const gridTags = currentGridItems.map(i => i.tagId);
    const available = allItems.filter(item => !gridTags.includes(item.tag_text));
    
    setAvailableTags([...new Set(available.map(item => item.tag_text))].filter(Boolean));
    setAvailableGroups([...new Set(available.map(item => item.item_group))].filter(Boolean));
    setAvailableItemNames([...new Set(available.map(item => item.item_name))].filter(Boolean));
  };

  // --- CASCADING DROPDOWNS LOGIC ---
  const handleTagChange = (val) => {
    setTagId(val);
    if (!val || val === '-') {
      updateDropdowns(catalogItems, itemsList);
      setGroup('-');
      setItemName('-');
      setItemMRP(0);
      setItemDP(0);
      setItemSP(0);
      setItemAvailableQty(0);
      return;
    }
    const filtered = catalogItems.filter(i => i.tag_text === val);
    if (filtered.length > 0) {
      setGroup(filtered[0].item_group);
      setItemName(filtered[0].item_name);
      setItemMRP(filtered[0].mrp || 0);
      setItemDP(filtered[0].dp || 0);
      setItemSP(filtered[0].sp || 0);
      setItemAvailableQty(filtered[0].available_quantity || 0);
    }
  };

  const handleGroupChange = (val) => {
    setGroup(val);
    setTagId('-');
    setItemName('-');
    setItemMRP(0);
    setItemDP(0);
    setItemSP(0);
    setItemAvailableQty(0);
    
    const gridTags = itemsList.map(i => i.tagId);
    const available = catalogItems.filter(item => !gridTags.includes(item.tag_text));
    
    const filtered = available.filter(i => i.item_group === val);
    setAvailableTags([...new Set(filtered.map(i => i.tag_text))].filter(Boolean));
    setAvailableItemNames([...new Set(filtered.map(i => i.item_name))].filter(Boolean));
  };

  const handleItemNameChange = (val) => {
    setItemName(val);
    if (val === '-') return;
    
    const gridTags = itemsList.map(i => i.tagId);
    const available = catalogItems.filter(item => !gridTags.includes(item.tag_text));
    
    const item = available.find(i => i.item_group === group && i.item_name === val);
    if (item) {
      setTagId(item.tag_text);
      setItemMRP(item.mrp || 0);
      setItemDP(item.dp || 0);
      setItemSP(item.sp || 0);
      setItemAvailableQty(item.available_quantity || 0);
    }
  };

  const handleOrderSelect = (e) => {
    const ordNum = e.target.value;
    if (!ordNum) return;
    
    const order = pendingOrders.find(o => o.order_number === ordNum);
    if (order) {
      setSalesOrderId(order.order_number);
      setAsclepiusId(order.asclepius_id || '');
      setForId(order.asclepius_id || '');
      setForName(order.customer_name || '');
      setCustomerName(order.customer_name || '');
      setMobile(order.customer_mobile || '');
      setAddress(order.customer_address || '');
      
      let totalBill = 0;
      let totalSP = 0;
      const newItems = order.items.map((item, idx) => {
        const qty = item.order_qty || 1;
        const rate = item.order_rate || 0;
        
        // Find item in catalog to get SP
        const catItem = catalogItems.find(c => c.tag_text === item.tag_id);
        const itemSp = catItem ? (catItem.sp || 0) : 0;
        
        const itemTotalVal = qty * rate;
        const itemTotalSP = qty * itemSp;
        
        totalBill += itemTotalVal;
        totalSP += itemTotalSP;
        
        return {
          id: Date.now() + idx,
          tagId: item.tag_id,
          group: catItem ? catItem.item_group : '-',
          itemName: item.item_name,
          quantity: qty,
          priceType: 'DP',
          rate: rate,
          sp: itemSp,
          itemTotal: itemTotalVal,
          itemTotalSP: itemTotalSP,
          itemId: item.tag_id || `AUTO-${Date.now() + idx}`
        };
      });
      setItemsList(newItems);
      setOverallBillTotal(totalBill);
      setOverallSPTotal(totalSP);
    }
  };

  // --- CALCULATE ITEM TOTAL ---
  useEffect(() => {
    const q = parseInt(quantity) || 0;
    const rate = priceType === 'DP' ? itemDP : itemMRP;
    setItemTotal(q * rate);
  }, [quantity, priceType, itemDP, itemMRP]);

  // --- CALCULATE OVERALL TOTAL ---
  useEffect(() => {
    const total = itemsList.reduce((acc, curr) => acc + curr.itemTotal, 0);
    const spTotal = itemsList.reduce((acc, curr) => acc + (curr.itemTotalSP || 0), 0);
    setOverallBillTotal(total);
    setOverallSPTotal(spTotal);
    if (paymentMode === 'Cash & Credit') {
        const cash = parseFloat(cashAmount) || 0;
        setCreditAmount(total - cash);
    } else if (paymentMode === 'Cash & UPI') {
        const cash = parseFloat(cashAmount) || 0;
        setUpiAmount(total - cash);
    } else if (paymentMode === 'Cash & UPI & Credit') {
        const cash = parseFloat(cashAmount) || 0;
        const upi = parseFloat(upiAmount) || 0;
        setCreditAmount(total - cash - upi);
    } else if (paymentMode === 'Adjust') {
        setCashAmount('');
        setCreditAmount(0);
        setUpiAmount(0);
    }

    if (selectedActionType === 'Activation') {
        if (spTotal < 27) {
            setSelectedActionType('');
            setActivationSubAction('');
        } else if (spTotal < 52 && (activationSubAction === '52' || activationSubAction === '100')) {
            setActivationSubAction('');
        } else if (spTotal < 100 && activationSubAction === '100') {
            setActivationSubAction('');
        }
    }
  }, [itemsList, paymentMode, cashAmount, upiAmount, selectedActionType, activationSubAction]);

  const handlePaymentModeChange = (newMode) => {
    setPaymentMode(newMode);
    setCashAmount('');
    if (newMode === 'Adjust') {
        setSpCalculationType('Adjust');
        setCashAmount('');
        setCreditAmount(0);
        setUpiAmount(0);
    } else if (newMode === 'Cash & UPI & Credit') {
        setUpiAmount('');
        setCreditAmount(overallBillTotal);
    } else if (newMode === 'Cash & Credit') {
        setCreditAmount(overallBillTotal);
        setUpiAmount(0);
    } else if (newMode === 'Cash & UPI') {
        setUpiAmount(overallBillTotal);
        setCreditAmount(0);
    } else {
        setCreditAmount(0);
        setUpiAmount(0);
    }

    // In credit modes, customer ledger must be tracked, so switch out of manual customer textbox
    if (isCreditPaymentMode(newMode) && isManualCustomer) {
        setIsManualCustomer(false);
        setSelectedCustomerId('');
        setAsclepiusId('');
        setCustomerName('');
        setMobile('');
        setAddress('');
        setEmail('');
        setCurrentDues(0);
        setForId('');
        setForName('');
    }
  };

  const handleCashAmountChange = (e) => {
      const val = e.target.value;
      setCashAmount(val);
      const cash = parseFloat(val) || 0;
      if (paymentMode === 'Cash & Credit') {
          setCreditAmount(overallBillTotal - cash);
      } else if (paymentMode === 'Cash & UPI') {
          setUpiAmount(overallBillTotal - cash);
      } else if (paymentMode === 'Cash & UPI & Credit') {
          const upi = parseFloat(upiAmount) || 0;
          setCreditAmount(overallBillTotal - cash - upi);
      }
  };

  const handleUpiAmountChange = (e) => {
      const val = e.target.value;
      setUpiAmount(val);
      const upi = parseFloat(val) || 0;
      if (paymentMode === 'Cash & UPI & Credit') {
          const cash = parseFloat(cashAmount) || 0;
          setCreditAmount(overallBillTotal - cash - upi);
      }
  };

  // --- ADD TO CART ---
  const handleQuantityChange = (e) => {
      const val = e.target.value;
      if (val === '') {
          setQuantity('');
          return;
      }
      const q = parseInt(val) || 0;
      if (q < 1) {
          setQuantity('1');
          return;
      }
      if (itemAvailableQty > 0 && q > itemAvailableQty) {
          alert("Available quantity se jada billing nahi ho sakti!");
          setQuantity(itemAvailableQty.toString());
      } else {
          setQuantity(val);
      }
  };

  const handleAddItem = () => {
    if (!group || group === '-' || !itemName || itemName === '-' || !quantity) {
      alert("Group, Item Name, aur Quantity daalna zaroori hai!");
      return;
    }

    const rate = priceType === 'DP' ? itemDP : itemMRP;
    const q = parseInt(quantity) || 0;
    
    if (q <= 0) {
      alert("Quantity 0 se badi honi chahiye.");
      return;
    }

    if (itemAvailableQty > 0 && q > itemAvailableQty) {
      alert("Available quantity se jada ka billing nahi ho sakti!");
      return;
    }

    const newItem = {
      tagId: tagId,
      group: group,
      itemName: itemName,
      quantity: q,
      rate: rate,
      sp: itemSP,
      priceType: priceType,
      itemTotal: q * rate,
      itemTotalSP: q * itemSP,
      itemId: tagId || `AUTO-${Date.now()}`
    };

    const newItemsList = [...itemsList, newItem];
    setItemsList(newItemsList);

    setTagId('-');
    setGroup('-');
    setItemName('-');
    setQuantity('1'); 
    setItemMRP(0);
    setItemDP(0);
    setItemSP(0);
    setItemAvailableQty(0);
    
    updateDropdowns(catalogItems, newItemsList);
    
    setTimeout(() => {
        if (tagRef.current) tagRef.current.focus();
    }, 100);
  };

  const removeItem = (index) => {
    const updatedList = itemsList.filter((_, i) => i !== index);
    setItemsList(updatedList);
    updateDropdowns(catalogItems, updatedList);
  };

  const handleCustomerSelectDropdown = (id) => {
      setSelectedCustomerId(id);
      if (!id) {
          setAsclepiusId('');
          setCustomerName('');
          setMobile('');
          setAddress('');
          setEmail('');
          setCurrentDues(0);
          setForId('');
          setForName('');
          return;
      }
      const cust = customersList.find(c => c.id.toString() === id.toString());
      if (cust) {
          setAsclepiusId(cust.ds_id || '');
          setCustomerName(cust.name || '');
          setMobile(cust.mobile || '');
          setAddress(cust.address || '');
          setEmail(cust.email || '');
          setCurrentDues(cust.current_dues || 0);
          setForId(cust.ds_id || '');
          setForName(cust.name || '');
      }
  };

  const toggleManualCustomer = () => {
      setIsManualCustomer(!isManualCustomer);
      setSelectedCustomerId('');
      setAsclepiusId('');
      setCustomerName('');
      setMobile('');
      setAddress('');
      setEmail('');
      setCurrentDues(0);
      setForId('');
  };

  const handleToggleCustomerMode = () => {
      if (isManualCustomer) {
          toggleManualCustomer();
      } else {
          if (isCreditPaymentMode(paymentMode)) {
              setModalCustomerForm({
                  ds_id: '',
                  cname: '',
                  mobile1: '',
                  address: '',
                  email: ''
              });
              setIsCustomerModalOpen(true);
          } else {
              toggleManualCustomer();
          }
      }
  };

  const handleModalCustomerChange = (e) => {
      const { name, value } = e.target;
      if (name === 'mobile1' || name === 'mobile2') {
          const cleanDigits = value.replace(/\D/g, '').slice(0, 10);
          setModalCustomerForm(prev => ({ ...prev, [name]: cleanDigits }));
      } else {
          setModalCustomerForm(prev => ({ ...prev, [name]: value }));
      }
  };

  const handleSaveNewCustomer = async (e) => {
      if (e) e.preventDefault();

      if (!modalCustomerForm.cname.trim()) {
          alert("⚠️ Customer Name dalna zaroori hai!");
          return;
      }

      // 📱 Strict Mobile 1 Validation
      const cleanMob1 = (modalCustomerForm.mobile1 || '').replace(/\D/g, '');
      if (!cleanMob1) {
          alert("⚠️ Customer ka 10-digit Mobile Number dalna anivarya (mandatory) hai!");
          return;
      }
      if (cleanMob1.length !== 10) {
          alert(`⚠️ Mobile Number bilkul 10 digits ka hona chahiye! (Aapne abhi ${cleanMob1.length} digits dale hain)`);
          return;
      }
      if (!['6', '7', '8', '9'].includes(cleanMob1[0])) {
          alert("⚠️ Mobile Number sahi nahi hai! Indian mobile number 6, 7, 8 ya 9 se shuru hona chahiye.");
          return;
      }

      // 📱 Strict Mobile 2 Validation (Optional)
      let cleanMob2 = '';
      if (modalCustomerForm.mobile2) {
          cleanMob2 = modalCustomerForm.mobile2.replace(/\D/g, '');
          if (cleanMob2.length !== 10) {
              alert(`⚠️ Mobile 2 bilkul 10 digits ka hona chahiye! (Aapne abhi ${cleanMob2.length} digits dale hain)`);
              return;
          }
          if (!['6', '7', '8', '9'].includes(cleanMob2[0])) {
              alert("⚠️ Mobile 2 sahi nahi hai! Indian mobile number 6, 7, 8 ya 9 se shuru hona chahiye.");
              return;
          }
          if (cleanMob1 === cleanMob2) {
              alert("⚠️ Mobile 1 aur Mobile 2 dono same nahi ho sakte!");
              return;
          }
      }

      const formattedCName = modalCustomerForm.cname
          .trim()
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

      setIsSavingCustomer(true);
      try {
          const payload = {
              cname: formattedCName,
              mobile1: cleanMob1,
              mobile: cleanMob1,
              mobile2: cleanMob2,
              email: modalCustomerForm.email.trim(),
              ds_id: modalCustomerForm.ds_id.trim(),
              address: modalCustomerForm.address.trim(),
              remarks: modalCustomerForm.remarks.trim() || 'Created via Sales Voucher'
          };

          const response = await fetch(`${baseURL}/api/customers/add/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (result.success) {
              alert(result.message || "Customer safaltapoorvak save ho gaya!");

              const custRes = await fetch(`${baseURL}/api/get_customers/`);
              const custData = await custRes.json();
              let updatedList = [];
              if (custData.success && custData.customers) {
                  updatedList = custData.customers;
                  setCustomersList(updatedList);
              }

              let newCust = null;
              if (result.customer && result.customer.id) {
                  newCust = updatedList.find(c => c.id === result.customer.id) || result.customer;
              } else {
                  newCust = updatedList.find(c => (payload.ds_id && c.ds_id === payload.ds_id) || (payload.mobile && c.mobile === payload.mobile)) || {
                      id: result.customer_id || Date.now(),
                      name: formattedCName,
                      ds_id: payload.ds_id,
                      mobile: payload.mobile,
                      address: payload.address,
                      email: payload.email,
                      current_dues: 0,
                      advanced_sp: 0
                  };
              }

              if (newCust) {
                  handleSelectCustomer(newCust);
                  setForId(newCust.ds_id || '');
                  setForName(newCust.name || '');
              }

              setIsCustomerModalOpen(false);
          } else {
              alert("Customer save nahi ho paya: " + (result.message || ''));
          }
      } catch (err) {
          console.error("Save customer error:", err);
          alert("Server se connect karne me problem aayi!");
      } finally {
          setIsSavingCustomer(false);
      }
  };

  const handleStartNewBill = () => {
    setItemsList([]);
    setCustomerActionsList([]);
    setAsclepiusId('');
    setCustomerName('');
    setMobile('');
    setAddress('');
    setEmail('');
    setSelectedCustomerId('');
    setSalesOrderId('');
    setCashAmount('');
    setCreditAmount(0);
    setUpiAmount(0);
    setPaymentMode('Cash');
    setTagId('');
    setTagSearch('');
    setItemName('');
    setItemCategory('');
    setQuantity(1);
    setRate(0);
    setSp(0);
    fetchNextInvoiceNumber();
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset everything?")) {

        window.location.reload();
    }
  };

  // --- SUBMIT BILL ---
  const handleSubmit = async () => {
    if (itemsList.length === 0) {
      alert("Bill banane ke liye table me kam se kam 1 item hona chahiye!");
      return;
    }
    
    let currentCustomerIdToUse = selectedCustomerId;

    if (!currentCustomerIdToUse && (asclepiusId.trim() || customerName.trim() || mobile.trim())) {
      const existingMatch = customersList.find(c =>
        (c.ds_id && asclepiusId.trim() && c.ds_id.trim().toLowerCase() === asclepiusId.trim().toLowerCase()) ||
        (c.mobile && mobile.trim() && c.mobile.trim() === mobile.trim())
      );

      if (existingMatch) {
        currentCustomerIdToUse = existingMatch.id;
        setSelectedCustomerId(existingMatch.id);
      } else {
        const userConfirmed = window.confirm("ye Customer Table me Added nahi hai, kya ise v jor lena hai?");
        if (userConfirmed) {
          try {
            const addResponse = await fetch(`${baseURL}/api/customers/add/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cname: customerName,
                mobile1: mobile,
                address: address,
                ds_id: asclepiusId,
                status: "Active"
              })
            });
            const addData = await addResponse.json();
            if (addData.success && addData.customer) {
              currentCustomerIdToUse = addData.customer.id;
              setSelectedCustomerId(addData.customer.id);
              setCustomersList(prev => [...prev, addData.customer]);
            }
          } catch (err) {
            console.error("Error auto-adding customer:", err);
          }
        }
      }
    }

    if (isCreditPaymentMode(paymentMode) && !currentCustomerIdToUse) {
        alert("Selected payment mode (" + paymentMode + ") ke liye customer ka Customers table me hona zaroori hai! Kripya dropdown se select karein ya table me jor lein.");
        return;
    }

    if (spCalculationType === 'Adjust' && !selectedCustomerId) {
        alert("SP Adjust karne ke liye dropdown se customer select karna zaroori hai!");
        return;
    }

    if ((paymentMode === 'Cash & Credit' || paymentMode === 'Cash & UPI & Credit') && creditAmount < 0) {
        alert("Paid amount (Cash + UPI) cannot be greater than Grand Total!");
        return;
    }

    const cashVal = parseFloat(cashAmount) || 0;
    const upiVal = parseFloat(upiAmount) || 0;
    const creditVal = parseFloat(creditAmount) || 0;

    let finalCash = 0;
    let finalUpi = 0;
    let finalCredit = 0;
    let finalSettlement = overallBillTotal;

    if (paymentMode === 'Cash') {
      finalCash = overallBillTotal;
    } else if (paymentMode === 'UPI') {
      finalUpi = overallBillTotal;
    } else if (paymentMode === 'Credit') {
      finalCredit = overallBillTotal;
    } else if (paymentMode === 'Cash & Credit') {
      finalCash = cashVal;
      finalCredit = creditVal;
      finalSettlement = cashVal;
    } else if (paymentMode === 'Cash & UPI') {
      finalCash = cashVal;
      finalUpi = upiVal;
      finalSettlement = overallBillTotal;
    } else if (paymentMode === 'Cash & UPI & Credit') {
      finalCash = cashVal;
      finalUpi = upiVal;
      finalCredit = creditVal;
      finalSettlement = cashVal + upiVal;
    } else if (paymentMode === 'Adjust') {
      finalCash = 0;
      finalUpi = 0;
      finalCredit = 0;
      finalSettlement = overallBillTotal;
    }

    // Gather customerActionsList into comma separated strings
    const repurchaseArr = customerActionsList.map(a => {
        if (a.type === 'Bill Approved') return 'Bill Approved';
        if (a.type === 'Repurchase') return a.subType;
        return null;
    }).filter(Boolean);

    const activationArr = customerActionsList.map(a => {
        if (a.type === 'Activation') return `Act_${a.subType}`;
        return null;
    }).filter(Boolean);

    const forIdsArr = customerActionsList.map(a => a.forId).filter(Boolean);
    const forNamesArr = customerActionsList.map(a => a.forName).filter(Boolean);
    const useSpArr = customerActionsList.map(a => a.useSP);
    const remarksArr = customerActionsList.map(a => a.remarks);

    const payload = {
      invoiceNumber: invoiceNumber,
      billDate: billDate,
      asclepiusId: asclepiusId,
      customerName: customerName,
      mobile: mobile,
      address: address,
      email: email,
      paymentMode: paymentMode,
      billType: 'Regular',
      salesOrderId: salesOrderId,
      items: itemsList,
      overallBillTotal: overallBillTotal,
      overallSPTotal: overallSPTotal,
      billSettlementAmt: finalSettlement,
      creditAmount: finalCredit,
      cashAmount: finalCash,
      upiAmount: finalUpi,
      selectedCustomerId: currentCustomerIdToUse || selectedCustomerId,
      soldBy: sessionStorage.getItem('username') || localStorage.getItem('username') || 'Admin',
      status: 'Saved',
      repurchase: repurchaseArr.join(','),
      activation: activationArr.join(','),
      forIds: forIdsArr.join(','),
      forNames: forNamesArr.join(','),
      forName: forNamesArr.join(','),
      actionUseSPs: useSpArr.join(','),
      actionRemarks: remarksArr.join(','),
      customerActions: customerActionsList,
      spCalculationType: spCalculationType
    };

    try {
      const response = await fetch(`${baseURL}/api/save-invoice/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        // 1. PDF ko naye tab me open karna (Receipt voucher ki tarah)
        window.open(url, '_blank');
        setSavedBillInfo({
          id: invoiceNumber,
          customerName: customerName,
          mobile: mobile,
          amount: overallBillTotal,
          pdfBlobUrl: url
        });
        setIsShareModalOpen(true);
      } else {
        const result = await response.json();
        alert("Invoice save nahi ho paya: " + result.message);
      }
    } catch (err) {
      alert("Server Error.");
    }
  };

  return (
    <div className="sales-voucher-container">
      <div className="voucher-titlebar">Sales Voucher</div>

      {/* ITEMS ENTRY BOX */}
      <div className="voucher-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="section-label" style={{ margin: 0 }}>Items Details</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* --- ROW 1 --- */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="input-box" style={{ width: '250px' }}>
              <label style={{ color: '#f39c12', fontWeight: 'bold', textTransform: 'uppercase' }}>Sales Order</label>
              <select className="uniform-input" style={{ width: '100%' }} onChange={handleOrderSelect} value={salesOrderId || ''} ref={salesOrderRef} onKeyDown={handleSalesOrderKeyDown}>
                <option value="">-- Select Pending Order --</option>
                {pendingOrders.map(order => (
                  <option key={order.order_number} value={order.order_number}>
                    {order.order_number}_{order.asclepius_id || 'N/A'}_{order.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-box" style={{ width: '130px', position: 'relative' }} ref={tagComboboxRef}>
              <label>TAG</label>
              <div className="tag-combobox-wrapper">
                <input
                  type="text"
                  className="uniform-input"
                  placeholder="Type TAG..."
                  value={tagSearch}
                  onChange={handleTagInputChange}
                  onFocus={handleTagInputFocus}
                  onKeyDown={handleTagKeyDown}
                  ref={tagRef}
                  autoComplete="off"
                />
                {isTagDropdownOpen && (
                  <ul className="tag-dropdown-list">
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag, idx) => (
                        <li
                          id={`tag-opt-${idx}`}
                          key={tag}
                          className={`tag-dropdown-item ${idx === highlightedTagIndex ? 'highlighted' : ''}`}
                          onMouseDown={() => selectTag(tag)}
                        >
                          {tag}
                        </li>
                      ))
                    ) : (
                      <li className="tag-dropdown-empty">No matching TAG</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="input-box" style={{ flex: '1 1 150px' }}>
              <label>GROUP</label>
              <select className="uniform-input" value={group} onChange={(e) => handleGroupChange(e.target.value)} ref={groupRef} onKeyDown={handleGroupKeyDown}>
                <option value="-">-</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="input-box" style={{ flex: '2 1 200px' }}>
              <label>ITEM NAME</label>
              <select className="uniform-input" value={itemName} onChange={(e) => handleItemNameChange(e.target.value)} ref={itemNameRef} onKeyDown={handleItemNameKeyDown}>
                <option value="-">-</option>
                {availableItemNames.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* --- ROW 2 --- */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="input-box" style={{ width: '100px' }}>
              <label>QUANTITY</label>
              <input 
                type="number" 
                className="uniform-input"
                value={quantity} 
                onChange={handleQuantityChange} 
                placeholder="1"
                min="1"
                ref={quantityRef}
                onKeyDown={handleQuantityKeyDown}
              />
              <span style={{ display: 'inline-block', fontSize: '11px', color: '#2ecc71', marginTop: '2px', fontWeight: 'bold' }}>Available: {itemAvailableQty}</span>
            </div>

            <div className="input-box readonly" style={{ width: '80px' }}>
              <label>SP</label>
              <input 
                type="text" 
                className="uniform-input"
                readOnly 
                value={itemSP ? parseFloat(itemSP).toFixed(2) : "0.00"} 
              />
            </div>

            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', marginBottom: '4px' }}>RATE</label>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '34px', whiteSpace: 'nowrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', color: priceType === 'MRP' ? '#2ecc71' : '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="radio" name="priceType" value="MRP" checked={priceType === 'MRP'} onChange={(e) => setPriceType(e.target.value)} style={{width: '16px', height: '16px', accentColor: '#2ecc71'}} />
                  MRP - {(itemMRP || 0).toLocaleString('en-IN')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', color: priceType === 'DP' ? '#2ecc71' : '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="radio" name="priceType" value="DP" checked={priceType === 'DP'} onChange={(e) => setPriceType(e.target.value)} style={{width: '16px', height: '16px', accentColor: '#2ecc71'}} />
                  DP - {(itemDP || 0).toLocaleString('en-IN')}
                </label>
              </div>
            </div>

            <div className="input-box readonly" style={{ width: '200px' }}>
              <label>TOTAL</label>
              <input 
                type="text" 
                className="uniform-input"
                readOnly 
                value={`₹ ${(itemTotal || 0).toLocaleString('en-IN')}`}
                style={{ fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ flex: '0 0 120px', marginTop: '22px' }}>
              <button className="btn-add" onClick={handleAddItem} ref={addItemRef} style={{ width: '100%', height: '35px', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add Item</button>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC CART / GRID */}
      <div className="table-wrapper-custom" style={{ margin: '0 20px', overflowX: 'auto', background: '#1a1a1a', borderRadius: '4px', border: '1px solid #444' }}>
        <table className="items-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Tag</th>
              <th>Group</th>
              <th>Item Name</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>SP</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {itemsList.map((item, index) => (
              <tr key={index}>
                <td>
                  <button className="btn-remove" onClick={() => removeItem(index)}>X</button>
                </td>
                <td>{item.tagId || '-'}</td>
                <td>{item.group}</td>
                <td>{item.itemName}</td>
                <td>{item.quantity}</td>
                <td>₹ {(item.rate || 0).toLocaleString('en-IN')} ({item.priceType})</td>
                <td>{parseFloat(item.itemTotalSP || 0).toFixed(2)}</td>
                <td>₹ {(item.itemTotal || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {itemsList.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '15px', color: '#aaa' }}>No items added to the voucher yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOMER DETAILS */}
      <div className="voucher-section">
        <div className="section-label">Customer Information</div>
        
        <div className="form-row-custom">
          <div className="input-box">
            <label>INVOICE NUMBER</label>
            <input type="text" readOnly className="uniform-input" value={`${firmProfile?.invoice_prefix || 'INV'}-${invoiceNumber}`} />
          </div>

          <div className="input-box">
            <label>ORDER NUMBER</label>
            <input type="text" readOnly className="uniform-input" value={salesOrderId || 'N/A'} style={{ color: '#d4af37' }} />
          </div>

          <div className="input-box">
            <label>PAYMENT MODE</label>
            <select className="uniform-input" value={paymentMode} onChange={(e) => handlePaymentModeChange(e.target.value)} ref={paymentModeRef}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Credit">Credit</option>
              <option value="Adjust">Adjust</option>
              <option value="Cash & Credit">Cash & Credit</option>
              <option value="Cash & UPI">Cash & UPI</option>
              <option value="Cash & UPI & Credit">Cash & UPI & Credit</option>
            </select>
          </div>

          <div className="input-box">
            <label>DATE</label>
            <input type="date" className="uniform-input" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
        </div>

        <div className="form-row-custom" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Combobox 1: DS Code */}
          <div className="input-box" style={{ flex: '1 1 20%', position: 'relative' }} ref={custDsRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <label style={{ margin: 0 }}>DS CODE</label>
              <span
                style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                onClick={handleOpenAddCustomerModal}
                title="Add New Customer"
              >
                + New
              </span>
            </div>
            <div className="sales-combobox-wrapper">
              <input
                type="text"
                className="uniform-input"
                placeholder="Search / Type DS Code..."
                value={asclepiusId}
                autoComplete="off"
                onFocus={() => setActiveCustDropdown('ds')}
                onChange={(e) => {
                  setAsclepiusId(e.target.value);
                  setActiveCustDropdown('ds');
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
              />
              {activeCustDropdown === 'ds' && (
                <ul className="sales-dropdown-list">
                  {filteredCustByDs.length > 0 ? (
                    filteredCustByDs.slice(0, 50).map((c) => (
                      <li
                        key={c.id}
                        className="sales-dropdown-item"
                        onMouseDown={() => handleSelectCustomer(c)}
                      >
                        <span className="sales-drop-code">{c.ds_id || '(No DS Code)'}</span>
                        <span className="sales-drop-sub">{c.name} ({c.mobile || '-'})</span>
                      </li>
                    ))
                  ) : (
                    <li className="sales-dropdown-empty">No matching customer found</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Combobox 2: Customer Name */}
          <div className="input-box" style={{ flex: '1 1 22%', position: 'relative' }} ref={custNameRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <label style={{ margin: 0 }}>CUSTOMER NAME</label>
              <span
                style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                onClick={handleOpenAddCustomerModal}
                title="Add New Customer"
              >
                + New
              </span>
            </div>
            <div className="sales-combobox-wrapper">
              <input
                type="text"
                className="uniform-input"
                placeholder="Search / Type Name..."
                value={customerName}
                autoComplete="off"
                onFocus={() => setActiveCustDropdown('name')}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setActiveCustDropdown('name');
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
              />
              {activeCustDropdown === 'name' && (
                <ul className="sales-dropdown-list">
                  {filteredCustByName.length > 0 ? (
                    filteredCustByName.slice(0, 50).map((c) => (
                      <li
                        key={c.id}
                        className="sales-dropdown-item"
                        onMouseDown={() => handleSelectCustomer(c)}
                      >
                        <span className="sales-drop-code">{c.name}</span>
                        <span className="sales-drop-sub">DS: {c.ds_id || '-'} | Mob: {c.mobile || '-'}</span>
                      </li>
                    ))
                  ) : (
                    <li className="sales-dropdown-empty">No matching customer found</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Combobox 3: Mobile */}
          <div className="input-box" style={{ flex: '1 1 18%', position: 'relative' }} ref={custMobileRef}>
            <label>MOBILE</label>
            <div className="sales-combobox-wrapper">
              <input
                type="text"
                className="uniform-input"
                placeholder="Search / Type Mobile..."
                value={mobile}
                autoComplete="off"
                onFocus={() => setActiveCustDropdown('mobile')}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setActiveCustDropdown('mobile');
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
              />
              {activeCustDropdown === 'mobile' && (
                <ul className="sales-dropdown-list">
                  {filteredCustByMobile.length > 0 ? (
                    filteredCustByMobile.slice(0, 50).map((c) => (
                      <li
                        key={c.id}
                        className="sales-dropdown-item"
                        onMouseDown={() => handleSelectCustomer(c)}
                      >
                        <span className="sales-drop-code">{c.mobile || '(No Mobile)'}</span>
                        <span className="sales-drop-sub">{c.name} (DS: {c.ds_id || '-'})</span>
                      </li>
                    ))
                  ) : (
                    <li className="sales-dropdown-empty">No matching customer found</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Combobox 4: Address */}
          <div className="input-box" style={{ flex: '1 1 30%', position: 'relative' }} ref={custAddressRef}>
            <label>ADDRESS</label>
            <div className="sales-combobox-wrapper">
              <input
                type="text"
                className="uniform-input"
                placeholder="Search / Type Address..."
                value={address}
                autoComplete="off"
                onFocus={() => setActiveCustDropdown('address')}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setActiveCustDropdown('address');
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
              />
              {activeCustDropdown === 'address' && (
                <ul className="sales-dropdown-list">
                  {filteredCustByAddress.length > 0 ? (
                    filteredCustByAddress.slice(0, 50).map((c) => (
                      <li
                        key={c.id}
                        className="sales-dropdown-item"
                        onMouseDown={() => handleSelectCustomer(c)}
                      >
                        <span className="sales-drop-code">{c.address || '(No Address)'}</span>
                        <span className="sales-drop-sub">{c.name} (DS: {c.ds_id || '-'})</span>
                      </li>
                    ))
                  ) : (
                    <li className="sales-dropdown-empty">No matching customer found</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Clean status line below inputs (no box, just clean text directly under dropdown) */}
        {selectedCustomerId && (
          <div style={{ marginTop: '8px', paddingLeft: '2px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>
              Balance: <span style={{ color: currentDues > 0 ? '#ff5252' : '#2ecc71' }}>
                ₹{Math.abs(currentDues).toLocaleString('en-IN')} {currentDues > 0 ? '(Due)' : (currentDues < 0 ? '(Advance)' : '(Clear)')}
              </span>
            </span>
            {customersList.find(c => c.id.toString() === selectedCustomerId.toString())?.advanced_sp > 0 && (
              <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                (Adv. SP: {customersList.find(c => c.id.toString() === selectedCustomerId.toString())?.advanced_sp})
              </span>
            )}
          </div>
        )}
      </div>

      {/* SP CALCULATION SECTION (Distinct Box with section-label like Customer Information) */}
      <div className="voucher-section sp-calculation-section" style={{ marginTop: '36px' }}>
        <div className="section-label">SP Calculation</div>

        {/* Header: Calculation Mode on the LEFT */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: spCalculationType === 'Hold' ? '0' : '15px',
          paddingBottom: '10px',
          borderBottom: spCalculationType === 'Hold' ? 'none' : '1px solid #333'
        }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#bfa15f', margin: 0, textTransform: 'uppercase' }}>
            Calculation Mode:
          </label>
          <select
            value={spCalculationType}
            onChange={(e) => setSpCalculationType(e.target.value)}
            className="uniform-input"
            style={{
              width: '140px',
              height: '32px',
              fontWeight: 'bold',
              color: spCalculationType === 'Hold' ? '#f39c12' : (spCalculationType === 'Adjust' ? '#2ecc71' : '#fff'),
              borderColor: spCalculationType === 'Hold' ? '#f39c12' : (spCalculationType === 'Adjust' ? '#2ecc71' : '#555')
            }}
          >
            <option value="Regular">Regular</option>
            <option value="Hold">Hold</option>
            <option value="Adjust">Adjust</option>
          </select>

          {spCalculationType === 'Adjust' && selectedCustomerId && (
            <span style={{ fontSize: '12px', color: '#2ecc71', fontWeight: 'bold', backgroundColor: '#1a1a1a', padding: '3px 10px', borderRadius: '4px', border: '1px solid #2ecc71' }}>
              Available Adv. SP: {customersList.find(c => c.id.toString() === selectedCustomerId.toString())?.advanced_sp || 0}
            </span>
          )}
        </div>

        {/* When Hold: Present options are invisible */}
        {spCalculationType === 'Hold' ? (
            <div style={{ padding: '15px', backgroundColor: '#1a1a1a', border: '1px dashed #f39c12', borderRadius: '4px', color: '#f39c12', fontSize: '13px', textAlign: 'center', marginTop: '10px' }}>
                ⏸️ <strong>SP on Hold:</strong> All SP adjustment options are hidden. Make Bill is enabled, and bill TSP ({parseFloat(overallSPTotal || 0).toFixed(2)}) will be recorded as <strong>Hold</strong> in Billwise SP Settlement and Invoice.
            </div>
        ) : (
            <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Action Type Radios */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', minHeight: '34px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="radio" name="actionType" value="Bill Approved" checked={selectedActionType === 'Bill Approved'} onChange={(e) => handleActionTypeChange(e.target.value)} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Bill Approved
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="radio" name="actionType" value="Activation" checked={selectedActionType === 'Activation'} onChange={(e) => handleActionTypeChange(e.target.value)} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Activation
                            </label>
                            {selectedActionType === 'Activation' && (
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', padding: '3px 8px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '4px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                                        <input type="radio" name="actSubType" value="27" checked={activationSubAction === '27'} onChange={(e) => {setActivationSubAction(e.target.value);}} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 27
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: overallSPTotal >= 52 ? 'pointer' : 'not-allowed', opacity: overallSPTotal >= 52 ? 1 : 0.5, whiteSpace: 'nowrap', fontSize: '12px' }}>
                                        <input type="radio" name="actSubType" value="52" checked={activationSubAction === '52'} disabled={overallSPTotal < 52} onChange={(e) => {setActivationSubAction(e.target.value);}} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 52
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: overallSPTotal >= 100 ? 'pointer' : 'not-allowed', opacity: overallSPTotal >= 100 ? 1 : 0.5, whiteSpace: 'nowrap', fontSize: '12px' }}>
                                        <input type="radio" name="actSubType" value="100" checked={activationSubAction === '100'} disabled={overallSPTotal < 100} onChange={(e) => {setActivationSubAction(e.target.value);}} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> 100
                                    </label>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="radio" name="actionType" value="Repurchase" checked={selectedActionType === 'Repurchase'} onChange={(e) => handleActionTypeChange(e.target.value)} style={{ accentColor: '#bfa15f', width: '16px', height: '16px' }} /> Repurchase
                            </label>
                            {selectedActionType === 'Repurchase' && (
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', padding: '3px 8px', backgroundColor: '#1a1a1a', border: '1px solid #555', borderRadius: '4px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                                        <input type="radio" name="repSubType" value="SAO" checked={repurchaseSubAction === 'SAO'} onChange={(e) => {setRepurchaseSubAction(e.target.value);}} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> SAO
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>
                                        <input type="radio" name="repSubType" value="SGO" checked={repurchaseSubAction === 'SGO'} onChange={(e) => {setRepurchaseSubAction(e.target.value);}} style={{ accentColor: '#00acc1', width: '14px', height: '14px' }} /> SGO
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Fields Row with Searchable Comboboxes for For ID and For Name */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Searchable Combobox: For ID */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative' }} ref={spForIdRef}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', width: '130px' }}>
                                <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For ID</label>
                                <span
                                    style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                                    onClick={handleOpenAddCustomerModal}
                                    title="Add New Customer"
                                >
                                    + New
                                </span>
                            </div>
                            <div className="sales-combobox-wrapper">
                                <input
                                    type="text"
                                    className="uniform-input"
                                    value={forId}
                                    autoComplete="off"
                                    onFocus={() => setActiveCustDropdown('sp_for_id')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setForId(val);
                                        setActiveCustDropdown('sp_for_id');
                                        const query = val.trim().toLowerCase();
                                        if (query) {
                                            const match = customersList.find(c => (c.ds_id || '').toLowerCase() === query);
                                            if (match) setForName(match.name || '');
                                        }
                                    }}
                                    style={{ width: '130px', height: '32px' }}
                                    placeholder="Search / For ID"
                                />
                                {activeCustDropdown === 'sp_for_id' && (
                                    <ul className="sales-dropdown-list" style={{ minWidth: '220px' }}>
                                        {filteredSpForId.length > 0 ? (
                                            filteredSpForId.slice(0, 30).map((c) => (
                                                <li
                                                    key={c.id}
                                                    className="sales-dropdown-item"
                                                    onMouseDown={() => {
                                                        setForId(c.ds_id || '');
                                                        setForName(c.name || '');
                                                        setActiveCustDropdown(null);
                                                    }}
                                                >
                                                    <span className="sales-drop-code">{c.ds_id || '(No ID)'}</span>
                                                    <span className="sales-drop-sub">{c.name}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="sales-dropdown-empty">No matching customer found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Searchable Combobox: For Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative' }} ref={spForNameRef}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', width: '150px' }}>
                                <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For Name</label>
                                <span
                                    style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                                    onClick={handleOpenAddCustomerModal}
                                    title="Add New Customer"
                                >
                                    + New
                                </span>
                            </div>
                            <div className="sales-combobox-wrapper">
                                <input
                                    type="text"
                                    className="uniform-input"
                                    value={forName}
                                    autoComplete="off"
                                    onFocus={() => setActiveCustDropdown('sp_for_name')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setForName(val);
                                        setActiveCustDropdown('sp_for_name');
                                        const query = val.trim().toLowerCase();
                                        if (query) {
                                            const match = customersList.find(c => (c.name || '').toLowerCase() === query);
                                            if (match && match.ds_id) setForId(match.ds_id);
                                        }
                                    }}
                                    style={{ width: '150px', height: '32px' }}
                                    placeholder="Search / For Name"
                                />
                                {activeCustDropdown === 'sp_for_name' && (
                                    <ul className="sales-dropdown-list" style={{ minWidth: '220px' }}>
                                        {filteredSpForName.length > 0 ? (
                                            filteredSpForName.slice(0, 30).map((c) => (
                                                <li
                                                    key={c.id}
                                                    className="sales-dropdown-item"
                                                    onMouseDown={() => {
                                                        setForName(c.name || '');
                                                        setForId(c.ds_id || '');
                                                        setActiveCustDropdown(null);
                                                    }}
                                                >
                                                    <span className="sales-drop-code">{c.name}</span>
                                                    <span className="sales-drop-sub">DS: {c.ds_id || '-'}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="sales-dropdown-empty">No matching customer found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Use SP</label>
                            <input type="number" step="0.01" className="uniform-input" value={useSP} onChange={(e) => setUseSP(e.target.value)} style={{ width: '70px', height: '32px' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Remain SP</label>
                            <input type="text" readOnly className="uniform-input" value={(overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0) - (parseFloat(useSP) || 0)).toFixed(2)} style={{ width: '70px', height: '32px', backgroundColor: '#333', color: '#999' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>Remarks</label>
                            <input type="text" className="uniform-input" value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} style={{ width: '110px', height: '32px' }} placeholder="Remarks" />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <button className="btn-add" onClick={handleAddCustomerAction} disabled={overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) <= 0} style={{ padding: '0 18px', height: '32px', fontSize: '13px', borderRadius: '4px', opacity: (overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) <= 0) ? 0.5 : 1 }}>Add</button>
                        </div>
                    </div>
                </div>

                {/* Datagrid / Table */}
                {customerActionsList.length > 0 && (
                    <div style={{ marginTop: '15px', overflowX: 'auto' }}>
                        <table className="items-table" style={{ width: '100%', fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Action</th>
                                    <th>Type</th>
                                    <th>Sub Type</th>
                                    <th>For ID</th>
                                    <th>For Name</th>
                                    <th>Use SP</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerActionsList.map((action, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn-remove" onClick={() => {
                                                const newList = customerActionsList.filter((_, i) => i !== idx);
                                                setCustomerActionsList(newList);
                                            }} style={{ padding: '2px 8px', fontSize: '12px' }}>X</button>
                                        </td>
                                        <td>{action.type}</td>
                                        <td>{action.subType || '-'}</td>
                                        <td>{action.forId || '-'}</td>
                                        <td>{action.forName || '-'}</td>
                                        <td>{action.useSP || '0'}</td>
                                        <td>{action.remarks || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
      </div>

      {/* BOTTOM TOTALS & ACTIONS */}
      <div className="footer-pane" style={{ padding: '20px', background: '#1a1a1a', borderTop: '2px solid #333' }}>
        <div className="payment-info" style={{ flex: 1.5 }}>
          {paymentMode === 'Cash & Credit' && (
            <div style={{ display: 'flex', gap: '15px', background: '#222', padding: '10px 15px', borderRadius: '6px', border: '1px solid #444', width: 'fit-content' }}>
                <div className="input-box">
                    <label>CASH AMOUNT</label>
                    <input type="number" className="uniform-input" value={cashAmount} onChange={handleCashAmountChange} placeholder="Enter Cash" style={{ width: '120px' }} />
                </div>
                <div className="input-box readonly">
                    <label>CREDIT AMOUNT</label>
                    <input type="text" className="uniform-input" readOnly value={`₹ ${(creditAmount || 0).toLocaleString('en-IN')}`} style={{ width: '120px', color: '#ff5252' }} />
                </div>
            </div>
          )}
          {paymentMode === 'Cash & UPI' && (
            <div style={{ display: 'flex', gap: '15px', background: '#222', padding: '10px 15px', borderRadius: '6px', border: '1px solid #444', width: 'fit-content' }}>
                <div className="input-box">
                    <label>CASH AMOUNT</label>
                    <input type="number" className="uniform-input" value={cashAmount} onChange={handleCashAmountChange} placeholder="Enter Cash" style={{ width: '120px' }} />
                </div>
                <div className="input-box readonly">
                    <label>UPI AMOUNT</label>
                    <input type="text" className="uniform-input" readOnly value={`₹ ${(upiAmount || 0).toLocaleString('en-IN')}`} style={{ width: '120px', color: '#2ecc71' }} />
                </div>
            </div>
          )}
          {paymentMode === 'Cash & UPI & Credit' && (
            <div style={{ display: 'flex', gap: '15px', background: '#222', padding: '10px 15px', borderRadius: '6px', border: '1px solid #444', width: 'fit-content' }}>
                <div className="input-box">
                    <label>CASH AMOUNT</label>
                    <input type="number" className="uniform-input" value={cashAmount} onChange={handleCashAmountChange} placeholder="Enter Cash" style={{ width: '110px' }} />
                </div>
                <div className="input-box">
                    <label>UPI AMOUNT</label>
                    <input type="number" className="uniform-input" value={upiAmount} onChange={handleUpiAmountChange} placeholder="Enter UPI" style={{ width: '110px' }} />
                </div>
                <div className="input-box readonly">
                    <label>CREDIT AMOUNT</label>
                    <input type="text" className="uniform-input" readOnly value={`₹ ${(creditAmount || 0).toLocaleString('en-IN')}`} style={{ width: '110px', color: '#ff5252' }} />
                </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', width: '100%', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#252526', padding: '10px 25px', borderRadius: '8px', border: '1px solid #444' }}>
            <span style={{ fontSize: '18px', marginRight: '15px', color: '#bfa15f', fontWeight: 'bold' }}>Bill Grand Total:</span>
            <span style={{ fontSize: '24px', color: '#2ecc71', fontWeight: 'bold' }}>₹ {(overallBillTotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#252526', padding: '10px 25px', borderRadius: '8px', border: '1px solid #444' }}>
            <span style={{ fontSize: '18px', marginRight: '15px', color: '#bfa15f', fontWeight: 'bold' }}>TSP:</span>
            <span style={{ fontSize: '24px', color: '#f39c12', fontWeight: 'bold' }}>{parseFloat(overallSPTotal || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div className="final-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-makebill" onClick={handleSubmit} disabled={spCalculationType !== 'Hold' && overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) > 0} style={{ opacity: (spCalculationType !== 'Hold' && overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) > 0) ? 0.5 : 1 }}>Make Bill</button>
          <button className="btn-reset" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* NEW CUSTOMER POPUP MODAL (FOR CREDIT SALES) */}
      {isCustomerModalOpen && (
        <div className="customer-modal-overlay" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="customer-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="customer-modal-header">
              <h3>➕ Add New Customer / Direct Seller</h3>
              <button 
                type="button" 
                className="customer-modal-close-btn" 
                onClick={() => setIsCustomerModalOpen(false)}
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
                    (Auto Generated)
                  </div>
                </div>
                <div className="form-group-row">
                  <label>Name</label>
                  <input 
                    type="text" 
                    name="cname" 
                    value={modalCustomerForm.cname} 
                    onChange={handleModalCustomerChange} 
                    placeholder="Type customer name" 
                    autoFocus 
                  />
                </div>
              </div>

              {/* Mobile 1 and Mobile 2 */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>
                    Mobile 1 <span style={{ color: '#ff4d4f' }}>*</span>
                  </label>
                  <input 
                    type="tel" 
                    name="mobile1" 
                    value={modalCustomerForm.mobile1} 
                    onChange={handleModalCustomerChange} 
                    placeholder="10-digit primary mobile"
                    maxLength={10} 
                  />
                  <small style={{ fontSize: '11px', marginTop: '3px', display: 'block', color: !modalCustomerForm.mobile1 ? '#ff7875' : modalCustomerForm.mobile1.length === 10 && ['6','7','8','9'].includes(modalCustomerForm.mobile1[0]) ? '#52c41a' : '#faad14' }}>
                    {!modalCustomerForm.mobile1 
                      ? '⚠️ 10-digit mobile anivarya hai' 
                      : modalCustomerForm.mobile1.length === 10 && ['6','7','8','9'].includes(modalCustomerForm.mobile1[0])
                      ? '✅ Sahi Mobile Number'
                      : `⚠️ ${modalCustomerForm.mobile1.length}/10 digits (6, 7, 8 ya 9 se shuru)`}
                  </small>
                </div>
                <div className="form-group-row">
                  <label>Mobile 2 (Optional)</label>
                  <input 
                    type="tel" 
                    name="mobile2" 
                    value={modalCustomerForm.mobile2} 
                    onChange={handleModalCustomerChange} 
                    placeholder="Alternative mobile"
                    maxLength={10} 
                  />
                  {modalCustomerForm.mobile2 && (
                    <small style={{ fontSize: '11px', marginTop: '3px', display: 'block', color: modalCustomerForm.mobile2.length === 10 && ['6','7','8','9'].includes(modalCustomerForm.mobile2[0]) ? '#52c41a' : '#faad14' }}>
                      {modalCustomerForm.mobile2.length === 10 && ['6','7','8','9'].includes(modalCustomerForm.mobile2[0])
                        ? '✅ Sahi Mobile Number'
                        : `⚠️ ${modalCustomerForm.mobile2.length}/10 digits (6, 7, 8 ya 9 se shuru)`}
                    </small>
                  )}
                </div>
              </div>

              {/* Email and DS Code */}
              <div className="form-row-multi">
                <div className="form-group-row">
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={modalCustomerForm.email} 
                    onChange={handleModalCustomerChange} 
                    placeholder="e.g. customer@gmail.com" 
                  />
                </div>
                <div className="form-group-row">
                  <label>DS Code</label>
                  <input 
                    type="text" 
                    name="ds_id" 
                    value={modalCustomerForm.ds_id} 
                    onChange={handleModalCustomerChange} 
                    placeholder="Direct Seller Code" 
                  />
                </div>
              </div>

              {/* Address */}
              <div className="form-group-row">
                <label>Address</label>
                <textarea 
                  name="address" 
                  value={modalCustomerForm.address} 
                  onChange={handleModalCustomerChange} 
                  rows="2" 
                  placeholder="Full address details..."
                />
              </div>

              {/* Remarks */}
              <div className="form-group-row">
                <label>Remarks</label>
                <textarea 
                  name="remarks" 
                  value={modalCustomerForm.remarks} 
                  onChange={handleModalCustomerChange} 
                  rows="2" 
                  placeholder="Any special notes..."
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="customer-modal-footer">
              <button 
                type="button" 
                className="btn-modal-action btn-modal-save" 
                onClick={handleSaveNewCustomer} 
                disabled={isSavingCustomer}
              >
                {isSavingCustomer ? 'Saving...' : '💾 Save'}
              </button>
              <button 
                type="button" 
                className="btn-modal-action btn-modal-clear" 
                onClick={handleClearModalCustomer}
              >
                🔄 Clear / New
              </button>
              <button 
                type="button" 
                className="btn-modal-action btn-modal-cancel" 
                onClick={() => setIsCustomerModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 On-Demand WhatsApp & QR Share Modal */}
      <ShareBillModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type="invoice"
        id={savedBillInfo?.id}
        customerName={savedBillInfo?.customerName}
        mobile={savedBillInfo?.mobile}
        amount={savedBillInfo?.amount}
        pdfBlobUrl={savedBillInfo?.pdfBlobUrl}
        onNewBill={handleStartNewBill}
      />

    </div>
  );
}

export default SalesVoucher;
