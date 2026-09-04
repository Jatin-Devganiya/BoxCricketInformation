import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import { DashboardStats } from '../types';
import { StatCard } from '../components/StatCard';
import {
  Users,
  Shield,
  Calendar,
  Trophy,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onViewMatchScorecard?: (matchId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onViewMatchScorecard }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading dashboard overview...</div>;
  }

  if (!stats) {
    return <div>Failed to load dashboard statistics.</div>;
  }

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
                      <td style={{ textAlign: 'right' }}>{player.strikeRate}</td>
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
                      <td style={{ textAlign: 'right' }}>{bowler.economyRate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Trophy size={18} />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent & Upcoming Matches</h2>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('matches')}>
            View All Matches <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Series</th>
                <th>Teams</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Result</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No matches found.
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
    </div>
  );
};
