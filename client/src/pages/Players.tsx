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
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';

// Custom SVG Cricket Bat Icon for Batting Rank column
const BattingIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 18, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    {/* Cricket Bat Grip & Blade */}
    <path d="M19.5 3.5l1 1-5.5 5.5-1-1 5.5-5.5z" />
    <path d="M14 9l-9 9a1.5 1.5 0 0 0 0 2.12l.38.38a1.5 1.5 0 0 0 2.12 0l9-9-2.5-2.5z" />
    <line x1="18.5" y1="4.5" x2="17.5" y2="5.5" />
  </svg>
);

// Custom SVG Cricket Ball Icon for Bowling Rank column
const BowlingIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 18, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    {/* Cricket Ball with Seam */}
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18" strokeDasharray="2 2" />
    <path d="M7 6a9 9 0 0 1 10 12" strokeDasharray="2 2" />
  </svg>
);

export const Players: React.FC = () => {
  const { canManagePlayers, user, isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Sorting
  type SortField = 'batting' | 'bowling' | 'name' | 'category' | 'team' | 'status' | 'mom';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination (Default 100)
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, status, sortField, sortAsc]);

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
    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setFormError('First name and last name are required.');
      return;
    }

    // Immediate client-side uniqueness validation
    if (formData.status === 'Active') {
      const isDuplicate = players.some(
        (p) =>
          p.status === 'Active' &&
          (!editingPlayer || p.id !== editingPlayer.id) &&
          p.firstName.trim().toLowerCase() === trimmedFirstName.toLowerCase() &&
          p.lastName.trim().toLowerCase() === trimmedLastName.toLowerCase()
      );

      if (isDuplicate) {
        setFormError('Player with the same first name and last name already exists.');
        return;
      }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For MOM awards, highest count first is expected on first click
      // For batting/bowling rank, ascending (#1 first) is default
      // For text columns, ascending (A-Z) is default
      setSortAsc(field === 'mom' ? false : true);
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

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortField === 'batting') {
      const aRank = a.battingRank ?? 999999;
      const bRank = b.battingRank ?? 999999;
      if (aRank !== bRank) {
        return sortAsc ? aRank - bRank : bRank - aRank;
      }
      return sortAsc ? (b.totalRuns || 0) - (a.totalRuns || 0) : (a.totalRuns || 0) - (b.totalRuns || 0);
    }
    if (sortField === 'bowling') {
      const aRank = a.bowlingRank ?? 999999;
      const bRank = b.bowlingRank ?? 999999;
      if (aRank !== bRank) {
        return sortAsc ? aRank - bRank : bRank - aRank;
      }
      return sortAsc ? (b.totalWickets || 0) - (a.totalWickets || 0) : (a.totalWickets || 0) - (b.totalWickets || 0);
    }
    if (sortField === 'category') {
      const cmp = (a.playerCategory || '').localeCompare(b.playerCategory || '');
      return sortAsc ? cmp : -cmp;
    }
    if (sortField === 'team') {
      const aTeam = a.currentTeamName || '';
      const bTeam = b.currentTeamName || '';
      if (!aTeam && bTeam) return 1;
      if (aTeam && !bTeam) return -1;
      const cmp = aTeam.localeCompare(bTeam);
      return sortAsc ? cmp : -cmp;
    }
    if (sortField === 'status') {
      const cmp = (a.status || '').localeCompare(b.status || '');
      return sortAsc ? cmp : -cmp;
    }
    if (sortField === 'mom') {
      const aMom = a.manOfTheMatchCount ?? 0;
      const bMom = b.manOfTheMatchCount ?? 0;
      if (aMom !== bMom) {
        return sortAsc ? aMom - bMom : bMom - aMom;
      }
      return a.fullName.localeCompare(b.fullName);
    }
    return sortAsc
      ? a.fullName.localeCompare(b.fullName)
      : b.fullName.localeCompare(a.fullName);
  });

  // Pagination calculations
  const totalPlayers = sortedPlayers.length;
  const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalPlayers === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalPlayers);
  const paginatedPlayers = sortedPlayers.slice(startIndex, endIndex);

  // Generate page numbers array with intelligent ellipsis
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

          {canManagePlayers && (
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
                <th
                  style={{ width: '64px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('batting')}
                  title="Batting Rank (Total Runs) - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span
                      style={{
                        color: sortField === 'batting' ? '#10b981' : 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <BattingIcon size={19} />
                    </span>
                    {sortField === 'batting' ? (
                      sortAsc ? <ArrowUp size={12} color="#10b981" /> : <ArrowDown size={12} color="#10b981" />
                    ) : (
                      <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '64px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('bowling')}
                  title="Bowling Rank (Total Wickets) - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span
                      style={{
                        color: sortField === 'bowling' ? '#3b82f6' : 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <BowlingIcon size={19} />
                    </span>
                    {sortField === 'bowling' ? (
                      sortAsc ? <ArrowUp size={12} color="#3b82f6" /> : <ArrowDown size={12} color="#3b82f6" />
                    ) : (
                      <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('name')}
                  title="Player Name - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Player Name
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('category')}
                  title="Category - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Category
                    {renderSortIndicator('category')}
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('team')}
                  title="Current Team - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Current Team
                    {renderSortIndicator('team')}
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
                  onClick={() => handleSort('mom')}
                  title="Man of the Match Awards - Click to sort"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    MOM Awards
                    {renderSortIndicator('mom')}
                  </div>
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading players...
                  </td>
                </tr>
              ) : paginatedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No players found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedPlayers.map((p) => {
                  const isPlayerOwner = isAdmin || !p.createdByUserId || Boolean(user?.id && String(p.createdByUserId) === String(user.id));
                  return (
                  <tr key={p.id}>
                    {/* Batting Rank Column */}
                    <td style={{ textAlign: 'center', padding: '0.65rem 0.35rem' }}>
                      {p.battingRank ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            lineHeight: 1.15,
                          }}
                          title={`Batting Rank #${p.battingRank} • ${p.totalRuns || 0} Total Runs`}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color:
                                p.battingRank === 1
                                  ? '#fbbf24'
                                  : p.battingRank === 2
                                  ? 'var(--rank-silver, #94a3b8)'
                                  : p.battingRank === 3
                                  ? '#f97316'
                                  : 'var(--text-primary)',
                            }}
                          >
                            #{p.battingRank}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                            {p.totalRuns || 0} r
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} title="No runs recorded yet">-</span>
                      )}
                    </td>

                    {/* Bowling Rank Column */}
                    <td style={{ textAlign: 'center', padding: '0.65rem 0.35rem' }}>
                      {p.bowlingRank ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            lineHeight: 1.15,
                          }}
                          title={`Bowling Rank #${p.bowlingRank} • ${p.totalWickets || 0} Total Wickets`}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color:
                                p.bowlingRank === 1
                                  ? '#fbbf24'
                                  : p.bowlingRank === 2
                                  ? 'var(--rank-silver, #94a3b8)'
                                  : p.bowlingRank === 3
                                  ? '#f97316'
                                  : 'var(--text-primary)',
                            }}
                          >
                            #{p.bowlingRank}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600 }}>
                            {p.totalWickets || 0} w
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} title="No wickets recorded yet">-</span>
                      )}
                    </td>

                    <td style={{ fontWeight: 600 }}>
                      <div>{p.fullName}</div>
                      {p.createdByUsername && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <span style={{
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isPlayerOwner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: isPlayerOwner ? '#10b981' : 'var(--text-secondary)',
                            fontWeight: 500
                          }}>
                            By: {p.createdByUsername}{isPlayerOwner && !isAdmin ? ' (You)' : ''}
                          </span>
                        </div>
                      )}
                    </td>
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
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenStats(p)}
                          title="View Aggregate Statistics"
                        >
                          <BarChart2 size={14} /> Stats
                        </button>
                        {canManagePlayers && (
                          isPlayerOwner ? (
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
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                alignSelf: 'center',
                                fontStyle: 'italic',
                                padding: '0 0.25rem'
                              }}
                              title={`Created by ${p.createdByUsername || 'another umpire'}`}
                            >
                              View-Only
                            </span>
                          )
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
                {totalPlayers === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {endIndex}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {totalPlayers}
              </strong>{' '}
              players
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
                        <td>6-6-6 in row</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.sixInRowCount}</td>
                        <td>4-Boundaries-in-Row</td>
                        <td style={{ fontWeight: 600 }}>{selectedStats.batting.fourInRowCount}</td>
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
