import React, { useEffect, useState } from 'react';
import { dashboardApi, authApi } from '../api/client';
import { DashboardStats, ActiveSession, LoginHistory, LoginHistoryFilter } from '../types';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  Calendar,
  Trophy,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  History,
  Laptop,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onViewMatchScorecard?: (matchId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onViewMatchScorecard }) => {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active sessions state (Admin)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [sessionActionMsg, setSessionActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login History state (Admin)
  const [historyItems, setHistoryItems] = useState<LoginHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Filters for History
  const [filterUsername, setFilterUsername] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterIp, setFilterIp] = useState<string>('');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterLogoutFromDate, setFilterLogoutFromDate] = useState<string>('');
  const [filterLogoutToDate, setFilterLogoutToDate] = useState<string>('');

  const fetchStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    if (!isAdmin) return;
    setLoadingSessions(true);
    try {
      const sessions = await authApi.getActiveSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchLoginHistory = async (page = historyPage, pageSize = historyPageSize) => {
    if (!isAdmin) return;
    setLoadingHistory(true);
    try {
      const filter: LoginHistoryFilter = {
        page,
        pageSize,
        username: filterUsername.trim() || undefined,
        userId: filterUserId ? parseInt(filterUserId, 10) : undefined,
        role: filterRole || undefined,
        status: filterStatus || undefined,
        ipAddress: filterIp.trim() || undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        logoutFromDate: filterLogoutFromDate || undefined,
        logoutToDate: filterLogoutToDate || undefined,
      };
      const res = await authApi.getLoginHistory(filter);
      setHistoryItems(res.items);
      setHistoryTotal(res.totalCount);
      setHistoryPage(res.page);
    } catch (err) {
      console.error('Failed to load login history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (isAdmin) {
      fetchActiveSessions();
      fetchLoginHistory(1, historyPageSize);
    }
  }, [isAdmin]);

  const handleForceLogout = async (session: ActiveSession) => {
    const isSelf = user?.id === session.userId;
    const confirmMsg = isSelf
      ? `Are you sure you want to force logout your own active session? You will be logged out immediately.`
      : `Are you sure you want to terminate the active session for ${session.username}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await authApi.forceLogout(session.sessionId);
      setSessionActionMsg({
        type: 'success',
        text: `Active session for ${session.username} has been forcefully terminated.`,
      });
      setTimeout(() => setSessionActionMsg(null), 5000);
      fetchActiveSessions();
      fetchLoginHistory(historyPage, historyPageSize);
    } catch (err: any) {
      setSessionActionMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to terminate session.',
      });
      setTimeout(() => setSessionActionMsg(null), 5000);
    }
  };

  const handleApplyHistoryFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryPage(1);
    fetchLoginHistory(1, historyPageSize);
  };

  const handleResetHistoryFilter = () => {
    setFilterUsername('');
    setFilterUserId('');
    setFilterRole('');
    setFilterStatus('');
    setFilterIp('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterLogoutFromDate('');
    setFilterLogoutToDate('');
    setHistoryPage(1);
    setTimeout(() => {
      authApi.getLoginHistory({ page: 1, pageSize: historyPageSize }).then((res) => {
        setHistoryItems(res.items);
        setHistoryTotal(res.totalCount);
        setHistoryPage(res.page);
      });
    }, 0);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading dashboard overview...</div>;
  }

  if (!stats) {
    return <div>Failed to load dashboard statistics.</div>;
  }

  const totalHistoryPages = Math.ceil(historyTotal / historyPageSize) || 1;

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Players"
          value={stats.totalPlayers}
          icon={Users}
          colorBg="rgba(16, 185, 129, 0.15)"
          colorIcon="#10b981"
        />
        <StatCard
          label="Teams"
          value={stats.totalTeams}
          icon={Shield}
          colorBg="rgba(59, 130, 246, 0.15)"
          colorIcon="#3b82f6"
        />
        <StatCard
          label="Active Series"
          value={stats.totalSeries}
          icon={Calendar}
          colorBg="rgba(139, 92, 246, 0.15)"
          colorIcon="#8b5cf6"
        />
        <StatCard
          label="Total Matches"
          value={stats.totalMatches}
          icon={Trophy}
          colorBg="rgba(245, 158, 11, 0.15)"
          colorIcon="#f59e0b"
        />
        <StatCard
          label="Completed"
          value={stats.completedMatches}
          icon={CheckCircle2}
          colorBg="rgba(34, 197, 94, 0.15)"
          colorIcon="#22c55e"
        />
        <StatCard
          label="Today's Matches"
          value={stats.todayMatches}
          icon={Clock}
          colorBg="rgba(236, 72, 153, 0.15)"
          colorIcon="#ec4899"
        />
      </div>

      {/* ========================================================= */}
      {/* ADMIN SESSION MANAGEMENT: ONLINE USERS & FORCE LOGOUT    */}
      {/* ========================================================= */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Active User Sessions (Online)</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Real-time active login sessions. Administrators can force-terminate any session.
                </p>
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchActiveSessions}
              disabled={loadingSessions}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={14} className={loadingSessions ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {sessionActionMsg && (
            <div
              className={`alert ${sessionActionMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}
              style={{ marginBottom: '1rem' }}
            >
              {sessionActionMsg.text}
            </div>
          )}

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>User ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Host / Client Device</th>
                  <th>Login Time</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No other active sessions detected.
                    </td>
                  </tr>
                ) : (
                  activeSessions.map((s) => (
                    <tr key={s.sessionId}>
                      <td style={{ fontWeight: 600 }}>#{s.userId}</td>
                      <td style={{ fontWeight: 600 }}>
                        {s.username}{' '}
                        {user?.id === s.userId && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginLeft: '4px' }}>
                            (You)
                          </span>
                        )}
                      </td>
                      <td>
                        {s.roles.map((r) => (
                          <span
                            key={r}
                            className={`badge ${
                              r === 'Admin' ? 'badge-danger' : r === 'Umpire' ? 'badge-warning' : 'badge-info'
                            }`}
                            style={{ marginRight: '4px' }}
                          >
                            {r}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                          Online
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{s.ipAddress || 'Unknown'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.hostName || 'Standard Browser'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(s.loginTime).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleForceLogout(s)}
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                          title={`Force Logout ${s.username}`}
                        >
                          <LogOut size={13} style={{ marginRight: '4px' }} />
                          Logout
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Top Run Scorers */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Award size={18} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Top Run Scorers</h2>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('players')}>
              View All
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'center' }}>Runs</th>
                  <th style={{ textAlign: 'right' }}>Strike Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.topRunScorers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                      No batting stats recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.topRunScorers.map((player, idx) => (
                    <tr key={player.playerId}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ color: idx === 0 ? '#f59e0b' : 'var(--text-muted)', marginRight: '0.4rem' }}>
                          #{idx + 1}
                        </span>
                        {player.playerName}
                      </td>
                      <td>
                        <span className="badge badge-info">{player.teamName}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                        {player.totalRuns}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                        {player.strikeRate.toFixed(1)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Wicket Takers */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Zap size={18} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Top Wicket Takers</h2>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('players')}>
              View All
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bowler</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'center' }}>Wickets</th>
                  <th style={{ textAlign: 'right' }}>Economy</th>
                </tr>
              </thead>
              <tbody>
                {stats.topWicketTakers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                      No bowling stats recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.topWicketTakers.map((bowler, idx) => (
                    <tr key={bowler.playerId}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ color: idx === 0 ? '#3b82f6' : 'var(--text-muted)', marginRight: '0.4rem' }}>
                          #{idx + 1}
                        </span>
                        {bowler.playerName}
                      </td>
                      <td>
                        <span className="badge badge-info">{bowler.teamName}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#3b82f6' }}>
                        {bowler.totalWickets}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                        {bowler.economyRate.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Matches Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Trophy size={18} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Matches</h2>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('matches')}>
            View All Matches
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tournament / Series</th>
                <th>Teams</th>
                <th>Scheduled Date & Time</th>
                <th>Status</th>
                <th>Result</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No recent matches found.
                  </td>
                </tr>
              ) : (
                stats.recentMatches.map((match) => (
                  <tr key={match.id}>
                    <td style={{ fontWeight: 500 }}>{match.seriesName}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{match.team1Name}</span>{' '}
                      <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700 }}>VS</span>{' '}
                      <span style={{ fontWeight: 600 }}>{match.team2Name}</span>
                    </td>
                    <td>
                      {new Date(match.scheduledDate).toLocaleDateString()} at {match.scheduledTime}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          match.status === 'Completed'
                            ? 'badge-success'
                            : match.status === 'InProgress'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td style={{ color: match.result ? '#10b981' : 'var(--text-muted)' }}>
                      {match.result || 'Pending'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onViewMatchScorecard && onViewMatchScorecard(match.id)}
                      >
                        Scorecard
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADMIN LOGIN / LOGOUT AUDIT HISTORY                       */}
      {/* ========================================================= */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <History size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Login / Logout Audit History</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Complete historical record of user login and logout activities with IP, device, and forced logout audit.
                </p>
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => fetchLoginHistory(historyPage, historyPageSize)}
              disabled={loadingHistory}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
              <span>Refresh History</span>
            </button>
          </div>

          {/* Filter Bar */}
          <form
            onSubmit={handleApplyHistoryFilter}
            style={{
              background: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. umpire1"
                  value={filterUsername}
                  onChange={(e) => setFilterUsername(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>User ID</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 2"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Role</label>
                <select
                  className="form-input"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Umpire">Umpire</option>
                  <option value="User">User</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                <select
                  className="form-input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active (Online)</option>
                  <option value="Logout">Logout</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>IP Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 192.168"
                  value={filterIp}
                  onChange={(e) => setFilterIp(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Login Date (From)</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Login Date (To)</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Logout Date (From)</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterLogoutFromDate}
                  onChange={(e) => setFilterLogoutFromDate(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Logout Date (To)</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterLogoutToDate}
                  onChange={(e) => setFilterLogoutToDate(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1, padding: '0.45rem' }}
                >
                  <Filter size={13} style={{ marginRight: '4px' }} />
                  Filter
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleResetHistoryFilter}
                  style={{ padding: '0.45rem 0.75rem' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </form>

          {/* History Table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>User ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Host Name / Client Device</th>
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Logout Reason / Audit</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading login history...
                    </td>
                  </tr>
                ) : historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No login records match the specified filters.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>#{h.userId}</td>
                      <td style={{ fontWeight: 600 }}>{h.username}</td>
                      <td>
                        {h.roles.map((r) => (
                          <span
                            key={r}
                            className={`badge ${
                              r === 'Admin' ? 'badge-danger' : r === 'Umpire' ? 'badge-warning' : 'badge-info'
                            }`}
                            style={{ marginRight: '3px' }}
                          >
                            {r}
                          </span>
                        ))}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.hostName || 'Standard Client'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(h.loginTime).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {h.logoutTime ? new Date(h.logoutTime).toLocaleString() : '—'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            h.status === 'Active'
                              ? 'badge-success'
                              : h.status === 'Logout'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {h.status === 'Active' ? 'Login' : h.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{h.ipAddress || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {h.logoutReason === 'AdminForceLogout' ? (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>
                            Forced by Admin {h.logoutByUsername ? `(${h.logoutByUsername})` : ''}
                          </span>
                        ) : h.logoutReason === 'AccountDeactivated' ? (
                          <span style={{ color: '#f59e0b', fontWeight: 500 }}>
                            Account Deactivated
                          </span>
                        ) : h.logoutReason === 'SessionExpired' ? (
                          <span style={{ color: 'var(--text-muted)' }}>
                            Expired
                          </span>
                        ) : h.logoutReason === 'UserLogout' ? (
                          <span style={{ color: 'var(--text-muted)' }}>
                            Normal Logout
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              Showing {historyItems.length > 0 ? (historyPage - 1) * historyPageSize + 1 : 0} to{' '}
              {Math.min(historyPage * historyPageSize, historyTotal)} of {historyTotal} records
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Page Size:</span>
                <select
                  className="form-input"
                  value={historyPageSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    setHistoryPageSize(newSize);
                    setHistoryPage(1);
                    fetchLoginHistory(1, newSize);
                  }}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={historyPage <= 1}
                  onClick={() => fetchLoginHistory(historyPage - 1, historyPageSize)}
                  title="Previous Page"
                  style={{ padding: '0.3rem 0.5rem' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ padding: '0 0.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {historyPage} / {totalHistoryPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => fetchLoginHistory(historyPage + 1, historyPageSize)}
                  title="Next Page"
                  style={{ padding: '0.3rem 0.5rem' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
