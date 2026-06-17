import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = ['B.Com', 'B.Com ISM', 'BCA', 'BSc CS', 'BSc IT', 'BA', 'Other'];

export default function AdminPanel() {
  const { authFetch, user, showToast, API_BASE } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Add form state
  const [addForm, setAddForm] = useState({ username: '', password: '', department: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${API_BASE}/admin/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Create user
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!addForm.username.trim() || !addForm.password.trim() || !addForm.department) {
      setAddError('All fields are required');
      return;
    }

    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters');
      return;
    }

    setAddLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create user');
      }

      showToast(`User "${addForm.username}" created successfully`, 'success');
      setAddForm({ username: '', password: '', department: '' });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Delete user
  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"? This action cannot be undone.`)) return;

    try {
      const res = await authFetch(`${API_BASE}/admin/users/${u.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete');
      }
      showToast(`User "${u.username}" deleted`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/admin/users/${resetModal.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to reset password');
      }

      showToast(`Password reset for "${resetModal.username}"`, 'success');
      setResetModal(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 3L3 8v10l10 5 10-5V8L13 3z" stroke="url(#ag)" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="13" cy="13" r="3" stroke="url(#ag)" strokeWidth="2"/>
                <defs><linearGradient id="ag" x1="3" y1="3" x2="23" y2="23"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs>
              </svg>
              Admin Panel
            </h1>
            <p className="admin-subtitle">Manage teacher accounts and departments</p>
          </div>

          <button
            className="start-btn admin-add-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            id="add-teacher-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {showAddForm ? 'Cancel' : 'Add Teacher'}
          </button>
        </div>

        {/* Add Teacher Form */}
        {showAddForm && (
          <div className="admin-form-card">
            <h3 className="admin-form-title">Create Teacher Account</h3>
            <form onSubmit={handleAddUser} className="admin-form">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label htmlFor="new-username" className="input-label">Username</label>
                  <input
                    id="new-username"
                    type="text"
                    className="form-input"
                    placeholder="e.g. john_teacher"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password" className="input-label">Password</label>
                  <input
                    id="new-password"
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-department" className="input-label">Department</label>
                  <select
                    id="new-department"
                    className="form-input form-select"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {addError && <div className="error-message" style={{ marginTop: '0.75rem' }}>{addError}</div>}

              <button
                type="submit"
                className="start-btn"
                style={{ marginTop: '1rem', maxWidth: 200 }}
                disabled={addLoading}
              >
                {addLoading ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating...</>
                ) : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="table-wrapper">
          <table className="results-table admin-table" id="admin-users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Department</th>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No users found
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="td-name">
                    <span className="admin-user-icon">
                      {u.role === 'admin' ? '👑' : '👤'}
                    </span>
                    {u.username}
                  </td>
                  <td>
                    <span className="navbar-badge dept-badge">{u.department}</span>
                  </td>
                  <td>
                    <span className={`navbar-badge role-badge ${u.role === 'admin' ? 'role-admin' : 'role-teacher'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="admin-actions-cell">
                    {u.id !== user.id ? (
                      <>
                        <button
                          className="admin-action-btn reset-btn"
                          onClick={() => { setResetModal(u); setNewPassword(''); }}
                          title="Reset Password"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                          Reset
                        </button>
                        <button
                          className="admin-action-btn delete-btn"
                          onClick={() => handleDelete(u)}
                          title="Delete User"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M9.5 6v4.5a1 1 0 01-1 1h-3a1 1 0 01-1-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="admin-you-badge">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reset Password Modal */}
        {resetModal && (
          <div className="modal-overlay" onClick={() => setResetModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Reset Password</h3>
              <p className="modal-desc">
                Set a new password for <strong>{resetModal.username}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="reset-password" className="input-label">New Password</label>
                <input
                  id="reset-password"
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="modal-cancel-btn" onClick={() => setResetModal(null)}>Cancel</button>
                <button className="start-btn modal-confirm-btn" onClick={handleResetPassword}>
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
