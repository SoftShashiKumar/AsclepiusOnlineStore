import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseURL } from '../apiConfig';
import { 
  FaUserShield, FaUsers, FaStore, FaPlus, FaKey, FaEdit, 
  FaTrash, FaSync, FaSearch, FaCheckCircle, FaTimesCircle, FaBuilding, FaChartPie
} from 'react-icons/fa';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'stores' | 'overview'
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Data states
  const [users, setUsers] = useState([]);
  const [firmCounts, setFirmCounts] = useState({});
  const [firms, setFirms] = useState([]);
  const [stats, setStats] = useState(null);

  // Filter & Search states
  const [selectedFirmFilter, setSelectedFirmFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddFirmModal, setShowAddFirmModal] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    email: '',
    phone_number: '',
    firm_id: 'SHREE',
    role: 'Admin'
  });

  const [editingUser, setEditingUser] = useState(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [newFirmForm, setNewFirmForm] = useState({
    firm_name: '',
    firm_id: '',
    subdomain: '',
    proprietor_name: '',
    phone_1: '',
    email: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const [usersRes, firmsRes, statsRes] = await Promise.all([
        axios.get(`${baseURL}/api/superadmin/users/`),
        axios.get(`${baseURL}/api/superadmin/firms/`),
        axios.get(`${baseURL}/api/superadmin/stats/`)
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.users);
        setFirmCounts(usersRes.data.firm_counts || {});
        if (usersRes.data.firms) {
          setFirms(usersRes.data.firms);
        }
      }
      if (firmsRes.data.success) {
        setFirms(firmsRes.data.firms);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error("SuperAdmin Load Error:", err);
      setMessage({
        text: err.response?.data?.message || 'Error loading SuperAdmin data! Please verify backend.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ➕ CREATE USER
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.password.trim()) {
      alert("Username aur Password dono zaroori hain!");
      return;
    }
    try {
      const res = await axios.post(`${baseURL}/api/superadmin/users/create/`, userForm);
      if (res.data.success) {
        setMessage({ text: res.data.message, type: 'success' });
        setShowAddUserModal(false);
        setUserForm({
          username: '',
          password: '',
          email: '',
          phone_number: '',
          firm_id: firms[0]?.firm_id || 'SHREE',
          role: 'Admin'
        });
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user!');
    }
  };

  // ✏️ OPEN EDIT USER
  const openEditModal = (u) => {
    setEditingUser({
      id: u.id,
      username: u.username,
      email: u.email || '',
      phone_number: u.phone_number || '',
      firm_id: u.firm_id || '',
      role: u.role === 'SuperAdmin' ? 'SuperAdmin' : (u.is_staff ? 'Admin' : 'Customer'),
      is_active: u.is_active
    });
    setShowEditUserModal(true);
  };

  // ✏️ SUBMIT EDIT USER
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${baseURL}/api/superadmin/users/${editingUser.id}/update/`, {
        email: editingUser.email,
        phone_number: editingUser.phone_number,
        firm_id: editingUser.firm_id,
        role: editingUser.role,
        is_active: editingUser.is_active
      });
      if (res.data.success) {
        setMessage({ text: res.data.message, type: 'success' });
        setShowEditUserModal(false);
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user!');
    }
  };

  // 🔑 RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      alert("Password kam se kam 4 characters ka hona chahiye!");
      return;
    }
    try {
      const res = await axios.post(`${baseURL}/api/superadmin/users/${passwordTargetUser.id}/reset-password/`, {
        password: newPassword
      });
      if (res.data.success) {
        setMessage({ text: res.data.message, type: 'success' });
        setShowPasswordModal(false);
        setNewPassword('');
        setPasswordTargetUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password!');
    }
  };

  // 🗑️ DELETE USER
  const handleDeleteUser = async (u) => {
    if (u.username.toLowerCase() === 'shashi') {
      alert("Master SuperAdmin account 'shashi' delete nahi kiya ja sakta!");
      return;
    }
    if (!window.confirm(`Kya aap sach me user "${u.username}" ko DELETE karna chahte hain?`)) {
      return;
    }
    try {
      const res = await axios.post(`${baseURL}/api/superadmin/users/${u.id}/delete/`);
      if (res.data.success) {
        setMessage({ text: res.data.message, type: 'success' });
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user!');
    }
  };

  // 🏢 TOGGLE FIRM STATUS
  const handleToggleFirm = async (firm) => {
    try {
      const res = await axios.post(`${baseURL}/api/superadmin/firms/${firm.id}/toggle/`);
      if (res.data.success) {
        setMessage({ text: res.data.message, type: 'success' });
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update firm status!');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchFirm = selectedFirmFilter === 'ALL' || 
      (u.firm_id && u.firm_id.toUpperCase() === selectedFirmFilter.toUpperCase()) ||
      (!u.firm_id && selectedFirmFilter === 'GLOBAL');

    const searchLower = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
      u.username.toLowerCase().includes(searchLower) ||
      (u.email && u.email.toLowerCase().includes(searchLower)) ||
      (u.phone_number && u.phone_number.includes(searchLower));

    return matchFirm && matchSearch;
  });

  return (
    <div className="superadmin-wrapper">
      {/* Header Banner */}
      <div className="superadmin-header">
        <div className="header-info">
          <h1><FaUserShield style={{ marginRight: 10, color: '#facc15' }} /> SuperAdmin Control Center</h1>
          <p>Logged in as <strong>shashi</strong> — Full multi-tenant management & platform control</p>
        </div>
        <div className="header-actions">
          <button className="btn-action-gold" onClick={() => setShowAddUserModal(true)}>
            <FaPlus /> Naya User Banayein
          </button>
          <button className="btn-action-refresh" onClick={loadAllData} title="Refresh Data">
            <FaSync />
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`superadmin-alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
          <button className="alert-close" onClick={() => setMessage({ text: '', type: '' })}>×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="superadmin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> User Management ({users.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stores' ? 'active' : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          <FaStore /> Stores / Profiles ({firms.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartPie /> Platform Overview
        </button>
      </div>

      {loading ? (
        <div className="superadmin-loading">
          <div className="spinner"></div>
          <p>SuperAdmin data load ho raha hai...</p>
        </div>
      ) : (
        <>
          {/* ==================================================== */}
          {/* TAB 1: USER MANAGEMENT                               */}
          {/* ==================================================== */}
          {activeTab === 'users' && (
            <div className="tab-content-panel">
              {/* Profile User Counts Pill Bar */}
              <div className="firm-summary-bar">
                <span className="summary-title"><FaBuilding /> Profiles summary:</span>
                <span 
                  className={`firm-pill ${selectedFirmFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedFirmFilter('ALL')}
                >
                  All Users: <strong>{users.length}</strong>
                </span>
                {Object.entries(firmCounts).map(([fid, count]) => (
                  <span 
                    key={fid} 
                    className={`firm-pill ${selectedFirmFilter === fid ? 'active' : ''}`}
                    onClick={() => setSelectedFirmFilter(fid)}
                  >
                    {fid}: <strong>{count}</strong>
                  </span>
                ))}
              </div>

              {/* Filter & Search Bar */}
              <div className="table-controls-bar">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by username, email, phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>}
                </div>

                <div className="filter-select-group">
                  <label>Filter Profile:</label>
                  <select 
                    value={selectedFirmFilter} 
                    onChange={(e) => setSelectedFirmFilter(e.target.value)}
                  >
                    <option value="ALL">All Profiles ({users.length})</option>
                    {firms.map(f => (
                      <option key={f.id || f.firm_id} value={f.firm_id || f.slug}>
                        {f.firm_name} ({f.firm_id || f.subdomain})
                      </option>
                    ))}
                    <option value="GLOBAL">Global / Unassigned</option>
                  </select>
                </div>

                <button className="btn-add-primary" onClick={() => setShowAddUserModal(true)}>
                  <FaPlus /> Add User
                </button>
              </div>

              {/* Users Table */}
              <div className="users-table-container">
                <table className="superadmin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Username</th>
                      <th>Profile / Firm</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="no-data-cell">
                          Koi user nahi mila is filter ke sath!
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => (
                        <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                          <td>{idx + 1}</td>
                          <td>
                            <div className="user-name-cell">
                              <strong>{u.username}</strong>
                              {u.username.toLowerCase() === 'shashi' && (
                                <span className="badge-superadmin">👑 SuperAdmin</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge-firm firm-${(u.firm_id || 'global').toLowerCase()}`}>
                              {u.firm_id ? u.firm_id.toUpperCase() : 'GLOBAL'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-role role-${u.role.toLowerCase()}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>{u.email || <span className="text-muted">Not Set</span>}</td>
                          <td>{u.phone_number || <span className="text-muted">—</span>}</td>
                          <td>
                            {u.is_active ? (
                              <span className="status-badge status-active"><FaCheckCircle /> Active</span>
                            ) : (
                              <span className="status-badge status-inactive"><FaTimesCircle /> Inactive</span>
                            )}
                          </td>
                          <td><span className="date-text">{u.date_joined || '—'}</span></td>
                          <td>
                            <div className="actions-cell">
                              <button 
                                className="btn-icon btn-edit" 
                                title="Edit User & Profile"
                                onClick={() => openEditModal(u)}
                              >
                                <FaEdit />
                              </button>
                              <button 
                                className="btn-icon btn-key" 
                                title="Reset / Change Password"
                                onClick={() => {
                                  setPasswordTargetUser(u);
                                  setNewPassword('');
                                  setShowPasswordModal(true);
                                }}
                              >
                                <FaKey />
                              </button>
                              {u.username.toLowerCase() !== 'shashi' && (
                                <button 
                                  className="btn-icon btn-delete" 
                                  title="Delete User"
                                  onClick={() => handleDeleteUser(u)}
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: STORES / PROFILES MANAGEMENT                  */}
          {/* ==================================================== */}
          {activeTab === 'stores' && (
            <div className="tab-content-panel">
              <div className="stores-grid">
                {firms.map((f) => {
                  const fid = (f.firm_id || f.slug || '').toUpperCase();
                  const uCount = firmCounts[fid] || f.stats?.user_count || 0;
                  return (
                    <div key={f.id} className={`store-card ${!f.is_active ? 'store-inactive' : ''}`}>
                      <div className="store-card-header">
                        <div>
                          <h3>{f.firm_name}</h3>
                          <span className="subdomain-tag">
                            🔗 {f.subdomain || f.slug}.asclepiusstore.in
                          </span>
                        </div>
                        <span className={`badge-active-toggle ${f.is_active ? 'active' : 'inactive'}`}>
                          {f.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="store-card-body">
                        <div className="store-stat-row">
                          <span>👥 Total Users:</span>
                          <strong>{uCount} Users</strong>
                        </div>
                        <div className="store-stat-row">
                          <span>👤 Proprietor:</span>
                          <span>{f.proprietor_name || '—'}</span>
                        </div>
                        <div className="store-stat-row">
                          <span>📞 Contact:</span>
                          <span>{f.phone || f.phone_1 || '—'}</span>
                        </div>
                        <div className="store-stat-row">
                          <span>✉️ Email:</span>
                          <span>{f.email || '—'}</span>
                        </div>
                      </div>

                      <div className="store-card-footer">
                        <button 
                          className="btn-sm btn-filter-users"
                          onClick={() => {
                            setSelectedFirmFilter(fid);
                            setActiveTab('users');
                          }}
                        >
                          <FaUsers /> Is Profile Ke Users Dekhein ({uCount})
                        </button>
                        <button 
                          className={`btn-sm ${f.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                          onClick={() => handleToggleFirm(f)}
                        >
                          {f.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: PLATFORM OVERVIEW                             */}
          {/* ==================================================== */}
          {activeTab === 'overview' && (
            <div className="tab-content-panel">
              <div className="stats-cards-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrap icon-stores"><FaStore /></div>
                  <div className="stat-data">
                    <h3>{stats?.total_stores || firms.length}</h3>
                    <p>Total Profiles / Stores</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap icon-users"><FaUsers /></div>
                  <div className="stat-data">
                    <h3>{stats?.total_users || users.length}</h3>
                    <p>Total Registered Users</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap icon-admins"><FaUserShield /></div>
                  <div className="stat-data">
                    <h3>{stats?.admin_users || users.filter(u => u.is_staff).length}</h3>
                    <p>Total Staff / Admins</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap icon-bills"><FaCheckCircle /></div>
                  <div className="stat-data">
                    <h3>{stats?.total_bills || 0}</h3>
                    <p>Total Invoices Generated</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: ADD NEW USER                                */}
      {/* ==================================================== */}
      {showAddUserModal && (
        <div className="superadmin-modal-overlay">
          <div className="superadmin-modal-box">
            <div className="modal-header">
              <h2><FaPlus /> Naya User Create Karein</h2>
              <button className="modal-close-btn" onClick={() => setShowAddUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Username *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Amisha"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Amisha@123"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Assign to Profile / Firm *</label>
                  <select 
                    value={userForm.firm_id}
                    onChange={(e) => setUserForm({ ...userForm, firm_id: e.target.value })}
                  >
                    <option value="SHREE">SHREE (Shree Wellness Center)</option>
                    <option value="DEMO">DEMO (Demo Store)</option>
                    {firms.filter(f => !['SHREE', 'DEMO'].includes((f.firm_id || f.slug || '').toUpperCase())).map(f => (
                      <option key={f.id} value={(f.firm_id || f.subdomain || f.slug).toUpperCase()}>
                        {f.firm_name}
                      </option>
                    ))}
                    <option value="">GLOBAL (No specific firm)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="Admin">Admin / Staff (Full Access)</option>
                    <option value="Customer">Customer (Store View Only)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Email (Optional / OTP ke liye)</label>
                  <input 
                    type="email" 
                    placeholder="user@example.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+919876543210"
                    value={userForm.phone_number}
                    onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  User Banayein
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: EDIT USER DETAILS                          */}
      {/* ==================================================== */}
      {showEditUserModal && editingUser && (
        <div className="superadmin-modal-overlay">
          <div className="superadmin-modal-box">
            <div className="modal-header">
              <h2><FaEdit /> Edit User: {editingUser.username}</h2>
              <button className="modal-close-btn" onClick={() => setShowEditUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Profile / Firm Assignment</label>
                  <select 
                    value={editingUser.firm_id}
                    onChange={(e) => setEditingUser({ ...editingUser, firm_id: e.target.value })}
                  >
                    <option value="SHREE">SHREE</option>
                    <option value="DEMO">DEMO</option>
                    {firms.filter(f => !['SHREE', 'DEMO'].includes((f.firm_id || f.slug || '').toUpperCase())).map(f => (
                      <option key={f.id} value={(f.firm_id || f.subdomain || f.slug).toUpperCase()}>
                        {f.firm_name}
                      </option>
                    ))}
                    <option value="">GLOBAL (Platform Admin)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    disabled={editingUser.username.toLowerCase() === 'shashi'}
                  >
                    <option value="Admin">Admin / Staff</option>
                    <option value="Customer">Customer</option>
                    {editingUser.username.toLowerCase() === 'shashi' && (
                      <option value="SuperAdmin">SuperAdmin</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    value={editingUser.phone_number}
                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    disabled={editingUser.username.toLowerCase() === 'shashi'}
                  />
                  <span>Account Active hai (Login Allowed)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowEditUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: RESET USER PASSWORD                         */}
      {/* ==================================================== */}
      {showPasswordModal && passwordTargetUser && (
        <div className="superadmin-modal-overlay">
          <div className="superadmin-modal-box modal-sm">
            <div className="modal-header">
              <h2><FaKey /> Password Reset: {passwordTargetUser.username}</h2>
              <button className="modal-close-btn" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Naya Password Dalein *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <p className="modal-hint">
                Yeh naya password turant database me save ho jayega. User agle login me ise use kar sakega.
              </p>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
