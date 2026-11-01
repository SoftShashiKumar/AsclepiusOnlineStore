import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import './FirmMaster.css';

export default function FirmMaster() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState(null);

  const initialForm = {
    id: null,
    firm_id: '',
    subdomain: '',
    firm_name: '',
    proprietor_name: '',
    invoice_prefix: '',
    phone_1: '',
    phone_2: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    gstin_number: '',
    tagline_1: '',
    tagline_2: '',
    bank_details: '',
    is_active: true
  };

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchFirms = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseURL}/api/firms/all/`);
      if (res.data && res.data.success) {
        setFirms(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching firms:', err);
      alert('Firms list load nahi ho payi. Backend check karein.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFirm(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (firm) => {
    setEditingFirm(firm);
    setFormData({
      id: firm.id,
      firm_id: firm.firm_id || '',
      subdomain: firm.subdomain || '',
      firm_name: firm.firm_name || '',
      proprietor_name: firm.proprietor_name || '',
      invoice_prefix: firm.invoice_prefix || '',
      phone_1: firm.phone_1 || '',
      phone_2: firm.phone_2 || '',
      email: firm.email || '',
      address_line_1: firm.address_line_1 || '',
      address_line_2: firm.address_line_2 || '',
      gstin_number: firm.gstin_number || '',
      tagline_1: firm.tagline_1 || '',
      tagline_2: firm.tagline_2 || '',
      bank_details: firm.bank_details || '',
      is_active: firm.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firm_id.trim() || !formData.subdomain.trim() || !formData.firm_name.trim()) {
      alert('Firm ID, Subdomain aur Firm Name bharna anivarya hai!');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(`${baseURL}/api/firms/save/`, formData);
      if (res.data && res.data.success) {
        alert(res.data.message || 'Firm profile successfully save ho gayi!');
        setIsModalOpen(false);
        fetchFirms();
      } else {
        alert('Save fail: ' + (res.data.message || 'Unknown error'));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Server error';
      alert('Error: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="firm-master-container">
      <div className="firm-master-header">
        <div className="firm-master-title-box">
          <h1 className="firm-master-title">🏢 Multi-Tenant Firms Master</h1>
          <p className="firm-master-sub">
            Yahan se aap kisi bhi naye dukandaar / firm ko add kar sakte hain. Subdomain aur ID dalte hi yeh pure project me laagu ho jayegi!
          </p>
        </div>
        <button className="btn-add-firm" onClick={handleOpenAddModal}>
          ➕ Add New Firm / Store
        </button>
      </div>

      {loading ? (
        <div className="firm-loading">Loading Firms Data...</div>
      ) : (
        <div className="firm-grid">
          {firms.map(firm => {
            const isLive = firm.is_active !== false;
            const liveStoreUrl = `https://${firm.subdomain}.asclepiusstore.in`;

            return (
              <div key={firm.id} className={`firm-card ${isLive ? 'active' : 'inactive'}`}>
                <div className="firm-card-top">
                  <div className="firm-badge-row">
                    <span className="firm-id-badge">{firm.firm_id}</span>
                    <span className={`status-pill ${isLive ? 'online' : 'offline'}`}>
                      {isLive ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  <h2 className="firm-name">{firm.firm_name}</h2>
                  {firm.proprietor_name && (
                    <div className="firm-prop">Prop: {firm.proprietor_name}</div>
                  )}
                </div>

                <div className="firm-details-box">
                  <div className="detail-row">
                    <span className="detail-label">Subdomain:</span>
                    <span className="detail-val domain-link">{firm.subdomain}.asclepiusstore.in</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Invoice Prefix:</span>
                    <span className="detail-val prefix-val">{firm.invoice_prefix || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-val">{firm.phone_1 || firm.phone_2 || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-val">
                      {[firm.address_line_1, firm.address_line_2].filter(Boolean).join(', ') || '-'}
                    </span>
                  </div>
                </div>

                <div className="firm-card-actions">
                  <button className="btn-edit-firm" onClick={() => handleOpenEditModal(firm)}>
                    ✏️ Edit Details
                  </button>
                  <a
                    href={liveStoreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-visit-store"
                  >
                    🌐 Visit Store
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📦 Add/Edit Firm Modal */}
      {isModalOpen && (
        <div className="firm-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="firm-modal-content" onClick={e => e.stopPropagation()}>
            <div className="firm-modal-header">
              <h2>{editingFirm ? `✏️ Edit Firm: ${editingFirm.firm_name}` : '➕ Add New Firm / Store'}</h2>
              <button className="firm-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="firm-modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Firm ID (Unique Code) <span className="req">*</span></label>
                  <input
                    type="text"
                    name="firm_id"
                    placeholder="e.g. PATNA, RANCHI, DEMO"
                    value={formData.firm_id}
                    onChange={e => setFormData({ ...formData, firm_id: e.target.value.toUpperCase() })}
                    required
                  />
                  <small>Database tables aur vouchers me use hoga (uppercase)</small>
                </div>

                <div className="form-group">
                  <label>Subdomain (Web Address) <span className="req">*</span></label>
                  <input
                    type="text"
                    name="subdomain"
                    placeholder="e.g. patna, ranchi, demo"
                    value={formData.subdomain}
                    onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '') })}
                    required
                  />
                  <small>https://{formData.subdomain || 'name'}.asclepiusstore.in</small>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Firm / Store Name <span className="req">*</span></label>
                  <input
                    type="text"
                    name="firm_name"
                    placeholder="e.g. Shree Wellness Center"
                    value={formData.firm_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Proprietor Name</label>
                  <input
                    type="text"
                    name="proprietor_name"
                    placeholder="e.g. Ram Kumar"
                    value={formData.proprietor_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Invoice Prefix</label>
                  <input
                    type="text"
                    name="invoice_prefix"
                    placeholder="e.g. INV, SWC, DEM"
                    value={formData.invoice_prefix}
                    onChange={e => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone 1 (Primary)</label>
                  <input
                    type="text"
                    name="phone_1"
                    placeholder="10-digit mobile"
                    value={formData.phone_1}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Phone 2 (Secondary)</label>
                  <input
                    type="text"
                    name="phone_2"
                    placeholder="Alternate mobile"
                    value={formData.phone_2}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Address Line 1</label>
                  <input
                    type="text"
                    name="address_line_1"
                    placeholder="Shop No., Market, Road"
                    value={formData.address_line_1}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Address Line 2 (City, State, PIN)</label>
                  <input
                    type="text"
                    name="address_line_2"
                    placeholder="City, State - PIN"
                    value={formData.address_line_2}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>GSTIN Number</label>
                  <input
                    type="text"
                    name="gstin_number"
                    placeholder="15-digit GSTIN"
                    value={formData.gstin_number}
                    onChange={e => setFormData({ ...formData, gstin_number: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="store@asclepiusstore.in"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Tagline 1</label>
                  <input
                    type="text"
                    name="tagline_1"
                    placeholder="e.g. Premium Ayurvedic & Wellness Products"
                    value={formData.tagline_1}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Tagline 2</label>
                  <input
                    type="text"
                    name="tagline_2"
                    placeholder="e.g. 100% Herbal & Authentic"
                    value={formData.tagline_2}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Bank & Payment Details</label>
                <textarea
                  name="bank_details"
                  placeholder="Bank Name, A/C No, IFSC, UPI ID"
                  rows="2"
                  value={formData.bank_details}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <span>Is Active (Is store ko online chalana hai)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-firm" disabled={saving}>
                  {saving ? 'Saving...' : (editingFirm ? 'Update Firm' : 'Create Firm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
