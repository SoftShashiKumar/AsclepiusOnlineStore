import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import './SalesVoucher.css'; // Reuse existing styles if possible or add inline

function AdjustSP() {
    const getToday = () => {
        const date = new Date();
        // Adjust for local timezone offset if needed, or simply use local format
        // Since toISOString uses UTC, it might be the previous day if we are behind UTC
        // Safer approach for local date:
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getFirstDayLocal = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    };

    const [fromDate, setFromDate] = useState(getFirstDayLocal());
    const [toDate, setToDate] = useState(getToday());
    const [status, setStatus] = useState('Pending');
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_BASE_URL = `${baseURL}/api/sp-settlements`;

    const fetchSettlements = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('fromDate', fromDate);
            if (toDate) params.append('toDate', toDate);
            if (status) params.append('status', status);

            const response = await axios.get(`${API_BASE_URL}/?${params.toString()}`);
            if (response.data.status === 'success') {
                const sortedData = response.data.data.sort((a, b) => {
                    const aStr = String(a.inv_no || '');
                    const bStr = String(b.inv_no || '');
                    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
                });
                setSettlements(sortedData);
            }
        } catch (error) {
            console.error("Error fetching settlements:", error);
            alert("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchSettlements();
    };

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Done' ? 'Pending' : 'Done';
        try {
            const response = await axios.post(`${API_BASE_URL}/update/`, {
                id: id,
                status: newStatus
            });
            if (response.data.status === 'success') {
                // Update local state to reflect change immediately without full refresh
                setSettlements(prev => prev.map(item => 
                    item.id === id ? { ...item, status: newStatus } : item
                ));
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="sales-voucher-container adjust-sp-page" style={{ padding: '20px', color: '#fff' }}>
            <h2 style={{ color: '#d4af37', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Adjust SP Settlement</h2>
            
            <div className="filter-section no-print" style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'flex-end', backgroundColor: '#222', padding: '15px', borderRadius: '5px', border: '1px solid #444' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#bfa15f', fontWeight: 'bold' }}>FROM DATE</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#bfa15f', fontWeight: 'bold' }}>TO DATE</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#bfa15f', fontWeight: 'bold' }}>STATUS</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', width: '120px' }}>
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Done">Done</option>
                    </select>
                </div>

                <button onClick={handleSearch} style={{ padding: '8px 20px', backgroundColor: '#bfa15f', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: '36px' }}>
                    Search
                </button>
            </div>

            <div style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '5px', border: '1px solid #444' }}>
                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
                    <button onClick={fetchSettlements} style={{ padding: '6px 15px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>Refresh</button>
                    <button onClick={handlePrint} style={{ padding: '6px 15px', backgroundColor: '#00acc1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print</button>
                </div>

                <div className="printable-table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }} className="sp-table">
                        <thead>
                            <tr style={{ backgroundColor: '#2d2d2d', color: '#bfa15f', borderBottom: '2px solid #555' }}>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>ID</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Bill Date</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Inv No</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Customer</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>For ID</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Used In</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Used SP</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Remarks</th>
                                <th style={{ padding: '10px', border: '1px solid #444' }}>Status</th>
                                <th className="no-print" style={{ padding: '10px', border: '1px solid #444', textAlign: 'center' }}>Done</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settlements.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#aaa', border: '1px solid #444' }}>
                                        {loading ? 'Loading...' : 'No data found'}
                                    </td>
                                </tr>
                            ) : (
                                settlements.map((item, idx) => (
                                    <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#1a1a1a' : '#222', borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.id}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.bill_date || '-'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.inv_no}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.customer}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.for_id}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.used_in}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444', color: '#f39c12', fontWeight: 'bold' }}>{item.used_sp}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444' }}>{item.remarks || '-'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #444', color: item.status === 'Done' ? '#2ecc71' : '#e74c3c' }}>{item.status}</td>
                                        <td className="no-print" style={{ padding: '10px', border: '1px solid #444', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={item.status === 'Done'}
                                                onChange={() => handleStatusToggle(item.id, item.status)}
                                                style={{ cursor: 'pointer', transform: 'scale(1.3)' }}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .adjust-sp-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: #fff !important;
                        padding: 0 !important;
                    }
                    .adjust-sp-page * {
                        visibility: visible;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .printable-table-container, .adjust-sp-page > div {
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #fff !important;
                    }
                    .sp-table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 1px solid #ccc !important;
                    }
                    .sp-table th, .sp-table td {
                        border: 1px solid #ccc !important;
                        padding: 6px !important;
                        background: #fff !important;
                        font-weight: normal !important;
                        font-size: 12px !important;
                    }
                    .sp-table th {
                        font-weight: bold !important;
                        background-color: #f8f8f8 !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                }
            `}} />
        </div>
    );
}

export default AdjustSP;
