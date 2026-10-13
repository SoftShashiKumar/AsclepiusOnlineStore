import React, { useState, useEffect } from 'react';
import { baseURL } from '../apiConfig'; // <-- Apni nayi central file se baseURL import kiya
import { useContext } from 'react';
import { FirmProfileContext } from '../context/FirmProfileContext';
import axios from 'axios';
import './ReceiptRegister.css'; 

export default function ReceiptRegister() {
  const { firmProfile } = useContext(FirmProfileContext);
  const [receipts, setReceipts] = useState([]);
  // const [fromDate, setFromDate] = useState('2025-12-01');
  // const [toDate, setToDate] = useState('2026-06-27');

  // 📅 Dynamic Dates Logic
  const getDynamicDates = () => {
    const today = new Date();
    
    // Aaj ki date ko YYYY-MM-DD format me convert karna
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months 0-11 hote hain isliye +1 kiya
    const dd = String(today.getDate()).padStart(2, '0');    
    const currentDateStr = `${yyyy}-${mm}-${dd}`;
    const firstDateStr = `${yyyy}-${mm}-01`; // Is mahine ki pehli date

    return { firstDateStr, currentDateStr };
  };

  const { firstDateStr, currentDateStr } = getDynamicDates();

  // State me dynamic dates set kar di
  const [fromDate, setFromDate] = useState(firstDateStr); 
  const [toDate, setToDate] = useState(currentDateStr);

  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');

  const [selectedReceipt] = useState(null);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
 
  // Customers fetch karne ke liye useEffect
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/get_customers/`);
        if (response.data && response.data.success) {
          setCustomersList(response.data.customers || []);
        }
      } catch (error) {
        console.error("Customers fetch karne me dikkat:", error);
      }
    };
    fetchCustomers();
  }, []);

  // const baseURL = process.env.REACT_APP_API_URL || 'http://10.95.109.97:8000';

// const fetchReceipts = async () => {
//     try {
//       console.log("Fetching receipts for range:", fromDate, "to", toDate); // Debugging ke liye
//       // const res = await axios.get(`http://127.0.0.1:8000/api/receipts/register/?from_date=${fromDate}&to_date=${toDate}`);
//       // const res = await axios.get(`http://10.179.18.97:8000/api/receipts/register/?from_date=${fromDate}&to_date=${toDate}`);
//       // const baseURL = process.env.REACT_APP_API_URL || 'http://10.179.18.97:8000';
      
//       const res = await axios.get(`${baseURL}/api/receipts/register/?from_date=${fromDate}&to_date=${toDate}`);
    
//       console.log("Backend response data:", res.data); // Isse browser console me data dikhega

//       // FIXED CONDITION: Agar backend wrap karke de raha hai ya direct array de raha hai
//       if (res.data && (res.data.success || Array.isArray(res.data.receipts) || Array.isArray(res.data))) {
        
//         const finalReceipts = res.data.receipts || (Array.isArray(res.data) ? res.data : []);
        
//         setReceipts(finalReceipts);
//         setIsReportGenerated(true); // Isse table frontend par render ho jayegi
//       } else {
//         alert("Bhai backend se response format sahi nahi mila!");
//       }
//     } catch (err) {
//       console.error("Error fetching receipt register:", err);
//       alert("Backend server se connect nahi ho paya. Kya Django running hai?");
//     }
//   };

const fetchReceipts = async () => {
    try {
      // customer_id param add kiya
      const res = await axios.get(
        `${baseURL}/api/receipts/register/?from_date=${fromDate}&to_date=${toDate}&customer_id=${selectedCustomerId}`
      );

      if (res.data && (res.data.success || Array.isArray(res.data.receipts) || Array.isArray(res.data))) {
        const finalReceipts = res.data.receipts || (Array.isArray(res.data) ? res.data : []);
        setReceipts(finalReceipts);
        setIsReportGenerated(true);
      } else {
        alert("Backend Error !");
      }
    } catch (err) {
      console.error("Error fetching receipt register:", err);
      alert("Backend server se connect nahi ho paya.");
    }
  };

  const handlePrintRegister = async () => {
    try {
      // PDF report api me bhi customer_id attach kiya
      const response = await axios.get(
        `${baseURL}/api/receipts/register/pdf/?from_date=${fromDate}&to_date=${toDate}&customer_id=${selectedCustomerId}`
      );

      if (response.data.success && response.data.pdf_base64) {
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new Blob([byteArray], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
      } else {
        alert("Backend se PDF report generate nahi ho payi!");
      }
    } catch (error) {
      console.error("PDF Flow Error: ", error);
      alert("Print report process Error !");
    }
  };

  // 🖨️ UPDATED: Register Report Print & C-Drive Save Flow
  // const handlePrintRegister = async () => {
  //   try {
  //     const response = await axios.get(
  //       // `http://127.0.0.1:8000/api/receipts/register/pdf/?from_date=${fromDate}&to_date=${toDate}`
        
  //       // `http://10.179.18.97:8000/api/receipts/register/pdf/?from_date=${fromDate}&to_date=${toDate}`
  //       `${baseURL}/api/receipts/register/pdf/?from_date=${fromDate}&to_date=${toDate}`
              
  //     );

  //     if (response.data.success && response.data.pdf_base64) {
  //       // 1. Base64 string ko decode kiya binary data me
  //       const byteCharacters = atob(response.data.pdf_base64);
  //       const byteNumbers = new Array(byteCharacters.length);
  //       for (let i = 0; i < byteCharacters.length; i++) {
  //         byteNumbers[i] = byteCharacters.charCodeAt(i);
  //       }
  //       const byteArray = new Uint8Array(byteNumbers);
        
  //       // 2. Blob URL generate kiya browser display ke liye
  //       const file = new Blob([byteArray], { type: 'application/pdf' });
  //       const fileURL = URL.createObjectURL(file);
        
  //       // 3. Browser ke naye tab me open kar diya display ke liye
  //       window.open(fileURL, '_blank');
  //     } else {
  //       alert("Backend se PDF report generate nahi ho payi!");
  //     }
  //   } catch (error) {
  //     console.error("PDF Flow Error: ", error);
  //     alert("Print report process karne me dikkat aayi!");
  //   }
  // };

  
  // const triggerPrint = async (r) => {
  //   try {
  //     // Axios se file ko blob (Binary Large Object) format me fetch karenge
  //     // const response = await axios.get(`http://127.0.0.1:8000/api/receipts/view-pdf/${r.r_id}/`, {
  //     // const response = await axios.get(`http://10.179.18.97:8000/api/receipts/view-pdf/${r.r_id}/`, {
  //     const response = await axios.get(`${baseURL}/api/receipts/view-pdf/${r.r_id}/`, {
      
              
  //       responseType: 'blob' 
  //     });

  //     // Fetch kiye gaye data se ek local temporary browser URL banayenge
  //     const file = new Blob([response.data], { type: 'application/pdf' });
  //     const fileURL = URL.createObjectURL(file);

  //     // Ab is safe local URL ko new tab me open karenge, isse CORS error nahi aayega
  //     window.open(fileURL, '_blank');
  //   } catch (error) {
  //     console.error("PDF load karne me dikkat aayi:", error);
  //     alert("Bhai, is receipt ki PDF file nahi mili ya koi backend issue hai!");
  //   }
  // };

  const triggerPrint = async (r) => {
    try {
      // Axios se file ko blob (Binary Large Object) format me fetch karenge
      const response = await axios.get(`${baseURL}/api/receipts/view-pdf/${r.r_id}/`, {
        responseType: 'blob' 
      });

      // Fetch kiye gaye data se ek local temporary browser URL banayenge
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);

      // --- NAYA AUTO-DOWNLOAD AUR NEW TAB LOGIC ---
      // File ka naam dynamic set karna (Receipt_ID.pdf)
      const fileName = `Receipt_${r.r_id}.pdf`;

      // 1. PDF ko naye tab me open karna (sabse pehle taaki popup blocker na roke)
      window.open(fileURL, '_blank');

      // 2. Background me download trigger karna (ek chote delay ke sath)
      setTimeout(() => {
          const link = document.createElement('a');
          link.href = fileURL;
          link.setAttribute('download', fileName); 
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
      }, 500); // 0.5 second ka delay
      
      // 3. Memory clean up
      setTimeout(() => {
          window.URL.revokeObjectURL(fileURL);
      }, 3000);

    } catch (error) {
      console.error("PDF load karne me dikkat aayi:", error);
      alert("Receipt ki PDF file nahi mil rhi hai ya koi backend issue hai!");
    }
  };

  // 🖨️ Full Report Print (Disabled / handled by handlePrintRegister)
  // const triggerReportPrint = () => {
  //   window.location.href = `${baseURL}/api/receipts/register/pdf/?from_date=${fromDate}&to_date=${toDate}`;
  // };

  return (
    <div className="receipt-register-container">
      
      {/* 🔴 FIXED: RED BANNER HEADER */}
      <div className="sales-register-banner">
        Receipt Register
      </div>

      {/* 🧭 FIXED: FIELDSET "INFORMATION" BOX */}
      {/* <fieldset className="info-fieldset-box no-print">
        <legend>Information</legend>
        <div className="fieldset-content">
          <div className="filter-group">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div> */}
          {/* 🧭 FIELDSET "INFORMATION" BOX */}
          <fieldset className="info-fieldset-box no-print">
            <legend>Information</legend>
            <div className="fieldset-content">
              <div className="filter-group">
                <label>From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>

              {/* 👤 NAYA CUSTOMER DROPDOWN */}
              <div className="filter-group">
                <label>Customer</label>
                <select 
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #4f5b66',
                    backgroundColor: '#1a1e24',
                    color: '#fff',
                    fontSize: '14px',
                    minWidth: '180px'
                  }}
                >
                  <option value="ALL">-- ALL (Sabhi Grahak) --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={fetchReceipts} className="btn-show-report">
                Show
              </button>
            </div>
          </fieldset>
          {/* <button onClick={fetchReceipts} className="btn-show-report">
            Show
          </button>
        </div>
      </fieldset> */}

      {/* 🖨️ PRINT / SAVE AS PDF BUTTON AREA */}
      {isReportGenerated && (
        // <div className="btn-print-pdf-holder no-print">
        //   <button onClick={triggerReportPrint} className="btn-print-report">
        //     🖨️ Print / Save as PDF
        //   </button>
        // </div>
        <div className="btn-print-pdf-holder no-print">
          <button onClick={handlePrintRegister} className="btn-print-report">
            🖨️ Print / Save as PDF
          </button>
        </div>
      )}

      {/* 🖥️ DATA TABLE CONTAINER */}
      {isReportGenerated && (
        <div className="printable-table-holder">
          <table className="main-data-table">
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Date</th>
                <th>Asclepius ID</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th>Amount Paid</th>
                <th>Remarks</th>
                <th className="no-print" style={{ textAlign: 'center' }}>Reprint</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#90a4ae' }}>Bhai, is range me koi receipts nahi mili.</td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.r_id}>
                    <td style={{ fontWeight: 'bold' }}>{r.r_id}</td>
                    <td>{r.date}</td>
                    <td>{r.asclepius_id || '-'}</td>
                    <td>{r.customer_name}</td>
                    <td style={{ textTransform: 'uppercase' }}>{r.mode}</td>
                    <td className="amount-green">₹{parseFloat(r.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="remarks-text">{r.remarks || '-'}</td>
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <button onClick={() => triggerPrint(r)} className="btn-action-print" title="Print Single Voucher Slip">🖨️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SINGLE RECEIPT VOUCHER SLIP LAYOUT (Remains same for individual printing) */}
      {selectedReceipt && (
        <div className="print-layout-container">
          <div style={{ border: '2px solid #000', padding: '20px', borderRadius: '12px', backgroundColor: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #000', paddingBottom: '12px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <h2>{firmProfile.firm_name}</h2>
                <p>{firmProfile.address_line_1}, {firmProfile.address_line_2}</p>
              </div>
              <div style={{ border: '2px solid #000', padding: '10px 15px', borderRadius: '8px' }}>
                <span>Receipt Voucher</span><br/>
                <strong>{selectedReceipt.r_id}</strong>
              </div>
            </div>
            {/* Out-of-the-box bill print data mapped perfectly */}
          </div>
        </div>
      )}

    </div>
  );
}