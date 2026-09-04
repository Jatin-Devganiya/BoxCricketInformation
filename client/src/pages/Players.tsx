import React, { useEffect, useState } from 'react';
import { playersApi, teamsApi } from '../api/client';
import { Player, PlayerStatistics, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Search,
  Plus,
  BarChart2,
  Edit2,
  Trash2,
  Activity,
  AlertCircle,
  Trophy,
  Award
} from 'lucide-react';

export const Players: React.FC = () => {
  const { canManageCricket } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Modals state
  const [statsModalOpen, setStatsModalOpen] = useState<boolean>(false);
  const [selectedStats, setSelectedStats] = useState<PlayerStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [activeStatsTab, setActiveStatsTab] = useState<'batting' | 'bowling' | 'fielding'>('batting');

  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    playerCategory: 'Batsman',
    status: 'Active',
    teamId: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const data = await playersApi.getAll({ search, category, status });
      setPlayers(data);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [search, category, status]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await teamsApi.getAll();
        setTeams(data);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };
    fetchTeams();
  }, []);

  const handleOpenStats = async (player: Player) => {
    try {
      setStatsLoading(true);
      setSelectedStats(null);
      setStatsModalOpen(true);
      const data = await playersApi.getStatistics(player.id);
      setSelectedStats(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlayer(null);
    setFormData({
      firstName: '',
      lastName: '',
      playerCategory: 'Batsman',
      status: 'Active',
      teamId: 0,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (player: Player) => {
    setEditingPlayer(player);
    const assignedTeam = teams.find((t) => t.name === player.currentTeamName);
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      playerCategory: player.playerCategory,
      status: player.status,
      teamId: assignedTeam ? assignedTeam.id : 0,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        playerCategory: formData.playerCategory,
        status: formData.status,
        teamId: formData.teamId > 0 ? formData.teamId : null,
      };

      if (editingPlayer) {
        await playersApi.update(editingPlayer.id, payload);
      } else {
        await playersApi.create(payload);
      }

      setEditModalOpen(false);
      fetchPlayers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save player.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this player? Historical match performance will be preserved.')) {
      return;
    }

    try {
      await playersApi.delete(id);
      fetchPlayers();
    } catch (err) {
      alert('Failed to deactivate player.');
    }
  };

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Search players by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Categories</option>
            <option value="Batsman">Batsman</option>
            <option value="Bowler">Bowler</option>
            <option value="AllRounder">AllRounder</option>
            <option value="WicketKeeper">WicketKeeper</option>
          </select>

          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {canManageCricket && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Add Player
            </button>
          )}
        </div>
      </div>

      {/* Players Table Card */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Category</th>
                <th>Current Team</th>
                <th>Status</th>
                <th>MOM Awards</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading players...
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No players found matching your criteria.
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.fullName}</td>
                    <td>
                      <span
                        className={`badge ${
                          p.playerCategory === 'Batsman'
                            ? 'badge-warning'
                            : p.playerCategory === 'Bowler'
                            ? 'badge-info'
                            : 'badge-success'
                        }`}
                      >
                        {p.playerCategory}
                      </span>
                    </td>
                    <td>
                      {p.currentTeamName ? (
                        <span style={{ fontWeight: 500 }}>{p.currentTeamName}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {(p.manOfTheMatchCount ?? 0) > 0 ? (
                        <span
                          className="badge badge-warning"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            background: 'rgba(245, 158, 11, 0.18)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#fbbf24'
                          }}
                          title={`${p.manOfTheMatchCount} Man of the Match award${p.manOfTheMatchCount === 1 ? '' : 's'}`}
                        >
                          <Trophy size={13} /> {p.manOfTheMatchCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenStats(p)}
                          title="View Aggregate Statistics"
                        >
                          <BarChart2 size={14} /> Stats
                        </button>
                        {canManageCricket && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Player"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeletePlayer(p.id)}
                              title="Deactivate Player"
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

      {/* Add / Edit Player Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingPlayer ? `Edit Player: ${editingPlayer.fullName}` : 'Add New Player'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSavePlayer} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Player'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePlayer}>
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
              <label className="form-label">Player Category</label>
              <select
                className="form-select"
                value={formData.playerCategory}
                onChange={(e) => setFormData({ ...formData, playerCategory: e.target.value })}
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="AllRounder">AllRounder</option>
                <option value="WicketKeeper">WicketKeeper</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Team</label>
              <select
                className="form-select"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: Number(e.target.value) })}
              >
                <option value={0}>None (Unassigned)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>
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

      {/* Player Aggregate Statistics Modal */}
      <Modal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        title={selectedStats ? `${selectedStats.playerName} - Career Statistics` : 'Player Statistics'}
        size="lg"
      >
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem' }}>Loading player statistics...</div>
        ) : !selectedStats ? (
          <div>No statistics found.</div>
        ) : (
          <div>
            {/* Career Overview Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Discipline
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                  {selectedStats.playerCategory}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Career Matches
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {Math.max(selectedStats.batting.matches, selectedStats.bowling.matches)}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Trophy size={14} /> Man of the Match
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    MOM Awards Won
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>
                  {selectedStats.manOfTheMatchCount ?? selectedStats.momCount ?? 0}
                </div>
              </div>
            </div>

            <div className="tabs-nav">
              <button
                className={`tab-btn ${activeStatsTab === 'batting' ? 'active' : ''}`}
                onClick={() => setActiveStatsTab('batting')}
              >
                Batting Metrics
              </button>
              <button
                className={`tab-btn ${activeStatsTab === 'bowling' ? 'active' : ''}`}
                onClick={() => setActiveStatsTab('bowling')}
              >
                Bowling Metrics
              </button>
              <button
                className={`tab-btn ${activeStatsTab === 'fielding' ? 'active' : ''}`}
                onClick={() => setActiveStatsTab('fielding')}
              >
                Fielding Metrics
              </button>
            </div>

            {activeStatsTab === 'batting' ? (
              <div>
                {/* Batting Top Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Matches</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.batting.matches}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Innings</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.batting.innings}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Total Runs</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981' }}>{selectedStats.batting.totalRuns}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Total Balls Played</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#60a5fa' }}>{selectedStats.batting.ballsFaced ?? selectedStats.batting.totalBallsPlayed ?? 0}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Highest</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.batting.highestScore}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Strike Rate</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.batting.runRate}</div>
                  </div>
                </div>

                {/* Granular Batting Metrics */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Scoring Patterns & Boundary Breakdown
                </h3>
                <div className="table-container">
                  <table className="custom-table">
                    <tbody>
                      <tr>
                        <td>Total Balls Played</td>
                        <td style={{ fontWeight: 600, color: '#60a5fa' }}>{selectedStats.batting.ballsFaced ?? selectedStats.batting.totalBallsPlayed ?? 0}</td>
                        <td>Dismissals</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.dismissals}</td>
                      </tr>
                      <tr>
                        <td>Fours (4s)</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.fours}</td>
                        <td>Sixes (6s)</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.sixes}</td>
                      </tr>
                      <tr>
                        <td>Dot Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.dotBalls}</td>
                        <td>Zero Out Count (Ducks)</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.zeroOutCount}</td>
                      </tr>
                      <tr>
                        <td>1-Run Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.ones}</td>
                        <td>2-Run Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.twos}</td>
                      </tr>
                      <tr>
                        <td>3-Run Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.threes}</td>
                        <td>5-Run Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.fives}</td>
                      </tr>
                      <tr>
                        <td>6-in-a-Row Streaks</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.sixInRowCount}</td>
                        <td>4-Boundaries-in-Row</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.fourInRowCount}</td>
                      </tr>
                      <tr>
                        <td>Dismissals</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.dismissals}</td>
                        <td>6-Run Balls Count</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.sixRunBalls}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeStatsTab === 'bowling' ? (
              <div>
                {/* Bowling Top Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Matches</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.bowling.matches}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overs</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>
                      {selectedStats.bowling.oversFormatted}
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Wickets</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>{selectedStats.bowling.wickets}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Economy</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.bowling.economyRate}</div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Best Figures</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedStats.bowling.highestWickets}</div>
                  </div>
                </div>

                {/* Granular Bowling Metrics */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Delivery Details & Extras
                </h3>
                <div className="table-container">
                  <table className="custom-table">
                    <tbody>
                      <tr>
                        <td>Total Balls Bowled</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.bowling.ballsBowled}</td>
                        <td>Runs Conceded</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.bowling.runsConceded}</td>
                      </tr>
                      <tr>
                        <td>Maiden Overs</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.bowling.maidenOvers}</td>
                        <td>Hat Tricks</td>
                        <td style={{ fontWeight: 600, color: '#f59e0b' }}>{selectedStats.bowling.hatTricks}</td>
                      </tr>
                      <tr>
                        <td>Wides</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.bowling.wides}</td>
                        <td>No Balls</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.bowling.noBalls}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                {/* Fielding Top Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Catches</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                      {selectedStats.fielding?.catches ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Stumpings</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>
                      {selectedStats.fielding?.stumpings ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Run Outs</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>
                      {selectedStats.fielding?.runOuts ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Dismissals</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                      {(selectedStats.fielding?.catches ?? 0) + (selectedStats.fielding?.stumpings ?? 0) + (selectedStats.fielding?.runOuts ?? 0)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Fielding statistics are accurately derived and recorded directly from live match ball events and wicket dismissals.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
