import React, { useState, useEffect } from 'react';
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
  const [targetMobile, setTargetMobile] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cachedShareData, setCachedShareData] = useState(null);

  useEffect(() => {
    if (mobile) {
      setTargetMobile(mobile);
    } else {
      setTargetMobile('');
    }
    setPdfCloudUrl('');
    setCachedShareData(null);
    setShowQrCode(false);
    setStatusMessage('');
  }, [mobile, id, isOpen]);

  if (!isOpen) return null;

  const isInvoice = type === 'invoice';
  const titleText = isInvoice ? `Sales Invoice #${id}` : `Receipt Voucher #${id}`;

  // Helper to fetch Cloudinary link on-demand
  const fetchCloudLink = async (overrideMobile = null) => {
    const mobileToUse = (overrideMobile !== null ? overrideMobile : targetMobile).trim();

    if (cachedShareData && cachedShareData.pdf_url && cachedShareData.mobile_sent === mobileToUse) {
      return cachedShareData;
    }

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
          mobile: mobileToUse,
          amount: amount
        })
      });

      const data = await response.json();
      if (data.success && data.pdf_url) {
        data.mobile_sent = mobileToUse;
        setPdfCloudUrl(data.pdf_url);
        setCachedShareData(data);
        return data;
      } else {
        alert(data.message || 'PDF Link generate nahi ho paya!');
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

  // 1-Click WhatsApp Web Share (Uses a named window to avoid multi-tab conflicts)
  const handleShareWhatsAppWeb = async () => {
    const cleanDigits = targetMobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      alert("⚠️ Kripya customer ka 10-digit WhatsApp number zaroor check/enter karein!");
      return;
    }

    const shareData = await fetchCloudLink(targetMobile);
    if (shareData && shareData.whatsapp_web_url) {
      // Named target 'AsclepiusWhatsAppTab' reuses the same tab to avoid 'WhatsApp is open in another window' conflict
      window.open(shareData.whatsapp_web_url, 'AsclepiusWhatsAppTab');
    }
  };

  // Direct WhatsApp App (whatsapp:// protocol for Windows WhatsApp desktop app)
  const handleShareWhatsAppApp = async () => {
    const cleanDigits = targetMobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      alert("⚠️ Kripya customer ka 10-digit WhatsApp number zaroor check/enter karein!");
      return;
    }

    const shareData = await fetchCloudLink(targetMobile);
    if (shareData && shareData.whatsapp_app_url) {
      window.location.href = shareData.whatsapp_app_url;
    }
  };

  // Copy full message with link to clipboard
  const handleCopyMessage = async () => {
    const shareData = await fetchCloudLink(targetMobile);
    if (shareData && shareData.message) {
      try {
        await navigator.clipboard.writeText(shareData.message);
        setStatusMessage('✅ Message & Link Copied! Apne WhatsApp me jaakar Ctrl+V karein.');
        setTimeout(() => setStatusMessage(''), 5000);
      } catch (e) {
        alert("Clipboard copy error!");
      }
    }
  };

  // Toggle QR Code
  const handleToggleQr = async () => {
    if (!showQrCode && !pdfCloudUrl) {
      const shareData = await fetchCloudLink(targetMobile);
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
              <span className="detail-label">Total Amount</span>
              <span className="detail-value highlight-amount">
                ₹{Number(amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* WhatsApp Mobile Number Input */}
          <div className="mobile-input-card">
            <label>
              <span>📱</span> WhatsApp Mobile Number:
            </label>
            <input
              type="tel"
              className="mobile-input-field"
              value={targetMobile}
              onChange={(e) => setTargetMobile(e.target.value)}
              placeholder="10-digit WhatsApp number (eg. 9876543210)"
              maxLength={15}
            />
          </div>

          {statusMessage && <div className="share-status-toast">{statusMessage}</div>}

          {/* Action buttons */}
          <div className="share-actions-group">
            {/* Primary WhatsApp Web Button */}
            <button
              className="btn-whatsapp-share"
              onClick={handleShareWhatsAppWeb}
              disabled={loading}
              title="WhatsApp Web me bhejein"
            >
              <span>📱</span>
              <span>{loading ? 'Generating Link...' : 'WhatsApp Web par bhejein'}</span>
            </button>

            {/* Quick Helper Actions: Copy Message & WhatsApp App */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                className="btn-secondary-action btn-copy-action"
                onClick={handleCopyMessage}
                disabled={loading}
                title="Message aur PDF link copy karein"
              >
                <span>📋</span>
                <span>Copy Message & Link</span>
              </button>

              <button
                className="btn-secondary-action"
                onClick={handleShareWhatsAppApp}
                disabled={loading}
                title="Windows WhatsApp App me open karein"
              >
                <span>💻</span>
                <span>WhatsApp Desktop App</span>
              </button>
            </div>

            {/* QR Code and View PDF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
