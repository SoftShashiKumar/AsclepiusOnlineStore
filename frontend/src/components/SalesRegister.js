import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import { baseURL } from '../apiConfig';
import './SalesRegister.css';

function SalesRegister() {
  const { firmProfile } = useContext(FirmProfileContext);
  const getDynamicDates = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const dd = String(today.getDate()).padStart(2, '0');
    
    const currentDateStr = `${yyyy}-${mm}-${dd}`;
    const firstDateStr = `${yyyy}-${mm}-01`; 

    return { firstDateStr, currentDateStr };
  };

  const { firstDateStr, currentDateStr } = getDynamicDates();

  const [fromDate, setFromDate] = useState(firstDateStr); 
  const [toDate, setToDate] = useState(currentDateStr);
  const [reportType, setReportType] = useState('Summarized');
  const [reportData, setReportData] = useState([]);
  const [showReport, setShowReport] = useState(false);

  // Fetch Data 
  const fetchReport = async (from = fromDate, to = toDate, isInitial = false) => {
    try {
      const response = await fetch(`${baseURL}/api/sales-register/?from=${from}&to=${to}`);
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success === true) {
        if (result.data.length === 0 && !isInitial) {
          alert('Selected date range me koi sales records nahi mile!');
        }
        setReportData(result.data);
        setShowReport(true);
      } else {
        if (!isInitial) alert('Backend issue: ' + result.message);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (!isInitial) alert('Database connection Error !');
    }
  };

  useEffect(() => {
    // Auto-fetch report on initial page load with default dates
    fetchReport(firstDateStr, currentDateStr, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShowReport = () => {
    fetchReport(fromDate, toDate, false);
  };

  const handleViewPdf = async (invoiceNo) => {
    if (!invoiceNo) {
      alert("Invoice number missing!");
      return;
    }

    try {
      // Backend se PDF mangwana
      const response = await fetch(`${baseURL}/api/sales/view-pdf/${invoiceNo}/`);

      if (!response.ok) {
        let errMsg = "Bill fetch karne me dikkat aayi";
        try {
          const errData = await response.json();
          if (errData && errData.message) errMsg = errData.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // PDF ko blob me convert karna
      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);

      // File ka naam dynamic set karna
      const fileName = `Invoice_${invoiceNo}.pdf`;

      // 1. Naye tab me preview ke liye kholna
      window.open(pdfUrl, '_blank');

      // 2. Background me download trigger karna
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', fileName); 
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }, 300);

      // 3. Memory clean up (60s taaki naye tab me PDF poori tarah load ho sake)
      setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 60000);

    } catch (error) {
      console.error("PDF load error:", error);
      alert(error.message || "PDF load Error.");
    }
  };
  
  const handlePrint = () => {
    window.print();
  };

  const groupedData = Array.from(reportData.reduce((acc, current) => {
    if (!acc.has(current.invoice)) {
      acc.set(current.invoice, { ...current, items: [] });
    }
    acc.get(current.invoice).items.push(current);
    return acc;
  }, new Map()).values());
  
  return (
    <div className="register-container">
      <div className="filter-card no-print">
        <div className="filter-row">
          <div className="date-input-group">
            <label>From Date</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)} 
            />
          </div>

          <div className="date-input-group">
            <label>To Date</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)} 
            />
          </div>

          <div className="report-type-group">
            <label>Report View</label>
            <div className="report-radio-options">
              <label className={`report-radio-label ${reportType === 'Summarized' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="reportType" 
                  value="Summarized" 
                  checked={reportType === 'Summarized'} 
                  onChange={(e) => setReportType(e.target.value)} 
                />
                Summarized
              </label>
              <label className={`report-radio-label ${reportType === 'Detailed' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="reportType" 
                  value="Detailed" 
                  checked={reportType === 'Detailed'} 
                  onChange={(e) => setReportType(e.target.value)} 
                />
                Detailed
              </label>
            </div>
          </div>

          <button className="btn-show" onClick={handleShowReport}>
            Show Report
          </button>
        </div>
      </div>

      {showReport && (
        <div className="report-paper-view">
          <div className="print-actions no-print">
            <button className="btn-print" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
          </div>

          <div className="a4-print-sheet">
            <div className="report-header">
              <div className="logo-placeholder">{firmProfile.invoice_prefix || 'TJ'}</div>
              <div className="company-details">
                <h1>{firmProfile.firm_name}</h1>
                <p>{firmProfile.address_line_1}</p>
                <p>{firmProfile.address_line_2}</p>
              </div>
              <div className="report-meta">
                <h3>Sales Register ({reportType})</h3>
                <p>Pages: 1 / 1</p>
              </div>
            </div>

            <table className="sales-register-table">
              <thead>
                <tr>
                  <th>Sl no.</th>
                  <th>Invoice No.<br/>Date</th>
                  <th>Customer<br/>Name, Address, Mob.</th>
                  {reportType === 'Detailed' && (
                    <>
                      <th>Tag ID<br/>item Name</th>
                      <th>Quantity<br/>Rate</th>
                      <th>SP<br/>Pre Total</th>
                    </>
                  )}
                  <th>TSP<br/>Payment mode<br/>Bill Total</th>
                  <th className="no-print">Reprint</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={reportType === 'Detailed' ? 8 : 5} 
                      style={{ textAlign: 'center', padding: '15px', color: '#888' }}
                    >
                      Selected date range me koi sales records nahi mile!
                    </td>
                  </tr>
                ) : (
                  groupedData.map((group, gIdx) => {
                    const totalSP = group.items.reduce((sum, curr) => sum + (parseFloat(curr.sp) || 0), 0);
                    
                    if (reportType === 'Summarized') {
                      return (
                        <tr key={group.invoice || gIdx}>
                          <td>{gIdx + 1}</td>
                          <td><strong>{group.invoice}</strong><br/>{group.date}</td>
                          <td><strong>{group.name}</strong><br/>{group.address}<br/>{group.mobile}</td>
                          <td>{totalSP}<br/>{group.payMode}<br/><strong>{group.billTotal}</strong></td>
                          <td className="no-print" style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => handleViewPdf(group.invoice)} 
                              style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }}
                              title="Print / View Invoice PDF"
                            >
                              🖨️
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // Detailed mode
                    return (
                      <React.Fragment key={gIdx}>
                        {group.items.map((item, iIdx) => (
                          <tr key={`${gIdx}-${iIdx}`}>
                            {iIdx === 0 && (
                              <>
                                <td rowSpan={group.items.length}>{gIdx + 1}</td>
                                <td rowSpan={group.items.length}><strong>{group.invoice}</strong><br/>{group.date}</td>
                                <td rowSpan={group.items.length}><strong>{group.name}</strong><br/>{group.address}<br/>{group.mobile}</td>
                              </>
                            )}
                            <td>{item.tagId}<br/><strong>{item.itemName}</strong></td>
                            <td>Qty: {item.quantity}<br/>₹ {item.rate}</td>
                            <td>{item.sp}<br/>{item.preTotal}</td>
                            {iIdx === 0 && (
                              <>
                                <td rowSpan={group.items.length}>{totalSP}<br/>{group.payMode}<br/><strong>{group.billTotal}</strong></td>
                                <td className="no-print" style={{ textAlign: 'center' }} rowSpan={group.items.length}>
                                  <button 
                                    onClick={() => handleViewPdf(group.invoice)} 
                                    style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px' }}
                                    title="Print / View Invoice PDF"
                                  >
                                    🖨️
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesRegister;
