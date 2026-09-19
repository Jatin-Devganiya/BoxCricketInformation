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
  AlertCircle,
  Check,
  X,
  Eye,
  Sliders,
  Info,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';

interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

const PERMISSIONS: PermissionDef[] = [
  {
    key: 'Matches',
    label: 'Matches',
    description: 'Schedule new matches, edit match details, and soft-delete/cancel matches',
  },
  {
    key: 'LiveScoring',
    label: 'Live Scoring',
    description: 'Start innings, record ball-by-ball events, wickets, bowler changes, and declare outcome',
  },
  {
    key: 'UserManagement',
    label: 'User Management',
    description: 'Access user administration, create/edit accounts, and configure permission overrides',
  },
  {
    key: 'Players',
    label: 'Players',
    description: 'Create, edit, and deactivate player profiles in the system',
  },
  {
    key: 'Teams',
    label: 'Teams',
    description: 'Create, edit teams, and manage squad player rosters',
  },
  {
    key: 'Series',
    label: 'Series / Tournaments',
    description: 'Create, edit, and manage tournament series schedules',
  },
];

const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  Admin: {
    Matches: true,
    LiveScoring: true,
    UserManagement: true,
    Players: true,
    Teams: true,
    Series: true,
  },
  Umpire: {
    Matches: true,
    LiveScoring: true,
    UserManagement: false,
    Players: true,
    Teams: true,
    Series: true,
  },
  User: {
    Matches: false,
    LiveScoring: false,
    UserManagement: false,
    Players: false,
    Teams: false,
    Series: false,
  },
};

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Sorting
  type SortField = 'user' | 'role' | 'status' | 'overrides' | 'created';
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Newest users first by default

  // Pagination (Default 100)
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortField, sortAsc, pageSize]);

  // Edit / Create Modal state
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
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, string>>({
    Matches: 'Inherit',
    LiveScoring: 'Inherit',
    UserManagement: 'Inherit',
    Players: 'Inherit',
    Teams: 'Inherit',
    Series: 'Inherit',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // View Effective Access Matrix Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState<boolean>(false);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

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
    setPermissionOverrides({
      Matches: 'Inherit',
      LiveScoring: 'Inherit',
      UserManagement: 'Inherit',
      Players: 'Inherit',
      Teams: 'Inherit',
      Series: 'Inherit',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    const userRole = user.roles?.[0] || 'User';
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      password: '', // Blank unless resetting
      role: userRole,
      status: user.status,
    });

    const initialOverrides: Record<string, string> = {
      Matches: user.overrides?.['Matches'] || user.overrides?.['matches'] || 'Inherit',
      LiveScoring: user.overrides?.['LiveScoring'] || user.overrides?.['livescoring'] || 'Inherit',
      UserManagement: user.overrides?.['UserManagement'] || user.overrides?.['usermanagement'] || 'Inherit',
      Players: user.overrides?.['Players'] || user.overrides?.['players'] || 'Inherit',
      Teams: user.overrides?.['Teams'] || user.overrides?.['teams'] || 'Inherit',
      Series: user.overrides?.['Series'] || user.overrides?.['series'] || 'Inherit',
    };
    setPermissionOverrides(initialOverrides);
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenInspect = (user: User) => {
    setInspectingUser(user);
    setInspectModalOpen(true);
  };

  const handleOverrideChange = (permKey: string, value: string) => {
    setPermissionOverrides((prev) => ({
      ...prev,
      [permKey]: value,
    }));
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

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        password: formData.password ? formData.password : undefined,
        role: formData.role,
        status: formData.status,
        permissionOverrides: permissionOverrides,
      };

      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create(payload);
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

  // Calculates effective access for a permission given role and overrides
  const calculateEffective = (role: string, overrides: Record<string, string>, permKey: string) => {
    const override = overrides[permKey];
    if (override === 'Allow') {
      return { isAllowed: true, source: 'Override (Allow)', isOverride: true };
    }
    if (override === 'Deny') {
      return { isAllowed: false, source: 'Override (Deny)', isOverride: true };
    }
    const roleDefault = ROLE_DEFAULTS[role]?.[permKey] ?? false;
    return {
      isAllowed: roleDefault,
      source: `Role Default (${role})`,
      isOverride: false,
    };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For created date and overrides, descending on first click
      setSortAsc(field === 'created' || field === 'overrides' ? false : true);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ opacity: 0.3, marginLeft: '0.35rem', verticalAlign: 'middle' }} />;
    }
    return sortAsc ? (
      <ArrowUp size={13} style={{ color: '#10b981', marginLeft: '0.35rem', verticalAlign: 'middle' }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#10b981', marginLeft: '0.35rem', verticalAlign: 'middle' }} />
    );
  };

  const filteredUsers = users.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const username = (u.username || '').toLowerCase();
      if (!fullName.includes(q) && !username.includes(q)) return false;
    }
    const userRole = u.roles?.[0] || 'User';
    if (roleFilter && userRole.toLowerCase() !== roleFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter && u.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortField === 'user') {
      const aName = `${a.firstName} ${a.lastName}`.trim() || a.username;
      const bName = `${b.firstName} ${b.lastName}`.trim() || b.username;
      return sortAsc ? aName.localeCompare(bName) : bName.localeCompare(aName);
    }
    if (sortField === 'role') {
      const aRole = a.roles?.[0] || 'User';
      const bRole = b.roles?.[0] || 'User';
      return sortAsc ? aRole.localeCompare(bRole) : bRole.localeCompare(aRole);
    }
    if (sortField === 'status') {
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    }
    if (sortField === 'overrides') {
      const aCount = Object.values(a.overrides || {}).filter((v) => v === 'Allow' || v === 'Deny').length;
      const bCount = Object.values(b.overrides || {}).filter((v) => v === 'Allow' || v === 'Deny').length;
      if (aCount !== bCount) return sortAsc ? aCount - bCount : bCount - aCount;
      return a.username.localeCompare(b.username);
    }
    if (sortField === 'created') {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortAsc ? aTime - bTime : bTime - aTime;
    }
    return sortAsc ? a.username.localeCompare(b.username) : b.username.localeCompare(a.username);
  });

  // Pagination calculations
  const totalUsers = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalUsers);
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      {/* Header & Add User */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>User Management & Access Control</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Admin portal for managing credentials, roles, and granular user-level permission overrides
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search users by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '135px' }}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Umpire">Umpire</option>
            <option value="User">User</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '140px' }}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('user')}
                  title="User - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    User
                    {renderSortIndicator('user')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('role')}
                  title="Role - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Role
                    {renderSortIndicator('role')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('status')}
                  title="Status - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Status
                    {renderSortIndicator('status')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('overrides')}
                  title="Permission Overrides & Access - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Permission Overrides & Effective Access
                    {renderSortIndicator('overrides')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('created')}
                  title="Created Date - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Created
                    {renderSortIndicator('created')}
                  </div>
                </th>
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
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const userRole = u.roles?.[0] || 'User';
                  const overridesList = Object.entries(u.overrides || {}).filter(
                    ([, val]) => val === 'Allow' || val === 'Deny'
                  );

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {u.firstName} {u.lastName}
                        </div>
                        <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          @{u.username}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            userRole === 'Admin'
                              ? 'badge-warning'
                              : userRole === 'Umpire'
                              ? 'badge-primary'
                              : 'badge-muted'
                          }`}
                        >
                          <Shield size={12} style={{ marginRight: '3px' }} />
                          {userRole}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                          {overridesList.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {overridesList.map(([perm, val]) => (
                                <span
                                  key={perm}
                                  className={`badge ${val === 'Allow' ? 'badge-success' : 'badge-danger'}`}
                                  style={{ fontSize: '0.72rem', letterSpacing: '0.2px' }}
                                  title={`User Override takes precedence over ${userRole} role default`}
                                >
                                  {perm === 'LiveScoring'
                                    ? 'Live Scoring'
                                    : perm === 'UserManagement'
                                    ? 'User Mgmt'
                                    : perm}
                                  : <strong>{val}</strong> (Override)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Inherits all {userRole} role defaults
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenInspect(u)}
                            className="btn btn-sm btn-secondary"
                            style={{
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginTop: '0.1rem'
                            }}
                          >
                            <Eye size={12} /> View Effective Access
                          </button>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User & Overrides"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left: Summary & Rows Per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalUsers === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {endIndex}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalUsers}
              </strong>{' '}
              users
            </span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Rows per page:</span>
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  width: '85px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.85rem',
                  height: '32px',
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              title="First Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage <= 1 ? 0.45 : 1,
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronFirst size={16} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              title="Previous Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage <= 1 ? 0.45 : 1,
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page number pills */}
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  className={`btn btn-sm ${p === safeCurrentPage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    minWidth: '34px',
                    padding: '0.35rem 0.6rem',
                    fontWeight: p === safeCurrentPage ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ) : (
                <span
                  key={idx}
                  style={{
                    padding: '0 0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    userSelect: 'none',
                  }}
                >
                  ...
                </span>
              )
            )}

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              title="Next Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage >= totalPages ? 0.45 : 1,
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              title="Last Page"
              style={{
                padding: '0.35rem 0.55rem',
                opacity: safeCurrentPage >= totalPages ? 0.45 : 1,
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLast size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingUser ? `Edit User & Permissions: ${editingUser.username}` : 'Create New User Account'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveUser} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save User & Permissions'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser}>
          {formError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
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
                placeholder="e.g. john"
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
              <label className="form-label">Primary Role</label>
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

          {/* Granular Permission Overrides Section */}
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="var(--accent-cricket)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Granular Permission Overrides</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                User overrides take highest priority over role defaults
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Select <strong>Inherit</strong> to follow the default access for the <code>{formData.role}</code> role,
              or choose an explicit <strong>Allow</strong> or <strong>Deny</strong> override for this specific user.
            </p>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                marginBottom: '1.25rem',
              }}
            >
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Feature / Permission</th>
                    <th>Role Default ({formData.role})</th>
                    <th>User Override Setting</th>
                    <th>Calculated Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((perm) => {
                    const roleDefault = ROLE_DEFAULTS[formData.role]?.[perm.key] ?? false;
                    const currentOverride = permissionOverrides[perm.key] || 'Inherit';
                    const effective = calculateEffective(formData.role, permissionOverrides, perm.key);

                    return (
                      <tr key={perm.key}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{perm.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {perm.description}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${roleDefault ? 'badge-success' : 'badge-muted'}`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {roleDefault ? 'Allow' : 'Deny'}
                          </span>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.8rem',
                              background: currentOverride !== 'Inherit' ? 'rgba(16, 185, 129, 0.08)' : undefined,
                              borderColor: currentOverride !== 'Inherit' ? 'var(--accent-cricket)' : undefined,
                            }}
                            value={currentOverride}
                            onChange={(e) => handleOverrideChange(perm.key, e.target.value)}
                          >
                            <option value="Inherit">
                              Inherit from Role ({roleDefault ? 'Allow' : 'Deny'})
                            </option>
                            <option value="Allow">Allow (Override)</option>
                            <option value="Deny">Deny (Override)</option>
                          </select>
                        </td>
                        <td>
                          <span
                            className={`badge ${effective.isAllowed ? 'badge-success' : 'badge-danger'}`}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              letterSpacing: '0.3px',
                            }}
                          >
                            {effective.isAllowed ? <Check size={12} /> : <X size={12} />}
                            {effective.isAllowed ? 'ALLOW' : 'DENY'}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {effective.isOverride ? (
                              <span style={{ color: effective.isAllowed ? '#34d399' : '#f87171' }}>
                                (Via User Override)
                              </span>
                            ) : (
                              '(Via Role)'
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Effective Access Preview Card */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Info size={16} color="var(--accent-cricket)" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Live Effective Access Preview for {formData.username || 'User'} ({formData.role}):
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
                {PERMISSIONS.map((p) => {
                  const eff = calculateEffective(formData.role, permissionOverrides, p.key);
                  return (
                    <div
                      key={p.key}
                      style={{
                        background: eff.isAllowed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${eff.isAllowed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{p.label}:</span>
                      <strong style={{ color: eff.isAllowed ? '#34d399' : '#f87171' }}>
                        {eff.isAllowed ? 'Allow' : 'Deny'}
                      </strong>
                      {eff.isOverride && (
                        <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                          [Override]
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Inspect Effective Access Modal */}
      {inspectingUser && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Effective Access Matrix: ${inspectingUser.firstName} ${inspectingUser.lastName} (@${inspectingUser.username})`}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setInspectModalOpen(false);
                  handleOpenEdit(inspectingUser);
                }}
              >
                <Edit2 size={14} /> Edit User & Overrides
              </button>
              <button className="btn btn-primary" onClick={() => setInspectModalOpen(false)}>
                Close
              </button>
            </div>
          }
        >
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.25rem',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Role:</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {inspectingUser.roles?.[0] || 'User'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Status:</span>
                <div>
                  <span className={`badge ${inspectingUser.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                    {inspectingUser.status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Overrides:</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {Object.keys(inspectingUser.overrides || {}).length > 0
                    ? `${Object.keys(inspectingUser.overrides || {}).length} Custom Override(s)`
                    : 'None (Standard Role Defaults)'}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
              }}
            >
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Permission Area</th>
                    <th>Role Default</th>
                    <th>User Override</th>
                    <th>Effective Access</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((perm) => {
                    const primaryRole = inspectingUser.roles?.[0] || 'User';
                    const roleDefault = ROLE_DEFAULTS[primaryRole]?.[perm.key] ?? false;
                    const overrideVal = inspectingUser.overrides?.[perm.key] || inspectingUser.overrides?.[perm.key.toLowerCase()];
                    const hasOverride = overrideVal === 'Allow' || overrideVal === 'Deny';
                    const isAllowed = hasOverride ? overrideVal === 'Allow' : roleDefault;

                    return (
                      <tr key={perm.key}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{perm.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {perm.description}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${roleDefault ? 'badge-success' : 'badge-muted'}`}>
                            {roleDefault ? 'Allow' : 'Deny'}
                          </span>
                        </td>
                        <td>
                          {hasOverride ? (
                            <span className={`badge ${overrideVal === 'Allow' ? 'badge-success' : 'badge-danger'}`}>
                              {overrideVal} (Override)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Inherit from Role
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${isAllowed ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontWeight: 700 }}
                          >
                            {isAllowed ? <Check size={12} /> : <X size={12} />}
                            {isAllowed ? 'ALLOW' : 'DENY'}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {hasOverride ? (
                              <span style={{ color: isAllowed ? '#34d399' : '#f87171' }}>
                                (Explicit User Override)
                              </span>
                            ) : (
                              `(Inherited from ${primaryRole})`
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
