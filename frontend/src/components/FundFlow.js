import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import { FirmProfileContext } from '../context/FirmProfileContext';
import './FundFlow.css';

const HEADER_META = {
  cash: { icon: '💵', accent: '#2ecc71' },
  upi: { icon: '📱', accent: '#00f5d4' },
  credit: { icon: '📝', accent: '#ff5252' },
  bank: { icon: '🏦', accent: '#38bdf8' },
  cheque: { icon: '🧾', accent: '#f39c12' },
};

export default function FundFlow() {
  const { firmProfile } = useContext(FirmProfileContext);

  const getTodayLocal = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayLocal();
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState({
    sales_total: 0,
    receipt_total: 0,
    grand_total: 0,
    total_transactions: 0,
    sales_invoices_count: 0,
    receipt_vouchers_count: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFundFlow = async (from = fromDate, to = toDate) => {
    setLoading(true);
    try {
      const firmId = firmProfile?.firm_id || '';
      const params = new URLSearchParams({
        from_date: from,
        to_date: to,
      });
      if (firmId) params.append('firm_id', firmId);

      const res = await axios.get(`${baseURL}/api/fund-flow/?${params.toString()}`);
      if (res.data && res.data.success) {
        setSummary(res.data.summary || []);
        setTotals(res.data.totals || {
          sales_total: 0,
          receipt_total: 0,
          grand_total: 0,
          total_transactions: 0,
          sales_invoices_count: 0,
          receipt_vouchers_count: 0,
        });
        setTransactions(res.data.transactions || []);
      } else {
        alert(res.data?.message || 'Fund Flow data load nahi ho paya!');
      }
    } catch (err) {
      console.error('Fund Flow fetch error:', err);
      alert('Fund Flow data load karne me error aayi!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundFlow(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmProfile?.firm_id]);

  const handleShow = () => {
    fetchFundFlow(fromDate, toDate);
  };

  const formatINR = (val) => {
    const num = parseFloat(val || 0);
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fund-flow-container">
      <div className="sales-register-banner no-print">
        Fund Flow Summary
      </div>

      {/* Print-Only Formal Report Header */}
      <div className="ff-print-header">
        <h2>{firmProfile?.firm_name || 'Shree Wellness Center'}</h2>
        {(firmProfile?.address_line_1 || firmProfile?.address_line_2) && (
          <p className="ff-print-addr">
            {[firmProfile.address_line_1, firmProfile.address_line_2].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="ff-print-meta">
          <strong>FUND FLOW SUMMARY</strong>
          <span>Period: {fromDate} to {toDate}</span>
        </div>
      </div>

      {/* Filter Box */}
      <fieldset className="ff-filter-fieldset no-print">
        <legend>Information</legend>
        <div className="fieldset-content">
          <div className="filter-group">
            <label>From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-show-report"
            onClick={handleShow}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Show'}
          </button>
          <button
            type="button"
            className="btn-print-report"
            onClick={() => window.print()}
          >
            🖨️ Print
          </button>
        </div>
      </fieldset>

      {/* Summary Cards for Cash, UPI, Credit, Bank, Cheque + Grand Total */}
      <div className="fund-flow-cards-grid">
        {summary.map((item) => {
          const meta = HEADER_META[item.key] || { icon: '💰', accent: '#bfa15f' };
          return (
            <div
              key={item.key}
              className="fund-flow-card"
              style={{ borderTopColor: meta.accent }}
            >
              <div className="ff-card-top">
                <span className="ff-card-title">{meta.icon} {item.header}</span>
                <span className="ff-card-count">{item.transaction_count} Txn</span>
              </div>
              <div className="ff-card-amount" style={{ color: meta.accent }}>
                {formatINR(item.total_amount)}
              </div>
              <div className="ff-card-split">
                <span>Sales: <strong>{formatINR(item.sales_amount)}</strong></span>
                <span>Receipt: <strong>{formatINR(item.receipt_amount)}</strong></span>
              </div>
            </div>
          );
        })}

        <div className="fund-flow-card ff-card-grand">
          <div className="ff-card-top">
            <span className="ff-card-title">📊 Grand Total</span>
            <span className="ff-card-count">{transactions.length} Entries</span>
          </div>
          <div className="ff-card-amount" style={{ color: '#d4af37' }}>
            {formatINR(totals.grand_total)}
          </div>
          <div className="ff-card-split">
            <span>Sales ({totals.sales_invoices_count}): <strong>{formatINR(totals.sales_total)}</strong></span>
            <span>Receipt ({totals.receipt_vouchers_count}): <strong>{formatINR(totals.receipt_total)}</strong></span>
          </div>
        </div>
      </div>

      {/* Header-wise Summary Table */}
      <div className="ff-table-holder">
        <div className="ff-section-heading">
          <span>Fund Flow Summary ({fromDate} to {toDate})</span>
          <span className="ff-firm-tag">{firmProfile?.firm_name || 'Shree Wellness Center'}</span>
        </div>

        <table className="ff-data-table ff-summary-table">
          <thead>
            <tr>
              <th>Payment Header</th>
              <th style={{ textAlign: 'right' }}>Sales Total</th>
              <th style={{ textAlign: 'right' }}>Receipt Total</th>
              <th style={{ textAlign: 'center' }}>Total Transactions</th>
              <th style={{ textAlign: 'right' }}>Net Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && summary.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                  Loading fund flow summary...
                </td>
              </tr>
            ) : (
              summary.map((row) => {
                const meta = HEADER_META[row.key] || { icon: '', accent: '#fff' };
                return (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 'bold', color: meta.accent }}>
                      {meta.icon} {row.header}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatINR(row.sales_amount)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(row.receipt_amount)}</td>
                    <td style={{ textAlign: 'center', color: '#ffb300', fontWeight: 'bold' }}>
                      {row.transaction_count}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: meta.accent }}>
                      {formatINR(row.total_amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="ff-grand-footer-row">
              <td>Total</td>
              <td style={{ textAlign: 'right' }}>{formatINR(totals.sales_total)}</td>
              <td style={{ textAlign: 'right' }}>{formatINR(totals.receipt_total)}</td>
              <td style={{ textAlign: 'center' }}>{totals.total_transactions}</td>
              <td style={{ textAlign: 'right', color: '#2ecc71' }}>{formatINR(totals.grand_total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detailed Source Transactions (Sales & Receipts) */}
      <div className="ff-table-holder" style={{ marginBottom: '40px' }}>
        <div className="ff-section-heading">
          <span>Source Transactions (Sales &amp; Receipt)</span>
          <span className="ff-firm-tag">{transactions.length} Records</span>
        </div>

        <table className="ff-data-table ff-tx-table">
          <thead>
            <tr>
              <th>Sl No.</th>
              <th>Date</th>
              <th>Source</th>
              <th>Ref No.</th>
              <th>Customer</th>
              <th>Mode</th>
              <th style={{ textAlign: 'right' }}>Cash</th>
              <th style={{ textAlign: 'right' }}>UPI</th>
              <th style={{ textAlign: 'right' }}>Credit</th>
              <th style={{ textAlign: 'right' }}>Bank</th>
              <th style={{ textAlign: 'right' }}>Cheque</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                  {loading ? 'Loading...' : 'Selected date range me koi Sales ya Receipt transaction nahi mila.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={`${tx.source}-${tx.ref_no}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{tx.display_date || tx.date}</td>
                  <td>
                    <span className={`ff-source-badge ${tx.source === 'Sales' ? 'is-sales' : 'is-receipt'}`}>
                      {tx.source}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{tx.ref_no}</td>
                  <td>{tx.customer}</td>
                  <td>{tx.payment_mode}</td>
                  <td style={{ textAlign: 'right' }}>{tx.cash ? formatINR(tx.cash) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{tx.upi ? formatINR(tx.upi) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{tx.credit ? formatINR(tx.credit) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{tx.bank ? formatINR(tx.bank) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{tx.cheque ? formatINR(tx.cheque) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#2ecc71' }}>
                    {formatINR(tx.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
