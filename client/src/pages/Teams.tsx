import React, { useEffect, useState, useMemo } from 'react';
import { teamsApi, playersApi } from '../api/client';
import { Team, TeamDetail, Player } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { MultiSelectDropdown, MultiSelectOption } from '../components/MultiSelectDropdown';
import {
  Shield,
  Plus,
  Users,
  Edit2,
  Trash2,
  UserPlus,
  X,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';

export const Teams: React.FC = () => {
  const { canManageTeams } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Sorting
  type SortField = 'name' | 'shortCode' | 'players' | 'status';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination (Default 100)
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, sortField, sortAsc, pageSize]);

  // Roster Modal
  const [rosterModalOpen, setRosterModalOpen] = useState<boolean>(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<TeamDetail | null>(null);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayersToAdd, setSelectedPlayersToAdd] = useState<(number | string)[]>([]);
  const [addingToSquad, setAddingToSquad] = useState<boolean>(false);

  // Edit / Create Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', shortName: '', status: 'Active' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsApi.getAll();
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'players' ? false : true);
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

  const filteredTeams = teams.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = t.name.toLowerCase().includes(q);
      const matchCode = t.shortName.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (status && t.status.toLowerCase() !== status.toLowerCase()) {
      return false;
    }
    return true;
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (sortField === 'name') {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    if (sortField === 'shortCode') {
      return sortAsc ? a.shortName.localeCompare(b.shortName) : b.shortName.localeCompare(a.shortName);
    }
    if (sortField === 'players') {
      const diff = a.playerCount - b.playerCount;
      if (diff !== 0) return sortAsc ? diff : -diff;
      return a.name.localeCompare(b.name);
    }
    if (sortField === 'status') {
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    }
    return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
  });

  // Pagination calculations
  const totalTeams = sortedTeams.length;
  const totalPages = Math.max(1, Math.ceil(totalTeams / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalTeams === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTeams);
  const paginatedTeams = sortedTeams.slice(startIndex, endIndex);

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

  const handleOpenRoster = async (team: Team) => {
    try {
      setRosterLoading(true);
      setRosterModalOpen(true);
      setSelectedPlayersToAdd([]);
      const detail = await teamsApi.getById(team.id);
      setSelectedTeamDetail(detail);

      const players = await playersApi.getAll({ status: 'Active' });
      setAllPlayers(players);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleAddPlayerToTeam = async () => {
    if (!selectedTeamDetail || selectedPlayersToAdd.length === 0 || addingToSquad) return;
    try {
      setAddingToSquad(true);
      for (const playerId of selectedPlayersToAdd) {
        await teamsApi.addPlayer(selectedTeamDetail.id, playerId as any);
      }
      const updated = await teamsApi.getById(selectedTeamDetail.id);
      setSelectedTeamDetail(updated);
      setSelectedPlayersToAdd([]);
      fetchTeams();
    } catch (err) {
      alert('Failed to assign player(s) to team.');
    } finally {
      setAddingToSquad(false);
    }
  };

  const handleRemovePlayerFromTeam = async (playerId: number | string) => {
    if (!selectedTeamDetail) return;
    if (!window.confirm('Remove player from this team?')) return;
    try {
      await teamsApi.removePlayer(selectedTeamDetail.id, playerId as any);
      const updated = await teamsApi.getById(selectedTeamDetail.id);
      setSelectedTeamDetail(updated);
      fetchTeams();
    } catch (err) {
      alert('Failed to remove player.');
    }
  };

  const handleOpenCreate = () => {
    setEditingTeam(null);
    setFormData({ name: '', shortName: '', status: 'Active' });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({ name: team.name, shortName: team.shortName, status: team.status });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedShortName = formData.shortName.trim();

    if (!trimmedName || !trimmedShortName) {
      setFormError('Team name and short name are required.');
      return;
    }

    // Immediate client-side uniqueness validation
    if (formData.status === 'Active') {
      const isDuplicate = teams.some(
        (t) =>
          t.status === 'Active' &&
          (!editingTeam || t.id !== editingTeam.id) &&
          t.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (isDuplicate) {
        setFormError('Team name already exists.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError(null);
      if (editingTeam) {
        await teamsApi.update(editingTeam.id, formData);
      } else {
        await teamsApi.create(formData);
      }
      setEditModalOpen(false);
      fetchTeams();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this team? Match history will be preserved.')) {
      return;
    }
    try {
      await teamsApi.delete(id);
      fetchTeams();
    } catch (err) {
      alert('Failed to deactivate team.');
    }
  };

  return (
    <div>
      {/* Header & Add Button */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registered Teams</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage box cricket teams and team rosters</p>
        </div>
        {canManageTeams && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Add Team
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search teams by name or short code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
                  onClick={() => handleSort('name')}
                  title="Team Name - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Team Name
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('shortCode')}
                  title="Short Code - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Short Code
                    {renderSortIndicator('shortCode')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('players')}
                  title="Active Players - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Active Players
                    {renderSortIndicator('players')}
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
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading teams...
                  </td>
                </tr>
              ) : paginatedTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No teams found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedTeams.map((team) => (
                  <tr key={team.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="team-badge" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {team.shortName}
                        </div>
                        {team.name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{team.shortName}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>{team.playerCount}</span> Players
                    </td>
                    <td>
                      <span className={`badge ${team.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {team.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenRoster(team)}
                          title="View Roster"
                        >
                          <Users size={14} /> Roster
                        </button>
                        {canManageTeams && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenEdit(team)}
                              title="Edit Team"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteTeam(team.id)}
                              title="Deactivate Team"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
                {totalTeams === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {endIndex}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalTeams}
              </strong>{' '}
              teams
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

      {/* Team Roster Modal */}
      <Modal
        isOpen={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={selectedTeamDetail ? `${selectedTeamDetail.name} (${selectedTeamDetail.shortName}) - Squad Roster` : 'Team Roster'}
        size="lg"
      >
        {rosterLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading roster...</div>
        ) : !selectedTeamDetail ? (
          <div>Team not found.</div>
        ) : (
          <div>
            {canManageTeams && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <MultiSelectDropdown
                    options={allPlayers
                      .filter((p) => !selectedTeamDetail.players.some((tp) => String(tp.id) === String(p.id)))
                      .map((p) => ({
                        id: p.id,
                        label: p.fullName,
                        badge: p.playerCategory,
                      }))}
                    selectedIds={selectedPlayersToAdd}
                    onChange={setSelectedPlayersToAdd}
                    placeholder="-- Select players to add to squad --"
                    searchPlaceholder="Search player by name or role..."
                    disabled={addingToSquad}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAddPlayerToTeam}
                  disabled={selectedPlayersToAdd.length === 0 || addingToSquad}
                  style={{ whiteSpace: 'nowrap', minWidth: '140px' }}
                >
                  <UserPlus size={16} />{' '}
                  {addingToSquad
                    ? 'Adding...'
                    : selectedPlayersToAdd.length > 0
                    ? `Add (${selectedPlayersToAdd.length}) to Squad`
                    : 'Add to Squad'}
                </button>
              </div>
            )}

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Role</th>
                    <th>Status</th>
                    {canManageTeams && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedTeamDetail.players.length === 0 ? (
                    <tr>
                      <td colSpan={canManageTeams ? 4 : 3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No players currently assigned to this team squad.
                      </td>
                    </tr>
                  ) : (
                    selectedTeamDetail.players.map((player) => (
                      <tr key={player.id}>
                        <td style={{ fontWeight: 600 }}>{player.fullName}</td>
                        <td>
                          <span
                            className={`badge ${
                              player.playerCategory === 'Batsman'
                                ? 'badge-warning'
                                : player.playerCategory === 'Bowler'
                                ? 'badge-info'
                                : 'badge-success'
                            }`}
                          >
                            {player.playerCategory}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success">{player.status}</span>
                        </td>
                        {canManageTeams && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemovePlayerFromTeam(player.id)}
                              title="Remove from squad"
                            >
                              <X size={14} /> Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Team Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingTeam ? `Edit Team: ${editingTeam.name}` : 'Add New Team'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveTeam} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Team'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTeam}>
          {formError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Royal Strikers"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Short Name / Code * (Max 10 chars)</label>
            <input
              type="text"
              className="form-input"
              required
              maxLength={10}
              placeholder="e.g. RS"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
            />
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
        </form>
      </Modal>
    </div>
  );
};
