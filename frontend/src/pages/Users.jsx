import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Loader, Shield, User, Mail, Check, AlertCircle } from 'lucide-react';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [isActive, setIsActive] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (userItem) => {
    setSelectedUser(userItem);
    setUsername(userItem.username);
    setFullName(userItem.full_name);
    setEmail(userItem.email);
    setPassword(''); // Leave blank unless changing
    setRole(userItem.role);
    setIsActive(userItem.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !email.trim()) return;
    if (!selectedUser && !password) {
      setError('Password is required for new users');
      return;
    }

    setSubmitLoading(true);
    setError('');

    try {
      if (selectedUser) {
        // Update user
        const updateData = {
          full_name: fullName,
          email: email,
          role: role,
          is_active: isActive
        };
        if (password) {
          updateData.password = password;
        }
        await api.put(`/users/${selectedUser.id}`, updateData);
        setSuccess('User updated successfully');
      } else {
        // Create user
        await api.post('/users', {
          username,
          full_name: fullName,
          email,
          password,
          role,
          is_active: isActive
        });
        setSuccess('User created successfully');
      }
      setModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (userItem) => {
    if (userItem.id === currentUser.id) {
      setError('You cannot delete your own account');
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (userItem.username === 'admin') {
      setError("The default 'admin' system account cannot be deleted");
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user '${userItem.username}'?`)) return;

    setError('');
    try {
      await api.delete(`/users/${userItem.id}`);
      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      setTimeout(() => setError(''), 4000);
    }
  };

  // Filtered users for search input
  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(searchLower) ||
      u.full_name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower) ||
      u.role.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'admin':
        return 'badge-danger';
      case 'manager':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  };

  return (
    <div>
      {/* Top message widgets */}
      {success && (
        <div className="card" style={{ borderLeft: '4px solid var(--success)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem 1.25rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
        <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          Create User
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading user accounts...</div>}

      {!loading && filteredUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }} className="card">
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No user accounts found</p>
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 0 }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '1rem' }}>User info</th>
                <th style={{ padding: '1rem' }}>Username</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}>
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.full_name}</div>
                      {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>(You)</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>@{u.username}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${getRoleBadge(u.role)}`} style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 800 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: u.is_active ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: u.is_active ? 'var(--success)' : 'var(--text-muted)'
                      }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }} className="no-print">
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(u)}
                        title="Edit user"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUser?.id || u.username === 'admin'}
                        title={u.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete user'}
                        style={{ padding: '4px 8px', opacity: (u.id === currentUser?.id || u.username === 'admin') ? 0.5 : 1 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>{selectedUser ? 'Edit User Account' : 'Create User Account'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="user-username">Username *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>@</span>
                    <input
                      id="user-username"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '28px' }}
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                      required
                      disabled={submitLoading || !!selectedUser} // Username cannot be changed
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="user-fullname">Full Name *</label>
                  <input
                    id="user-fullname"
                    type="text"
                    className="form-control"
                    placeholder="e.g., John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="user-email">Email Address *</label>
                  <input
                    id="user-email"
                    type="email"
                    className="form-control"
                    placeholder="e.g., john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="user-password">
                    {selectedUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    className="form-control"
                    placeholder={selectedUser ? '••••••••' : 'Enter password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!selectedUser}
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="user-role">System Role *</label>
                  <select
                    id="user-role"
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    disabled={submitLoading || (selectedUser && selectedUser.id === currentUser?.id && selectedUser.role === 'admin')} // Prevent de-promoting self
                  >
                    <option value="staff">Staff (Default View/Transaction)</option>
                    <option value="manager">Manager (Adjustments, Products & Suppliers CRUD)</option>
                    <option value="admin">Administrator (Full Access & User Management)</option>
                  </select>
                </div>

                {selectedUser && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                    <input
                      id="user-active"
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={submitLoading || (selectedUser.id === currentUser?.id)} // Prevent deactivating self
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="user-active" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      Account Active (Allow Login)
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading || !username.trim() || !fullName.trim() || !email.trim()}>
                  {submitLoading ? <Loader className="animate-spin" size={16} /> : (selectedUser ? 'Save Changes' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
