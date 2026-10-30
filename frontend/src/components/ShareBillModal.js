import React, { useState } from 'react';
import './ShareBillModal.css';
import { baseURL } from '../apiConfig';

const ShareBillModal = ({
  isOpen,
  onClose,
  type = 'invoice', // 'invoice' or 'receipt'
  id,
  customerName = '',
  mobile = '',
  amount = 0,
  pdfBlobUrl = null,
  onNewBill = null
}) => {
  const [loading, setLoading] = useState(false);
  const [pdfCloudUrl, setPdfCloudUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const isInvoice = type === 'invoice';
  const titleText = isInvoice ? `Sales Invoice #${id}` : `Receipt Voucher #${id}`;

  // Helper to fetch Cloudinary link on-demand
  const fetchCloudLink = async () => {
    if (pdfCloudUrl) return pdfCloudUrl;

    setLoading(true);
    setStatusMessage('Link generate ho raha hai... ⏳');
    try {
      const response = await fetch(`${baseURL}/api/share/get-pdf-link/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          id: id,
          customer_name: customerName,
          mobile: mobile,
          amount: amount
        })
      });

      const data = await response.json();
      if (data.success && data.pdf_url) {
        setPdfCloudUrl(data.pdf_url);
        return data;
      } else {
        alert(data.message || 'PDF Link create nahi ho paya!');
        return null;
      }
    } catch (err) {
      console.error('Share link error:', err);
      alert('Server connect karne me error aayi!');
      return null;
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // 1-Click WhatsApp Share
  const handleShareWhatsApp = async () => {
    const shareData = await fetchCloudLink();
    if (shareData && shareData.whatsapp_url) {
      window.open(shareData.whatsapp_url, '_blank');
    }
  };

  // Toggle QR Code (Fetches link if not yet generated)
  const handleToggleQr = async () => {
    if (!showQrCode && !pdfCloudUrl) {
      const shareData = await fetchCloudLink();
      if (shareData && shareData.pdf_url) {
        setShowQrCode(true);
      }
    } else {
      setShowQrCode(!showQrCode);
    }
  };

  // View / Print PDF in browser
  const handleViewPdf = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else if (pdfCloudUrl) {
      window.open(pdfCloudUrl, '_blank');
    } else {
      // Fallback to backend view endpoint
      const endpoint = isInvoice 
        ? `${baseURL}/api/sales/view-pdf/${id}/` 
        : `${baseURL}/api/receipts/view-pdf/${id}/`;
      window.open(endpoint, '_blank');
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h3>
            <span>✅</span> {titleText} Saved!
          </h3>
          <button className="share-modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="share-modal-body">
          {/* Bill summary badges */}
          <div className="share-bill-details">
            <div className="detail-item">
              <span className="detail-label">Customer</span>
              <span className="detail-value">{customerName || 'Walk-in'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mobile</span>
              <span className="detail-value">{mobile || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total Amount</span>
              <span className="detail-value highlight-amount">
                ₹{Number(amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value" style={{ color: '#0284c7' }}>
                Saved & Downloaded
              </span>
            </div>
          </div>

          {statusMessage && <div className="share-status-toast">{statusMessage}</div>}

          {/* Action buttons */}
          <div className="share-actions-group">
            {/* Primary WhatsApp Button */}
            <button
              className="btn-whatsapp-share"
              onClick={handleShareWhatsApp}
              disabled={loading}
            >
              <span>📱</span>
              <span>{loading ? 'Generating Link...' : 'WhatsApp पर भेजें (1-Click)'}</span>
            </button>

            {/* QR Code and View PDF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn-secondary-action"
                onClick={handleToggleQr}
                disabled={loading}
              >
                <span>📷</span>
                <span>{showQrCode ? 'Hide QR' : 'Show QR Code'}</span>
              </button>

              <button className="btn-secondary-action" onClick={handleViewPdf}>
                <span>🖨️</span>
                <span>Open / Print PDF</span>
              </button>
            </div>
          </div>

          {/* Dynamic QR Code display for counter customer */}
          {showQrCode && pdfCloudUrl && (
            <div className="qr-code-section">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  pdfCloudUrl
                )}`}
                alt="Scan to download Bill"
                width="180"
                height="180"
              />
              <p className="qr-instruction">
                📲 Customer apne phone camera se scan karke PDF bill download kar sakte hain.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="share-modal-footer">
          <button className="btn-secondary-action" onClick={onClose}>
            Close
          </button>

          {onNewBill && (
            <button
              className="btn-next-bill"
              onClick={() => {
                onClose();
                onNewBill();
              }}
            >
              <span>➕</span>
              <span>Agla Bill (Next Customer)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareBillModal;
