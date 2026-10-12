import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseURL } from '../apiConfig';
import axios from 'axios';
import './EnquiryDashboard.css';

const EnquiryDashboard = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const navigate = useNavigate();

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseURL}/api/sales-order/list/`);
      if (response.data.success) {
        setEnquiries(response.data.data || []);
      }
    } catch (error) {
      console.error("Orders load karne me error:", error);
      alert("Orders fetch nahi ho paye!");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleUpdateStatus = async (slno_list, updatedStatus) => {
    try {
      // Since an order can have multiple items (multiple slnos), we need to update all of them
      for (let slno of slno_list) {
        await axios.post(`${baseURL}/api/sales-order/update-status/`, {
          slno: slno,
          status: updatedStatus,
          seller_remarks: ''
        });
      }
      alert("🎉 Status successfully update ho gaya!");
      fetchEnquiries();
    } catch (error) {
      console.error("Update error:", error);
      alert("Update Error!");
    }
  };

  const handleMakeSales = (order) => {
    // Navigate to Sales Voucher with order data
    navigate('/sales', { state: { orderData: order } });
  };

  const handleDeleteOrder = async (orderNumber) => {
    if (window.confirm("Bhai, sach me ye order delete karna chahte ho? (Fake/Unwanted Order)")) {
      try {
        const response = await axios.delete(`${baseURL}/api/sales-order/delete/${orderNumber}/`);
        if (response.data.success) {
          alert("🗑️ Order Deleted, successfully !");
          fetchEnquiries();
        } else {
          alert("Order delete nahi ho paya!");
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Could not Delete !");
      }
    }
  };

  // Group by order_number
  const groupedOrders = {};
  enquiries.forEach(enq => {
    const orderNo = enq.order_number || `ORD-OLD-${enq.slno}`;
    if (!groupedOrders[orderNo]) {
      groupedOrders[orderNo] = {
        order_number: orderNo,
        customer_name: enq.customer_name,
        customer_mobile: enq.customer_mobile,
        asclepius_id: enq.asclepius_id,
        customer_address: enq.customer_address,
        status: enq.status,
        created_at: enq.created_at,
        slno_list: [],
        items: [],
        grandTotal: 0
      };
    }
    groupedOrders[orderNo].items.push(enq);
    groupedOrders[orderNo].slno_list.push(enq.slno);
    groupedOrders[orderNo].grandTotal += (enq.order_qty || 1) * (enq.order_rate || 0);
  });

  const filteredOrders = Object.values(groupedOrders).filter(order => {
    if (statusFilter === 'all') return true;
    return order.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', padding: '20px' }}>
      <div className="dashboard-header" style={{ borderBottom: '2px solid #2874f0', paddingBottom: '10px' }}>
        <h2 style={{ color: '#2874f0' }}>📦 Sales Order Dashboard</h2>
        <button onClick={fetchEnquiries} className="refresh-btn" style={{ backgroundColor: '#d4af37', color: '#000', fontWeight: 'bold' }}>🔄 Refresh Data</button>
      </div>

      <div className="dashboard-filter" style={{ margin: '20px 0' }}>
        <label style={{ color: '#fff' }}>Filter by Status: </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #555' }}>
          <option value="pending">⏳ Pending</option>
          <option value="done/sold">✅ Done/Sold</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-text" style={{ color: '#fff' }}>Bhai, data load ho raha hai...</div>
      ) : (
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <div style={{ color: '#ff4d4f', fontSize: '18px', textAlign: 'center' }}>Koi sales order nahi mila, bhai!</div>
          ) : (
            filteredOrders.map((order, index) => (
              <div key={index} className="order-card" style={{ backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #555', paddingBottom: '15px', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ color: '#d4af37', margin: '0 0 10px 0' }}>Order No: {order.order_number}</h3>
                    <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px' }}><strong>Customer:</strong> {order.customer_name} {order.asclepius_id ? `(ID: ${order.asclepius_id})` : ''}</div>
                    <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px' }}><strong>Mobile:</strong> 📞 {order.customer_mobile}</div>
                    {order.customer_address && <div style={{ color: '#ccc', fontSize: '14px' }}><strong>Address:</strong> 📍 {order.customer_address}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>Date: {order.created_at}</div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ color: '#fff', marginRight: '10px' }}>Status:</span>
                      <select 
                        value={order.status || 'Pending'} 
                        onChange={(e) => handleUpdateStatus(order.slno_list, e.target.value)}
                        style={{ padding: '6px', borderRadius: '4px', backgroundColor: order.status === 'done/sold' ? '#2ecc71' : '#f39c12', color: '#fff', border: 'none', fontWeight: 'bold' }}
                      >
                        <option value="Pending">⏳ Pending</option>
                        <option value="done/sold">✅ Done/Sold</option>
                      </select>
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '2px solid #555' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Item / Tag ID</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Rate</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Sub Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #444' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 'bold', color: '#8a7ef5' }}>{item.item_name || 'N/A'}</div>
                          <div style={{ fontSize: '12px', color: '#aaa' }}>Tag: {item.tag_id}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>₹{item.order_rate}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.order_qty}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#2ecc71' }}>₹{(item.order_qty || 1) * (item.order_rate || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: '#d4af37' }}>Grand Total:</td>
                      <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: '#d4af37' }}>₹{order.grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button 
                    onClick={() => handleMakeSales(order)}
                    style={{ backgroundColor: '#2874f0', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                  >
                    🛒 Make Sales
                  </button>
                  <button 
                    onClick={() => handleDeleteOrder(order.order_number)}
                    style={{ backgroundColor: '#e74c3c', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                  >
                    🗑️ Delete Order
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EnquiryDashboard;