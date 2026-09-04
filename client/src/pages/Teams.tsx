import React, { useEffect, useState } from 'react';
import { teamsApi, playersApi } from '../api/client';
import { Team, TeamDetail, Player } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Shield,
  Plus,
  Users,
  Edit2,
  Trash2,
  UserPlus,
  X,
  AlertCircle
} from 'lucide-react';

export const Teams: React.FC = () => {
  const { canManageCricket } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Roster Modal
  const [rosterModalOpen, setRosterModalOpen] = useState<boolean>(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<TeamDetail | null>(null);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState<number>(0);

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

  const handleOpenRoster = async (team: Team) => {
    try {
      setRosterLoading(true);
      setRosterModalOpen(true);
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
    if (!selectedTeamDetail || selectedPlayerToAdd <= 0) return;
    try {
      await teamsApi.addPlayer(selectedTeamDetail.id, selectedPlayerToAdd);
      const updated = await teamsApi.getById(selectedTeamDetail.id);
      setSelectedTeamDetail(updated);
      setSelectedPlayerToAdd(0);
      fetchTeams();
    } catch (err) {
      alert('Failed to assign player to team.');
    }
  };

  const handleRemovePlayerFromTeam = async (playerId: number) => {
    if (!selectedTeamDetail) return;
    if (!window.confirm('Remove player from this team?')) return;
    try {
      await teamsApi.removePlayer(selectedTeamDetail.id, playerId);
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
    if (!formData.name.trim() || !formData.shortName.trim()) {
      setFormError('Team name and short name are required.');
      return;
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
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registered Teams</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage box cricket teams and team rosters</p>
        </div>
        {canManageCricket && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Add Team
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Short Code</th>
                <th>Active Players</th>
                <th>Status</th>
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
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No teams found.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
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
                        {canManageCricket && (
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
            {canManageCricket && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <select
                    className="form-select"
                    value={selectedPlayerToAdd}
                    onChange={(e) => setSelectedPlayerToAdd(Number(e.target.value))}
                  >
                    <option value={0}>-- Select player to add to squad --</option>
                    {allPlayers
                      .filter((p) => !selectedTeamDetail.players.some((tp) => tp.id === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.playerCategory})
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAddPlayerToTeam}
                  disabled={selectedPlayerToAdd <= 0}
                >
                  <UserPlus size={16} /> Add to Squad
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
                    {canManageCricket && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedTeamDetail.players.length === 0 ? (
                    <tr>
                      <td colSpan={canManageCricket ? 4 : 3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
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
                        {canManageCricket && (
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
