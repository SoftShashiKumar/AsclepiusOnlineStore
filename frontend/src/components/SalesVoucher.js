import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { baseURL } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import './SalesVoucher.css';

function SalesVoucher() {
  const { firmProfile } = useContext(FirmProfileContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [salesOrderId, setSalesOrderId] = useState('');

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
    ds_id: '',
    cname: '',
    mobile1: '',
    address: '',
    email: ''
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const isCreditPaymentMode = (mode) => {
    return mode === 'Credit' || mode === 'Cash & Credit' || mode === 'Cash & UPI & Credit';
  };

  // --- NEW STATES FOR CREDIT AND AVAIL QTY ---
  const [currentDues, setCurrentDues] = useState(0);
  const [itemAvailableQty, setItemAvailableQty] = useState(0);

  // --- NEW ACTIONS STATES ---
  const [selectedActionType, setSelectedActionType] = useState('');
  const [activationSubAction, setActivationSubAction] = useState('');
  const [repurchaseSubAction, setRepurchaseSubAction] = useState('');
  const [forId, setForId] = useState('');
  const [forName, setForName] = useState('');
  const [useSP, setUseSP] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [customerActionsList, setCustomerActionsList] = useState([]);

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
        setForName(order.customer_name || '');
        setCustomerName(order.customer_name || '');
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
    if (newMode === 'Cash & UPI & Credit') {
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
      setModalCustomerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveNewCustomer = async (e) => {
      if (e) e.preventDefault();

      if (!modalCustomerForm.ds_id.trim()) {
          alert("DS ID (Asclepius ID) dalna zaroori hai!");
          return;
      }
      if (!modalCustomerForm.cname.trim()) {
          alert("Customer Name dalna zaroori hai!");
          return;
      }
      if (!modalCustomerForm.mobile1.trim()) {
          alert("Mobile Number dalna zaroori hai!");
          return;
      }
      if (!modalCustomerForm.address.trim()) {
          alert("Address dalna zaroori hai!");
          return;
      }

      setIsSavingCustomer(true);
      try {
          const payload = {
              cname: modalCustomerForm.cname.trim(),
              mobile1: modalCustomerForm.mobile1.trim(),
              email: modalCustomerForm.email.trim(),
              ds_id: modalCustomerForm.ds_id.trim(),
              address: modalCustomerForm.address.trim(),
              remarks: 'Created via Sales Voucher'
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
                  newCust = updatedList.find(c => c.mobile === payload.mobile1 || c.ds_id === payload.ds_id);
              }

              if (newCust) {
                  setSelectedCustomerId(newCust.id);
                  setAsclepiusId(newCust.ds_id || '');
                  setCustomerName(newCust.name || '');
                  setMobile(newCust.mobile || '');
                  setAddress(newCust.address || '');
                  setEmail(newCust.email || '');
                  setCurrentDues(newCust.current_dues || 0);
                  setForId(newCust.ds_id || '');
                  setForName(newCust.name || '');
              }

              setIsCustomerModalOpen(false);
              setIsManualCustomer(false);
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

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset everything?")) {
        navigate(location.pathname, { replace: true, state: {} });
        window.location.reload();
    }
  };

  // --- SUBMIT BILL ---
  const handleSubmit = async () => {
    if (itemsList.length === 0) {
      alert("Bill banane ke liye table me kam se kam 1 item hona chahiye!");
      return;
    }
    
    if (isCreditPaymentMode(paymentMode) && !selectedCustomerId) {
        alert("Credit payment mode ke liye customer select karna zaroori hai! Kripya dropdown se customer chunein ya +New par click karke naya customer save karein.");
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
      selectedCustomerId: selectedCustomerId,
      status: 'Saved',
      repurchase: repurchaseArr.join(','),
      activation: activationArr.join(','),
      forIds: forIdsArr.join(','),
      forNames: forNamesArr.join(','),
      forName: forNamesArr.join(','),
      actionUseSPs: useSpArr.join(','),
      actionRemarks: remarksArr.join(','),
      customerActions: customerActionsList
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
        
        alert("Bill Save & Download ho gaya!");
        navigate(location.pathname, { replace: true, state: {} });
        window.location.reload();
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
          <div className="input-box" style={{ flex: '1 1 20%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label style={{ marginBottom: 0 }}>ASCLEPIUS ID</label>
                <span style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }} onClick={handleToggleCustomerMode}>
                    {isManualCustomer ? "Select Existing" : "+ New"}
                </span>
            </div>
            {!isManualCustomer ? (
                <select className="uniform-input" value={selectedCustomerId} onChange={(e) => handleCustomerSelectDropdown(e.target.value)}>
                    <option value="">-- Select ID --</option>
                    {customersList.filter(c => c.ds_id).map(c => <option key={c.id} value={c.id}>{c.ds_id}</option>)}
                </select>
            ) : (
                <input type="text" className="uniform-input" value={asclepiusId} onChange={(e) => {setAsclepiusId(e.target.value); handleForIdChange(e.target.value);}} placeholder="Type new ID..." />
            )}
          </div>

          <div className="input-box" style={{ flex: '1 1 20%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ marginBottom: 0 }}>CUSTOMER NAME</label>
                    {(!isManualCustomer && selectedCustomerId) && <span style={{ fontSize: '11px', color: '#ff4d4d', fontWeight: 'bold' }}>(Credit: ₹ {currentDues})</span>}
                </div>
                <span style={{ fontSize: '11px', color: '#bfa15f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }} onClick={handleToggleCustomerMode}>
                    {isManualCustomer ? "Select Existing" : "+ New"}
                </span>
            </div>
            {!isManualCustomer ? (
                <select className="uniform-input" value={selectedCustomerId} onChange={(e) => handleCustomerSelectDropdown(e.target.value)}>
                    <option value="">-- Select Name --</option>
                    {customersList.filter(c => c.name).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            ) : (
                <input type="text" className="uniform-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Type new Name..." />
            )}
          </div>

          <div className="input-box" style={{ flex: '1 1 15%' }}>
            <label>MOBILE</label>
            <input 
              type="text" 
              className="uniform-input"
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)} 
            />
          </div>

          <div className="input-box" style={{ flex: '1 1 30%' }}>
            <label>ADDRESS</label>
            <input 
              type="text" 
              className="uniform-input"
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* 
          <div className="input-box">
            <label>E-MAIL</label>
            <input 
              type="email" 
              className="uniform-input"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div> 
          */}
        </div>

        {/* NEW CUSTOMER ACTION SECTION */}
        <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #444', borderRadius: '5px', backgroundColor: '#222' }}>
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

                {/* Input Fields Row with Labels on TOP */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For ID</label>
                        <input type="text" className="uniform-input" value={forId} onChange={(e) => handleForIdChange(e.target.value)} style={{ width: '95px', height: '32px' }} placeholder="For ID" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label style={{ fontSize: '11px', color: '#bfa15f', textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>For Name</label>
                        <input type="text" className="uniform-input" value={forName} onChange={(e) => setForName(e.target.value)} style={{ width: '125px', height: '32px' }} placeholder="For Name" />
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
        </div>
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
          <button className="btn-makebill" onClick={handleSubmit} disabled={overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) > 0} style={{ opacity: (overallSPTotal > 0 && (overallSPTotal - customerActionsList.reduce((acc, curr) => acc + (parseFloat(curr.useSP) || 0), 0)) > 0) ? 0.5 : 1 }}>Make Bill</button>
          <button className="btn-reset" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* NEW CUSTOMER POPUP MODAL (FOR CREDIT SALES) */}
      {isCustomerModalOpen && (
        <div className="customer-modal-backdrop" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="customer-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="customer-modal-header">
              <h3>Add New Customer (Credit Ledger Entry)</h3>
              <button type="button" className="customer-modal-close" onClick={() => setIsCustomerModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveNewCustomer}>
              <div className="customer-modal-body">
                <div className="customer-modal-field">
                  <label>DS ID (Asclepius ID) <span className="req">*</span></label>
                  <input
                    type="text"
                    name="ds_id"
                    className="uniform-input"
                    value={modalCustomerForm.ds_id}
                    onChange={handleModalCustomerChange}
                    placeholder="e.g. DS123456"
                    autoFocus
                    required
                  />
                </div>

                <div className="customer-modal-field">
                  <label>Customer Name <span className="req">*</span></label>
                  <input
                    type="text"
                    name="cname"
                    className="uniform-input"
                    value={modalCustomerForm.cname}
                    onChange={handleModalCustomerChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="customer-modal-field">
                  <label>Mobile Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    name="mobile1"
                    className="uniform-input"
                    value={modalCustomerForm.mobile1}
                    onChange={handleModalCustomerChange}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>

                <div className="customer-modal-field">
                  <label>Address <span className="req">*</span></label>
                  <input
                    type="text"
                    name="address"
                    className="uniform-input"
                    value={modalCustomerForm.address}
                    onChange={handleModalCustomerChange}
                    placeholder="Enter full address"
                    required
                  />
                </div>

                <div className="customer-modal-field">
                  <label>Email <span className="opt">(Optional)</span></label>
                  <input
                    type="email"
                    name="email"
                    className="uniform-input"
                    value={modalCustomerForm.email}
                    onChange={handleModalCustomerChange}
                    placeholder="customer@example.com (Optional)"
                  />
                </div>
              </div>

              <div className="customer-modal-footer">
                <button
                  type="button"
                  className="btn-customer-cancel"
                  onClick={() => setIsCustomerModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-customer-save"
                  disabled={isSavingCustomer}
                >
                  {isSavingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SalesVoucher;
