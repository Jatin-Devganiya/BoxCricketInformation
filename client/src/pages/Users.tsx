import React, { useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import { User } from '../types';
import { Modal } from '../components/Modal';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Shield,
  AlertCircle
} from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit / Create Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    role: 'User',
    status: 'Active',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      role: 'User',
      status: 'Active',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      password: '', // Blank unless resetting
      role: user.roles?.[0] || 'User',
      status: user.status,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim()) {
      setFormError('First name, last name, and username are required.');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Password is required when creating a new user.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      if (editingUser) {
        await usersApi.update(editingUser.id, formData);
      } else {
        await usersApi.create(formData);
      }
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert('Default system administrator account cannot be deactivated.');
      return;
    }
    if (!window.confirm(`Deactivate user "${username}"?`)) return;

    try {
      await usersApi.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>User Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Admin portal for managing system credentials and user roles
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td>
                      <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {u.username}
                      </code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.roles?.includes('Admin')
                            ? 'badge-warning'
                            : u.roles?.includes('Umpire')
                            ? 'badge-primary'
                            : 'badge-info'
                        }`}
                      >
                        <Shield size={12} style={{ marginRight: '3px' }} />
                        {u.roles?.join(', ') || 'User'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>
                        {u.username.toLowerCase() !== 'admin' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="Deactivate User"
                          >
                            <Trash2 size={14} />
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

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.username}` : 'Create New User Account'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveUser} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save User'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser}>
          {formError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-input"
                required
                disabled={!!editingUser}
                placeholder="e.g. jsmith"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {editingUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                className="form-input"
                required={!editingUser}
                placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Admin">Admin (Full System Access & User Management)</option>
                <option value="Umpire">Umpire (Cricket Management & Live Scoring)</option>
                <option value="User">User (View Only / Read-Only Access)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
