import React, { useEffect, useState } from 'react';
import { matchesApi, seriesApi, teamsApi, liveScoringApi } from '../api/client';
import { Match, Series, Team, Player, LiveScore, LiveInnings } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  Trophy,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Edit2,
  FileText,
  AlertCircle,
  Save,
  CheckCircle,
  UserCheck,
  ArrowUpDown,
  Layers,
  RotateCw,
  RefreshCw,
  UserPlus,
  PlayCircle,
  ArrowLeftRight,
  Award,
  ChevronRight,
  Shield,
  Activity,
  BarChart2,
  Trash2,
  Lock
} from 'lucide-react';

interface MatchesProps {
  initialScorecardMatchId?: number | null;
  onClearInitialMatchId?: () => void;
}

export const Matches: React.FC<MatchesProps> = ({
  initialScorecardMatchId,
  onClearInitialMatchId,
}) => {
  const { canManageCricket } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSeriesId, setSelectedSeriesId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Schedule Match Modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchFormData, setMatchFormData] = useState({
    seriesId: 0,
    team1Id: 0,
    team2Id: 0,
    matchOrder: 1,
    requiredOvers: 6,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '18:00',
    address: 'Surat Box Cricket Arena, Pitch 1',
    status: 'Scheduled',
  });
  const [matchFormError, setMatchFormError] = useState<string | null>(null);
  const [matchSubmitting, setMatchSubmitting] = useState<boolean>(false);

  // Scorecard / Live Scoring State
  const [scorecardModalOpen, setScorecardModalOpen] = useState<boolean>(false);
  const [activeLiveScore, setActiveLiveScore] = useState<LiveScore | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  // Tabs inside Scorecard Modal: 'live' (Live Scoring), 'scorecard' (Auto Scorecard Table), 'outcome' (Match Outcome)
  const [modalTab, setModalTab] = useState<'live' | 'scorecard' | 'outcome'>('live');
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2>(1);

  // Rosters
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);

  // Setup Innings Wizard Form State
  const [setupInningsNumber, setSetupInningsNumber] = useState<1 | 2>(1);
  const [setupBattingTeamId, setSetupBattingTeamId] = useState<number>(0);
  const [setupStrikerId, setSetupStrikerId] = useState<number>(0);
  const [setupNonStrikerId, setSetupNonStrikerId] = useState<number>(0);
  const [setupBowlerId, setSetupBowlerId] = useState<number>(0);

  // Wicket Dialog State
  const [wicketModalOpen, setWicketModalOpen] = useState<boolean>(false);
  const [wicketDismissedPlayerId, setWicketDismissedPlayerId] = useState<number>(0);
  const [wicketType, setWicketType] = useState<string>('Bowled');
  const [wicketFielderPlayerId, setWicketFielderPlayerId] = useState<number>(0);
  const [wicketRunsScored, setWicketRunsScored] = useState<number>(0);

  // Select New Batsman State
  const [newBatsmanModalOpen, setNewBatsmanModalOpen] = useState<boolean>(false);
  const [newBatsmanId, setNewBatsmanId] = useState<number>(0);

  // Next Bowler State
  const [nextBowlerModalOpen, setNextBowlerModalOpen] = useState<boolean>(false);
  const [nextBowlerId, setNextBowlerId] = useState<number>(0);

  // Extra Delivery Sub-selector: 'NoBall' | 'Wide' | 'LegBye' | null
  const [extraSubMenu, setExtraSubMenu] = useState<'NoBall' | 'Wide' | 'LegBye' | null>(null);

  // Match outcome state
  const [outcomeWinningTeamId, setOutcomeWinningTeamId] = useState<number>(0);
  const [outcomeResultText, setOutcomeResultText] = useState<string>('');
  const [outcomeMomPlayerId, setOutcomeMomPlayerId] = useState<number>(0);
  const [momDetailsModalOpen, setMomDetailsModalOpen] = useState<boolean>(false);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await matchesApi.getAll({
        seriesId: selectedSeriesId > 0 ? selectedSeriesId : undefined,
        status: statusFilter || undefined,
        sortOrder,
      });
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedSeriesId, statusFilter, sortOrder]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [seriesData, teamsData] = await Promise.all([
          seriesApi.getAll(),
          teamsApi.getAll(),
        ]);
        setSeriesList(seriesData);
        setTeams(teamsData);
      } catch (err) {
        console.error('Failed to fetch dropdowns:', err);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (initialScorecardMatchId) {
      handleOpenScorecard(initialScorecardMatchId);
      if (onClearInitialMatchId) onClearInitialMatchId();
    }
  }, [initialScorecardMatchId]);

  const handleOpenScorecard = async (matchId: number) => {
    try {
      setScorecardLoading(true);
      setScorecardModalOpen(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      setWicketModalOpen(false);
      setNewBatsmanModalOpen(false);
      setNextBowlerModalOpen(false);

      const live = await liveScoringApi.getLiveScore(matchId);
      setActiveLiveScore(live);

      // Load rosters for both teams
      if (live.match.team1Id && live.match.team2Id) {
        const [t1Detail, t2Detail] = await Promise.all([
          teamsApi.getById(live.match.team1Id),
          teamsApi.getById(live.match.team2Id),
        ]);
        setTeam1Players(t1Detail.players || []);
        setTeam2Players(t2Detail.players || []);
      }

      setActiveInningsTab(live.activeInningsNumber as 1 | 2);

      // Outcome form fields
      const autoWinner = live.calculatedResult?.winningTeamId ?? live.match.winningTeamId ?? 0;
      const autoResult = live.calculatedResult?.resultDescription || live.match.result || '';
      setOutcomeWinningTeamId(autoWinner);
      setOutcomeResultText(autoResult);
      setOutcomeMomPlayerId(live.match.momPlayerId || 0);

      // Pre-populate setup if active innings is not started yet
      const curr = live.activeInningsNumber === 1 ? live.innings1 : live.innings2;
      if (!curr || curr.status === 'Scheduled') {
        const defaultBatTeam = live.activeInningsNumber === 1 ? live.match.team1Id : live.match.team2Id;
        setSetupInningsNumber(live.activeInningsNumber as 1 | 2);
        setSetupBattingTeamId(defaultBatTeam);
        setSetupStrikerId(0);
        setSetupNonStrikerId(0);
        setSetupBowlerId(0);
      }

      if (curr && curr.requiresNewBatsman) {
        setNewBatsmanModalOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch live scorecard:', err);
      setScorecardError(err.response?.data?.message || 'Failed to load live scorecard.');
    } finally {
      setScorecardLoading(false);
    }
  };

  const handleOpenCreateMatch = () => {
    setEditingMatch(null);
    const defaultSeries = seriesList[0]?.id || 0;
    const defaultT1 = teams[0]?.id || 0;
    const defaultT2 = teams[1]?.id || 0;
    setMatchFormData({
      seriesId: defaultSeries,
      team1Id: defaultT1,
      team2Id: defaultT2,
      matchOrder: matches.length + 1,
      requiredOvers: 6,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '18:00',
      address: 'Surat Box Cricket Arena, Pitch 1',
      status: 'Scheduled',
    });
    setMatchFormError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEditMatch = (m: Match) => {
    setEditingMatch(m);
    setMatchFormData({
      seriesId: m.seriesId,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      matchOrder: m.matchOrder || 1,
      requiredOvers: m.requiredOvers || 6,
      scheduledDate: new Date(m.scheduledDate).toISOString().split('T')[0],
      scheduledTime: m.scheduledTime,
      address: m.address,
      status: m.status,
    });
    setMatchFormError(null);
    setCreateModalOpen(true);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matchFormData.team1Id === matchFormData.team2Id) {
      setMatchFormError('Team 1 and Team 2 must be different.');
      return;
    }
    if (!matchFormData.seriesId) {
      setMatchFormError('Please select a series.');
      return;
    }

    try {
      setMatchSubmitting(true);
      setMatchFormError(null);
      if (editingMatch) {
        await matchesApi.update(editingMatch.id, matchFormData);
      } else {
        await matchesApi.create(matchFormData);
      }
      setCreateModalOpen(false);
      fetchMatches();
    } catch (err: any) {
      setMatchFormError(err.response?.data?.message || 'Failed to save match.');
    } finally {
      setMatchSubmitting(false);
    }
  };

  // Scorecard Helper functions for Innings Rows
  // ==========================================
  // LIVE SCORING HANDLERS
  // ==========================================

  const currentInnings: LiveInnings | undefined =
    activeInningsTab === 1 ? activeLiveScore?.innings1 : activeLiveScore?.innings2;

  const isCurrentInningsStarted = currentInnings && currentInnings.status === 'InProgress';
  const isCurrentInningsCompleted = currentInnings && currentInnings.status === 'Completed';

  const battingPlayers =
    currentInnings?.battingTeamId === activeLiveScore?.match.team1Id ? team1Players : team2Players;

  const bowlingPlayers =
    currentInnings?.battingTeamId === activeLiveScore?.match.team1Id ? team2Players : team1Players;

  const setupBattingPlayers = setupBattingTeamId === activeLiveScore?.match.team1Id ? team1Players : team2Players;
  const setupBowlingPlayers = setupBattingTeamId === activeLiveScore?.match.team1Id ? team2Players : team1Players;

  const handleStartInnings = async () => {
    if (!activeLiveScore || actionLoading) return;
    if (setupStrikerId === 0 || setupNonStrikerId === 0 || setupBowlerId === 0) {
      setScorecardError('Please select Striker, Non-Striker, and Opening Bowler.');
      return;
    }
    if (setupStrikerId === setupNonStrikerId) {
      setScorecardError('Striker and Non-Striker must be different batsmen.');
      return;
    }
    try {
      setActionLoading(true);
      setScorecardError(null);
      const updated = await liveScoringApi.startInnings(activeLiveScore.match.id, {
        inningsNumber: setupInningsNumber,
        battingTeamId: setupBattingTeamId,
        strikerPlayerId: setupStrikerId,
        nonStrikerPlayerId: setupNonStrikerId,
        bowlerPlayerId: setupBowlerId,
      });
      setActiveLiveScore(updated);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to start innings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordNormalBall = async (runs: number) => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      const updated = await liveScoringApi.recordBall(activeLiveScore.match.id, currentInnings.id, {
        eventType: 'Normal',
        runs,
        batRuns: runs,
        extraRuns: 0,
        bowlerPlayerId: currentInnings.currentBowler?.playerId,
        strikerPlayerId: currentInnings.striker?.playerId,
        nonStrikerPlayerId: currentInnings.nonStriker?.playerId,
        overNumber: currentInnings.currentOverNumber,
      });
      setActiveLiveScore(updated);
      fetchMatches();

      const activeInn = updated.activeInningsNumber === 1 ? updated.innings1 : updated.innings2;
      if (activeInn?.requiresNewBatsman) {
        setNewBatsmanModalOpen(true);
      }
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordNoBall = async (batRuns: number) => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      const updated = await liveScoringApi.recordBall(activeLiveScore.match.id, currentInnings.id, {
        eventType: 'NoBall',
        runs: 1 + batRuns,
        batRuns,
        extraRuns: 1,
        extraType: 'NoBall',
        bowlerPlayerId: currentInnings.currentBowler?.playerId,
        strikerPlayerId: currentInnings.striker?.playerId,
        nonStrikerPlayerId: currentInnings.nonStriker?.playerId,
        overNumber: currentInnings.currentOverNumber,
      });
      setActiveLiveScore(updated);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record No Ball.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordWide = async (runs: number = 1) => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      const updated = await liveScoringApi.recordBall(activeLiveScore.match.id, currentInnings.id, {
        eventType: 'Wide',
        runs,
        extraRuns: runs,
        extraType: 'Wide',
        bowlerPlayerId: currentInnings.currentBowler?.playerId,
        strikerPlayerId: currentInnings.striker?.playerId,
        nonStrikerPlayerId: currentInnings.nonStriker?.playerId,
        overNumber: currentInnings.currentOverNumber,
      });
      setActiveLiveScore(updated);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record Wide.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordLegBye = async (runs: number) => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      const updated = await liveScoringApi.recordBall(activeLiveScore.match.id, currentInnings.id, {
        eventType: 'LegBye',
        runs,
        extraRuns: runs,
        extraType: 'LegBye',
        bowlerPlayerId: currentInnings.currentBowler?.playerId,
        strikerPlayerId: currentInnings.striker?.playerId,
        nonStrikerPlayerId: currentInnings.nonStriker?.playerId,
        overNumber: currentInnings.currentOverNumber,
      });
      setActiveLiveScore(updated);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record Leg Bye.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordDeadBall = async () => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      setExtraSubMenu(null);
      const updated = await liveScoringApi.recordBall(activeLiveScore.match.id, currentInnings.id, {
        eventType: 'DeadBall',
        runs: 0,
        batRuns: 0,
        extraRuns: 0,
        bowlerPlayerId: currentInnings.currentBowler?.playerId,
        strikerPlayerId: currentInnings.striker?.playerId,
        nonStrikerPlayerId: currentInnings.nonStriker?.playerId,
        overNumber: currentInnings.currentOverNumber,
      });
      setActiveLiveScore(updated);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record Dead Ball.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenWicketDialog = () => {
    if (!currentInnings) return;
    setWicketDismissedPlayerId(currentInnings.striker?.playerId || 0);
    setWicketType('Bowled');
    setWicketFielderPlayerId(0);
    setWicketRunsScored(0);
    setScorecardError(null);
    setWicketModalOpen(true);
  };

  const handleConfirmWicket = async () => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    if (wicketDismissedPlayerId === 0) {
      setScorecardError('Please choose the dismissed batsman.');
      return;
    }
    if ((wicketType === 'Caught' || wicketType === 'Stumped' || wicketType === 'RunOut') && wicketFielderPlayerId === 0) {
      setScorecardError(`Please select the fielder who made the ${wicketType === 'Caught' ? 'catch' : wicketType === 'Stumped' ? 'stumping' : 'run out'}.`);
      return;
    }

    try {
      setActionLoading(true);
      setScorecardError(null);
      const updated = await liveScoringApi.recordWicket(activeLiveScore.match.id, currentInnings.id, {
        dismissedPlayerId: wicketDismissedPlayerId,
        wicketType,
        fielderPlayerId: wicketFielderPlayerId > 0 ? wicketFielderPlayerId : undefined,
        runsScored: wicketRunsScored,
      });
      setActiveLiveScore(updated);
      setWicketModalOpen(false);
      fetchMatches();

      const activeInn = updated.activeInningsNumber === 1 ? updated.innings1 : updated.innings2;
      if (activeInn?.requiresNewBatsman) {
        setNewBatsmanId(0);
        setNewBatsmanModalOpen(true);
      }
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to record wicket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectNewBatsman = async () => {
    if (!activeLiveScore || !currentInnings || actionLoading || newBatsmanId === 0) {
      setScorecardError('Please select a new batsman.');
      return;
    }
    try {
      setActionLoading(true);
      setScorecardError(null);
      const updated = await liveScoringApi.selectNewBatsman(activeLiveScore.match.id, currentInnings.id, newBatsmanId);
      setActiveLiveScore(updated);
      setNewBatsmanModalOpen(false);
      setNewBatsmanId(0);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to select new batsman.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextOver = async () => {
    if (!activeLiveScore || !currentInnings || actionLoading || nextBowlerId === 0) {
      setScorecardError('Please select the next bowler.');
      return;
    }
    try {
      setActionLoading(true);
      setScorecardError(null);
      const updated = await liveScoringApi.nextOver(activeLiveScore.match.id, currentInnings.id, nextBowlerId);
      setActiveLiveScore(updated);
      setNextBowlerModalOpen(false);
      setNextBowlerId(0);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to advance to next over.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteInnings = async () => {
    if (!activeLiveScore || !currentInnings || actionLoading) return;
    if (!window.confirm('Are you sure you want to end this innings?')) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      const updated = await liveScoringApi.completeInnings(activeLiveScore.match.id, currentInnings.id);
      setActiveLiveScore(updated);
      fetchMatches();

      // If 1st innings ended, switch to 2nd innings and prepare setup wizard
      if (activeInningsTab === 1) {
        setActiveInningsTab(2);
        setSetupInningsNumber(2);
        const secondBattingTeam =
          updated.match.team1Id === currentInnings.battingTeamId ? updated.match.team2Id : updated.match.team1Id;
        setSetupBattingTeamId(secondBattingTeam);
        setSetupStrikerId(0);
        setSetupNonStrikerId(0);
        setSetupBowlerId(0);
      }
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to complete innings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOutcome = async () => {
    if (!activeLiveScore || actionLoading) return;
    try {
      setActionLoading(true);
      setScorecardError(null);
      const calculatedWinnerId = activeLiveScore.calculatedResult?.winningTeamId ?? (outcomeWinningTeamId > 0 ? outcomeWinningTeamId : undefined);
      const calculatedResultText = activeLiveScore.calculatedResult?.resultDescription || outcomeResultText;
      const updated = await liveScoringApi.completeMatch(activeLiveScore.match.id, {
        winningTeamId: calculatedWinnerId && calculatedWinnerId > 0 ? calculatedWinnerId : undefined,
        result: calculatedResultText,
      });
      setActiveLiveScore(updated);
      fetchMatches();
      alert(`Match outcome finalized successfully!\nResult: ${updated.match.result || calculatedResultText}`);
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to save match outcome.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm('Are you sure you want to delete this scheduled match? This will soft-delete the match.')) {
      return;
    }
    try {
      await matchesApi.delete(matchId);
      await fetchMatches();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete match.');
    }
  };

  // Sort matches ascending or descending
  const sortedMatches = [...matches].sort((a, b) => {
    if (sortOrder === 'asc') {
      return (
        (a.matchOrder || 0) - (b.matchOrder || 0) ||
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
    } else {
      return (
        (b.matchOrder || 0) - (a.matchOrder || 0) ||
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );
    }
  });

  const selectedSeries = seriesList.find((s) => s.id === selectedSeriesId);

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Box Cricket Matches</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Schedule matches, record player-level performance, and view scorecards
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="InProgress">InProgress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {canManageCricket && (
            <button className="btn btn-primary" onClick={handleOpenCreateMatch}>
              <Plus size={16} /> Schedule Match
            </button>
          )}
        </div>
      </div>

      {/* Series Selection Dropdown Bar */}
      <div className="series-selection-bar" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="series-selection-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Layers size={18} style={{ color: 'var(--accent-cricket)' }} />
              <span>Select Series / Tournament:</span>
            </div>

            <select
              className="form-select"
              value={selectedSeriesId}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedSeriesId(val);
                setSortOrder('asc'); // Sort matches in ascending order when selecting a series
              }}
              style={{ minWidth: '260px', fontWeight: 500 }}
            >
              <option value={0}>All</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.totalMatches ? `(${s.totalMatches} Matches)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title="Toggle Match Order"
            >
              <ArrowUpDown size={14} />
              {sortOrder === 'asc'
                ? 'Order: Ascending (Match #1 → #N)'
                : 'Order: Descending (Match #N → #1)'}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Series Banner Notification */}
      {selectedSeries && (
        <div className="series-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={17} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.9rem' }}>
              Showing matches for <strong>{selectedSeries.name}</strong> sorted in{' '}
              <strong style={{ color: '#10b981' }}>
                {sortOrder === 'asc' ? 'Ascending Order (Match #1 → #N)' : 'Descending Order'}
              </strong>{' '}
              ({sortedMatches.length} match{sortedMatches.length !== 1 ? 'es' : ''})
            </span>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedSeriesId(0)}
          >
            Show All Series
          </button>
        </div>
      )}

      {/* Matches Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading matches...
          </div>
        ) : sortedMatches.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No matches found for the selected criteria.
          </div>
        ) : (
          sortedMatches.map((m) => (
            <div key={m.id} className="card match-card card-hover">
              <div className="match-card-header">
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cricket)' }}>
                  {m.seriesName} • Match #{m.matchOrder}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    className={`badge ${
                      m.status === 'Completed'
                        ? 'badge-success'
                        : m.status === 'InProgress'
                        ? 'badge-warning'
                        : m.status === 'Cancelled'
                        ? 'badge-danger'
                        : 'badge-info'
                    }`}
                  >
                    {m.status}
                  </span>
                  {canManageCricket && m.status?.toLowerCase() === 'scheduled' && (
                    <button
                      className="btn-icon-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMatch(m.id);
                      }}
                      title="Delete Scheduled Match (Soft Delete)"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        width: '26px',
                        height: '26px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.transform = 'scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Teams Display */}
              <div className="match-teams">
                <div className="match-team">
                  <div className="team-badge">{m.team1ShortName}</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                    {m.team1Name}
                  </span>
                </div>
                <div className="vs-badge">{m.requiredOvers} OVERS</div>
                <div className="match-team">
                  <div className="team-badge">{m.team2ShortName}</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                    {m.team2Name}
                  </span>
                </div>
              </div>

              {/* Match Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} />
                  <span>{new Date(m.scheduledDate).toLocaleDateString()}</span>
                  <Clock size={14} style={{ marginLeft: '0.5rem' }} />
                  <span>{m.scheduledTime}</span>
                </div>
                {m.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} />
                    <span>{m.address}</span>
                  </div>
                )}
                {m.result && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, marginTop: '0.2rem' }}>
                    <CheckCircle size={14} />
                    <span>{m.result}</span>
                  </div>
                )}
                {m.momPlayerName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.75rem' }}>
                    <UserCheck size={14} />
                    <span>Player of the Match: {m.momPlayerName}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleOpenScorecard(m.id)}
                >
                  <FileText size={15} /> Match Scorecard
                </button>
                {canManageCricket && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenEditMatch(m)}
                    title="Edit Match"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule / Edit Match Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingMatch ? `Edit Match #${editingMatch.matchOrder}` : 'Schedule New Match'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveMatch} disabled={matchSubmitting}>
              {matchSubmitting ? 'Saving...' : 'Save Match'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveMatch}>
          {matchFormError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{matchFormError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Series / Tournament *</label>
            <select
              className="form-select"
              required
              value={matchFormData.seriesId}
              onChange={(e) => setMatchFormData({ ...matchFormData, seriesId: Number(e.target.value) })}
            >
              <option value={0}>-- Select Series --</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Team 1 *</label>
              <select
                className="form-select"
                required
                value={matchFormData.team1Id}
                onChange={(e) => setMatchFormData({ ...matchFormData, team1Id: Number(e.target.value) })}
              >
                <option value={0}>-- Select Team 1 --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Team 2 * (Different team)</label>
              <select
                className="form-select"
                required
                value={matchFormData.team2Id}
                onChange={(e) => setMatchFormData({ ...matchFormData, team2Id: Number(e.target.value) })}
              >
                <option value={0}>-- Select Team 2 --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Match Order (e.g. 1, 2, 3)</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={matchFormData.matchOrder}
                onChange={(e) => setMatchFormData({ ...matchFormData, matchOrder: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Required Overs (Per Innings)</label>
              <input
                type="number"
                min={1}
                max={50}
                className="form-input"
                value={matchFormData.requiredOvers}
                onChange={(e) => setMatchFormData({ ...matchFormData, requiredOvers: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Scheduled Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={matchFormData.scheduledDate}
                onChange={(e) => setMatchFormData({ ...matchFormData, scheduledDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Time *</label>
              <input
                type="time"
                className="form-input"
                required
                value={matchFormData.scheduledTime}
                onChange={(e) => setMatchFormData({ ...matchFormData, scheduledTime: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Venue / Box Cricket Address</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Surat Box Cricket Arena, Pitch 1"
              value={matchFormData.address}
              onChange={(e) => setMatchFormData({ ...matchFormData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={matchFormData.status}
              onChange={(e) => setMatchFormData({ ...matchFormData, status: e.target.value })}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="InProgress">InProgress</option>
              <option value="Completed">Completed</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Full Match Live Ball-by-Ball Scoring Modal */}
      <Modal
        isOpen={scorecardModalOpen}
        onClose={() => setScorecardModalOpen(false)}
        title={
          activeLiveScore
            ? `Live Scoring: ${activeLiveScore.match.team1Name} vs ${activeLiveScore.match.team2Name}`
            : 'Match Scorecard'
        }
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setScorecardModalOpen(false)}>
            Close Scoring Screen
          </button>
        }
      >
        {scorecardLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RotateCw className="spin" size={24} style={{ marginBottom: '0.5rem' }} />
            <div>Loading live match scoring engine...</div>
          </div>
        ) : !activeLiveScore ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Live scoring data not available for this match.
          </div>
        ) : (
          <div className="live-score-modal-body">
            {scorecardError && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{scorecardError}</span>
              </div>
            )}

            {/* Top Modal Navigation: Scoring Console vs Scorecard vs Outcome */}
            <div className="tabs-nav" style={{ marginBottom: '0.5rem' }}>
              <button
                className={`tab-btn ${modalTab === 'live' ? 'active' : ''}`}
                onClick={() => setModalTab('live')}
              >
                <Activity size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Live Scoring Console
              </button>
              <button
                className={`tab-btn ${modalTab === 'scorecard' ? 'active' : ''}`}
                onClick={() => setModalTab('scorecard')}
              >
                <FileText size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Live Scorecard
              </button>
              <button
                className={`tab-btn ${modalTab === 'outcome' ? 'active' : ''}`}
                onClick={() => setModalTab('outcome')}
              >
                <Award size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Match Outcome & Awards
              </button>
            </div>

            {/* TAB 1: LIVE SCORING CONSOLE */}
            {modalTab === 'live' && (
              <div>
                {/* Innings Selector Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    className={`btn btn-sm ${activeInningsTab === 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveInningsTab(1)}
                  >
                    1st Innings ({activeLiveScore.innings1?.battingTeamShortName || activeLiveScore.match.team1ShortName})
                    {activeLiveScore.innings1 && ` • ${activeLiveScore.innings1.runs}/${activeLiveScore.innings1.wickets}`}
                  </button>
                  <button
                    className={`btn btn-sm ${activeInningsTab === 2 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveInningsTab(2)}
                  >
                    2nd Innings ({activeLiveScore.innings2?.battingTeamShortName || activeLiveScore.match.team2ShortName})
                    {activeLiveScore.innings2 && ` • ${activeLiveScore.innings2.runs}/${activeLiveScore.innings2.wickets}`}
                  </button>
                </div>

                {/* State A: Innings Not Started -> Setup Wizard */}
                {!isCurrentInningsStarted && !isCurrentInningsCompleted ? (
                  !canManageCricket ? (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2.5rem 1.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <Clock size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                        {activeInningsTab === 1 ? '1st' : '2nd'} Innings Not Started
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                        The match umpire or administrator has not started this innings yet. Live score updates will appear here once live scoring commences.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                      <PlayCircle size={22} style={{ color: 'var(--accent-cricket)' }} />
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                          Start {activeInningsTab === 1 ? '1st' : '2nd'} Innings
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Configure batting team, opening batsmen, and bowler to begin live ball-by-ball scoring.
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Batting Team *</label>
                      <select
                        className="form-select"
                        value={setupBattingTeamId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSetupBattingTeamId(val);
                          setSetupStrikerId(0);
                          setSetupNonStrikerId(0);
                          setSetupBowlerId(0);
                        }}
                      >
                        <option value={0}>-- Select Batting Team --</option>
                        <option value={activeLiveScore.match.team1Id}>{activeLiveScore.match.team1Name}</option>
                        <option value={activeLiveScore.match.team2Id}>{activeLiveScore.match.team2Name}</option>
                      </select>
                    </div>

                    <div className="form-row" style={{ marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Striker Batsman *</label>
                        <select
                          className="form-select"
                          value={setupStrikerId}
                          onChange={(e) => setSetupStrikerId(Number(e.target.value))}
                        >
                          <option value={0}>-- Select Striker --</option>
                          {setupBattingPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.playerCategory})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Non-Striker Batsman *</label>
                        <select
                          className="form-select"
                          value={setupNonStrikerId}
                          onChange={(e) => setSetupNonStrikerId(Number(e.target.value))}
                        >
                          <option value={0}>-- Select Non-Striker --</option>
                          {setupBattingPlayers
                            .filter((p) => p.id !== setupStrikerId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} ({p.playerCategory})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Opening Bowler (from Opposition) *</label>
                      <select
                        className="form-select"
                        value={setupBowlerId}
                        onChange={(e) => setSetupBowlerId(Number(e.target.value))}
                      >
                        <option value={0}>-- Select Bowler --</option>
                        {setupBowlingPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.playerCategory})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.85rem' }}
                      onClick={handleStartInnings}
                      disabled={actionLoading || setupStrikerId === 0 || setupNonStrikerId === 0 || setupBowlerId === 0}
                    >
                      <PlayCircle size={18} /> {actionLoading ? 'Starting...' : 'Start Live Scoring'}
                    </button>
                  </div>
                  )
                ) : isCurrentInningsCompleted ? (
                  /* State B: Innings Completed */
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {currentInnings?.battingTeamName} - Innings Completed
                    </h3>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cricket)', marginBottom: '0.5rem' }}>
                      {currentInnings?.runs} / {currentInnings?.wickets}
                      <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        ({currentInnings?.oversDisplay} Overs)
                      </span>
                    </div>

                    {activeInningsTab === 1 && !activeLiveScore.innings2 ? (
                      canManageCricket && (
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setActiveInningsTab(2);
                            setSetupInningsNumber(2);
                            const secondTeam =
                              activeLiveScore.match.team1Id === currentInnings?.battingTeamId
                                ? activeLiveScore.match.team2Id
                                : activeLiveScore.match.team1Id;
                            setSetupBattingTeamId(secondTeam);
                          }}
                        >
                          Proceed to 2nd Innings
                        </button>
                      )
                    ) : (
                      activeLiveScore.matchSummary && (
                        <div style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 600, marginTop: '0.75rem' }}>
                          {activeLiveScore.matchSummary}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  /* State C: Active In-Progress Live Scoring */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Top Live Scoreboard Header */}
                    <div className="live-scoreboard-header">
                      <div className="live-score-top-row">
                        <div>
                          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-cricket)', fontWeight: 700 }}>
                            {activeInningsTab === 1 ? '1st Innings' : '2nd Innings'} • Live
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                            {currentInnings?.battingTeamName}
                          </div>
                        </div>

                        <div className="live-score-main-metric">
                          <div className="live-score-runs-wickets">
                            {currentInnings?.runs}/{currentInnings?.wickets}
                          </div>
                          <div className="live-score-overs">
                            Overs: {currentInnings?.oversDisplay}
                          </div>
                        </div>
                      </div>

                      <div className="live-rates-bar">
                        <span>CRR: <strong>{currentInnings?.currentRunRate.toFixed(2)}</strong></span>
                        {currentInnings?.targetRuns && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                              Target: {currentInnings.targetRuns}
                            </span>
                          </>
                        )}
                        {currentInnings?.requiredRunRate && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#60a5fa' }}>
                              RRR: <strong>{currentInnings.requiredRunRate.toFixed(2)}</strong>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Extras: {currentInnings?.extras || 0}</span>
                      </div>
                    </div>

                    {/* Crease Widget: Striker, Non-Striker, Bowler */}
                    <div className="crease-grid">
                      {/* Striker Card */}
                      <div className="crease-card active-striker">
                        <div className="crease-card-header">
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            🏏 Striker
                          </span>
                        </div>
                        <div className="crease-player-name">
                          {currentInnings?.striker?.playerName || 'Select Striker'}
                        </div>
                        <div className="crease-stats-line">
                          <span className="crease-runs-large">{currentInnings?.striker?.runs ?? 0}</span>
                          <span className="crease-balls-small">({currentInnings?.striker?.ballsFaced ?? 0} balls)</span>
                        </div>
                        <div className="crease-meta-badges">
                          <span>4s: <strong>{currentInnings?.striker?.fours ?? 0}</strong></span>
                          <span>6s: <strong>{currentInnings?.striker?.sixes ?? 0}</strong></span>
                          <span>SR: <strong>{currentInnings?.striker?.strikeRate ?? 0}</strong></span>
                        </div>
                      </div>

                      {/* Manual Strike Swap Button */}
                      {canManageCricket && (
                        <button
                          className="strike-swap-btn"
                          title="Swap Striker & Non-Striker strike end"
                          onClick={async () => {
                            if (!currentInnings || !currentInnings.striker || !currentInnings.nonStriker) return;
                            // Strike rotation visually swaps striker/non-striker on odd runs; button provides quick manual swap
                          }}
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                      )}

                      {/* Non-Striker Card */}
                      <div className="crease-card">
                        <div className="crease-card-header">
                          <span>Non-Striker</span>
                        </div>
                        <div className="crease-player-name">
                          {currentInnings?.nonStriker?.playerName || 'Select Non-Striker'}
                        </div>
                        <div className="crease-stats-line">
                          <span className="crease-runs-large">{currentInnings?.nonStriker?.runs ?? 0}</span>
                          <span className="crease-balls-small">({currentInnings?.nonStriker?.ballsFaced ?? 0} balls)</span>
                        </div>
                        <div className="crease-meta-badges">
                          <span>4s: <strong>{currentInnings?.nonStriker?.fours ?? 0}</strong></span>
                          <span>6s: <strong>{currentInnings?.nonStriker?.sixes ?? 0}</strong></span>
                          <span>SR: <strong>{currentInnings?.nonStriker?.strikeRate ?? 0}</strong></span>
                        </div>
                      </div>

                      {/* Bowler Card */}
                      <div className="crease-card">
                        <div className="crease-card-header">
                          <span style={{ color: '#3b82f6' }}>Bowler</span>
                        </div>
                        <div className="crease-player-name">
                          {currentInnings?.currentBowler?.playerName || 'Select Bowler'}
                        </div>
                        <div className="crease-stats-line">
                          <span className="crease-runs-large" style={{ color: '#3b82f6' }}>
                            {currentInnings?.currentBowler?.wickets ?? 0} - {currentInnings?.currentBowler?.runsConceded ?? 0}
                          </span>
                          <span className="crease-balls-small">({currentInnings?.currentBowler?.oversDisplay ?? '0.0'} ov)</span>
                        </div>
                        <div className="crease-meta-badges">
                          <span>M: <strong>{currentInnings?.currentBowler?.maidenOvers ?? 0}</strong></span>
                          <span>Econ: <strong>{currentInnings?.currentBowler?.economyRate ?? 0}</strong></span>
                          <span>Wd: <strong>{currentInnings?.currentBowler?.wides ?? 0}</strong></span>
                          <span>Nb: <strong>{currentInnings?.currentBowler?.noBalls ?? 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Over Complete Banner (if 6 legal balls bowled) */}
                    {currentInnings?.isOverComplete && (
                      <div className="over-complete-box">
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                            Over {currentInnings?.currentOverNumber ?? (Math.floor((currentInnings?.legalBalls || 0) / 6))} Complete!
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            6 legal deliveries completed in this over by <strong>{currentInnings?.previousBowlerName || currentInnings?.currentBowler?.playerName}</strong>. Striker and non-striker ends swapped.
                          </div>
                        </div>
                        {canManageCricket ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setNextBowlerId(0);
                              setNextBowlerModalOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            Select Next Bowler
                          </button>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600, alignSelf: 'center' }}>
                            Over complete — awaiting next bowler selection.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Over Delivery Timeline */}
                    <div className="over-timeline-box">
                      <div className="over-timeline-header">
                        <span>
                          Over {currentInnings?.currentOverNumber ?? 1} Deliveries (
                          {currentInnings?.currentOverDeliveries?.filter((b) => b.isLegalBall).length || 0}/6 legal balls)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Bowler: <strong style={{ color: 'var(--text-primary)' }}>{currentInnings?.currentBowler?.playerName || 'Unassigned'}</strong> • Balls in Over: {currentInnings?.currentOverDeliveries?.length || 0}
                        </span>
                      </div>
                      <div className="over-pills-row">
                        {!currentInnings?.currentOverDeliveries || currentInnings.currentOverDeliveries.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.4rem 0' }}>
                            Ready to bowl Over {currentInnings?.currentOverNumber ?? 1}... click a score button below.
                          </div>
                        ) : (
                          currentInnings.currentOverDeliveries.map((ball) => {
                            let pillClass = 'ball-pill-run';
                            if (ball.isWicket) pillClass = 'ball-pill-wicket';
                            else if (ball.batRuns === 4) pillClass = 'ball-pill-boundary-four';
                            else if (ball.batRuns === 6) pillClass = 'ball-pill-boundary-six';
                            else if (ball.eventType === 'Wide' || ball.eventType === 'NoBall' || ball.eventType === 'LegBye')
                              pillClass = 'ball-pill-extra';
                            else if (ball.runs === 0) pillClass = 'ball-pill-dot';

                            return (
                              <div
                                key={ball.id}
                                className={`ball-pill ${pillClass}`}
                                title={`Over #${ball.overNumber}, Ball #${ball.ballNumber} (Del #${ball.deliveryNumber}): ${ball.runs} runs - ${ball.strikerName} facing ${ball.bowlerName}`}
                              >
                                {ball.displayText}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Previous Completed Overs History */}
                    {currentInnings?.allDeliveries && currentInnings.allDeliveries.some((b) => b.overNumber < (currentInnings.currentOverNumber || 1)) && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Previous Overs History
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Array.from(
                            new Set(
                              currentInnings.allDeliveries
                                .filter((b) => b.overNumber < (currentInnings.currentOverNumber || 1))
                                .map((b) => b.overNumber)
                            )
                          ).map((ovNum) => {
                            const ovBalls = currentInnings.allDeliveries?.filter((b) => b.overNumber === ovNum) || [];
                            const bName = ovBalls[0]?.bowlerName || 'Bowler';
                            const runsInOv = ovBalls.reduce((acc, b) => acc + b.runs, 0);
                            const wicketsInOv = ovBalls.filter((b) => b.isWicket).length;
                            return (
                              <div
                                key={ovNum}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                  padding: '0.4rem 0.6rem',
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: '6px',
                                  fontSize: '0.82rem',
                                }}
                              >
                                <div>
                                  Over {ovNum} • <strong style={{ color: 'var(--text-primary)' }}>{bName}</strong>: {runsInOv} runs{wicketsInOv > 0 ? `, ${wicketsInOv} wkt` : ''}
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  {ovBalls.map((b) => {
                                    let pillClass = 'ball-pill-run';
                                    if (b.isWicket) pillClass = 'ball-pill-wicket';
                                    else if (b.batRuns === 4) pillClass = 'ball-pill-boundary-four';
                                    else if (b.batRuns === 6) pillClass = 'ball-pill-boundary-six';
                                    else if (b.eventType === 'Wide' || b.eventType === 'NoBall' || b.eventType === 'LegBye')
                                      pillClass = 'ball-pill-extra';
                                    else if (b.runs === 0) pillClass = 'ball-pill-dot';

                                    return (
                                      <div
                                        key={b.id}
                                        className={`ball-pill ${pillClass}`}
                                        style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}
                                        title={`Over ${b.overNumber}, Ball ${b.ballNumber}: ${b.runs} runs`}
                                      >
                                        {b.displayText}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {canManageCricket ? (
                      <>
                        {/* Primary Ball Scoring Controls */}
                        <div className="scoring-pad-wrapper">
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            Live Delivery Result
                          </div>

                          {/* Runs Grid: 0 to 6 */}
                          <div className="runs-pad-grid">
                            {[0, 1, 2, 3, 4, 5, 6].map((run) => (
                              <button
                                key={run}
                                className={`run-pad-btn ${run === 4 ? 'boundary-four' : run === 6 ? 'boundary-six' : ''}`}
                                onClick={() => handleRecordNormalBall(run)}
                                disabled={actionLoading || currentInnings?.isOverComplete || currentInnings?.requiresNewBatsman}
                                title={`Record ${run} run${run === 1 ? '' : 's'}`}
                              >
                                {run}
                              </button>
                            ))}
                          </div>

                          {/* Extra Actions Grid */}
                          <div className="actions-pad-grid">
                            <button
                              className="action-pad-btn btn-wicket"
                              onClick={handleOpenWicketDialog}
                              disabled={actionLoading || currentInnings?.isOverComplete}
                            >
                              <Shield size={14} /> WICKET
                            </button>

                            <button
                              className="action-pad-btn btn-noball"
                              onClick={() => setExtraSubMenu(extraSubMenu === 'NoBall' ? null : 'NoBall')}
                              disabled={actionLoading || currentInnings?.isOverComplete}
                            >
                              NO BALL
                            </button>

                            <button
                              className="action-pad-btn btn-wide"
                              onClick={() => setExtraSubMenu(extraSubMenu === 'Wide' ? null : 'Wide')}
                              disabled={actionLoading || currentInnings?.isOverComplete}
                            >
                              WIDE
                            </button>

                            <button
                              className="action-pad-btn btn-legbye"
                              onClick={() => setExtraSubMenu(extraSubMenu === 'LegBye' ? null : 'LegBye')}
                              disabled={actionLoading || currentInnings?.isOverComplete}
                            >
                              LEG BYE
                            </button>

                            <button
                              className="action-pad-btn btn-deadball"
                              onClick={handleRecordDeadBall}
                              disabled={actionLoading || currentInnings?.isOverComplete}
                            >
                              DEAD BALL
                            </button>
                          </div>

                          {/* Sub-menu options for No Ball */}
                          {extraSubMenu === 'NoBall' && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.5rem' }}>
                                No Ball: Select additional runs scored from the bat (Striker gets bat runs, +1 extra):
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[0, 1, 2, 3, 4, 6].map((batRun) => (
                                  <button
                                    key={batRun}
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleRecordNoBall(batRun)}
                                    disabled={actionLoading}
                                  >
                                    {batRun === 0 ? 'No Bat Run (1 nb)' : `+ ${batRun} ${batRun === 4 ? 'Four' : batRun === 6 ? 'Six' : 'Runs'}`}
                                  </button>
                                ))}
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setExtraSubMenu(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sub-menu options for Wide */}
                          {extraSubMenu === 'Wide' && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Wide Delivery: Select total wide extras (Default is 1):
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[1, 2, 3, 4, 5].map((wRun) => (
                                  <button
                                    key={wRun}
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleRecordWide(wRun)}
                                    disabled={actionLoading}
                                  >
                                    {wRun === 1 ? '1 Wide' : `${wRun} Wides`}
                                  </button>
                                ))}
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setExtraSubMenu(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sub-menu options for Leg Bye */}
                          {extraSubMenu === 'LegBye' && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Leg Bye (Legal delivery, runs go to team extras):
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[1, 2, 3, 4].map((lbRun) => (
                                  <button
                                    key={lbRun}
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleRecordLegBye(lbRun)}
                                    disabled={actionLoading}
                                  >
                                    {lbRun} Leg Bye{lbRun > 1 ? 's' : ''}
                                  </button>
                                ))}
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setExtraSubMenu(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* End Innings Link */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleCompleteInnings}
                            disabled={actionLoading}
                          >
                            Declare / Complete This Innings
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.85rem 1.25rem',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          color: '#38bdf8',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <Activity size={16} />
                        <span>Live Score Viewing Mode — Ball-by-ball scoring controls are restricted to Umpires and Administrators.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LIVE SCORECARD TABLE (AUTO-GENERATED) */}
            {modalTab === 'scorecard' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    className={`btn btn-sm ${activeInningsTab === 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveInningsTab(1)}
                  >
                    1st Innings Scorecard
                  </button>
                  <button
                    className={`btn btn-sm ${activeInningsTab === 2 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveInningsTab(2)}
                  >
                    2nd Innings Scorecard
                  </button>
                </div>

                {!currentInnings ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No scorecard data recorded for this innings yet.
                  </div>
                ) : (
                  <div>
                    {/* Innings Summary Banner */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.85rem 1.25rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          {currentInnings.battingTeamName}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                          ({currentInnings.status})
                        </span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cricket)' }}>
                        {currentInnings.runs}/{currentInnings.wickets}
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                          ({currentInnings.oversDisplay} ov)
                        </span>
                      </div>
                    </div>

                    {/* Batting Scorecard Table */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
                      Batting
                    </h4>
                    <div className="table-container score-table" style={{ marginBottom: '1.5rem' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Batsman</th>
                            <th>Dismissal</th>
                            <th>R</th>
                            <th>B</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>Dots</th>
                            <th>1s</th>
                            <th>2s</th>
                            <th>3s</th>
                            <th>SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentInnings.battingPerformances.length === 0 ? (
                            <tr>
                              <td colSpan={11} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                                No batting performances recorded yet.
                              </td>
                            </tr>
                          ) : (
                            currentInnings.battingPerformances.map((bp) => (
                              <tr key={bp.id || bp.playerId}>
                                <td style={{ fontWeight: 600 }}>{bp.playerName}</td>
                                <td style={{ color: bp.isOut ? '#ef4444' : '#10b981', fontSize: '0.8rem' }}>
                                  {bp.isOut ? (bp.dismissalType || 'Out') : 'not out'}
                                </td>
                                <td style={{ fontWeight: 800, color: '#fff' }}>{bp.runs}</td>
                                <td>{bp.ballsFaced}</td>
                                <td>{bp.fours}</td>
                                <td>{bp.sixes}</td>
                                <td>{bp.dotBalls}</td>
                                <td>{bp.ones}</td>
                                <td>{bp.twos}</td>
                                <td>{bp.threes}</td>
                                <td style={{ color: 'var(--accent-cricket)', fontWeight: 600 }}>
                                  {bp.strikeRate}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Extras: <strong>{currentInnings.extras}</strong>
                    </div>

                    {/* Bowling Figures Table */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem' }}>
                      Bowling
                    </h4>
                    <div className="table-container score-table">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Bowler</th>
                            <th>O</th>
                            <th>Balls</th>
                            <th>M</th>
                            <th>R</th>
                            <th>W</th>
                            <th>Econ</th>
                            <th>Wd</th>
                            <th>Nb</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentInnings.bowlingPerformances.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                                No bowling figures recorded yet.
                              </td>
                            </tr>
                          ) : (
                            currentInnings.bowlingPerformances.map((bowl) => (
                              <tr key={bowl.id || bowl.playerId}>
                                <td style={{ fontWeight: 600 }}>{bowl.playerName}</td>
                                <td style={{ fontWeight: 700, color: '#3b82f6' }}>{bowl.oversDisplay}</td>
                                <td>{bowl.ballsBowled}</td>
                                <td>{bowl.maidenOvers}</td>
                                <td style={{ fontWeight: 700 }}>{bowl.runsConceded}</td>
                                <td style={{ fontWeight: 800, color: '#ef4444' }}>{bowl.wickets}</td>
                                <td>{bowl.economyRate}</td>
                                <td>{bowl.wides}</td>
                                <td>{bowl.noBalls}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MATCH OUTCOME & AWARDS */}
            {modalTab === 'outcome' && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Match Outcome & Awards
                </h4>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>Winning Team</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Lock size={12} /> Auto-Determined from Score
                    </span>
                  </label>
                  <select
                    className="form-select"
                    value={activeLiveScore.calculatedResult?.winningTeamId ?? outcomeWinningTeamId}
                    disabled={true}
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'not-allowed', fontWeight: 600 }}
                  >
                    <option value={0}>-- Draw / Tied / In Progress --</option>
                    <option value={activeLiveScore.match.team1Id}>{activeLiveScore.match.team1Name}</option>
                    <option value={activeLiveScore.match.team2Id}>{activeLiveScore.match.team2Name}</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>Match Result Description</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Lock size={12} /> Automatically generated from final innings
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={true}
                    disabled={true}
                    value={activeLiveScore.calculatedResult?.resultDescription || activeLiveScore.match.result || 'Result pending completion of innings'}
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                {/* Calculated Innings Breakdown Card */}
                {activeLiveScore.calculatedResult && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.6rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Calculated Innings Breakdown
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {activeLiveScore.innings1 && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1st Innings (Batted First)</div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{activeLiveScore.innings1.battingTeamName}</div>
                          <div style={{ color: '#fbbf24', fontWeight: 800, marginTop: '0.2rem' }}>
                            {activeLiveScore.innings1.runs}/{activeLiveScore.innings1.wickets}{' '}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                              ({activeLiveScore.innings1.oversDisplay} ov)
                            </span>
                          </div>
                        </div>
                      )}
                      {activeLiveScore.innings2 && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2nd Innings (Chasing Team)</div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{activeLiveScore.innings2.battingTeamName}</div>
                          <div style={{ color: '#fbbf24', fontWeight: 800, marginTop: '0.2rem' }}>
                            {activeLiveScore.innings2.runs}/{activeLiveScore.innings2.wickets}{' '}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                              ({activeLiveScore.innings2.oversDisplay} ov)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {activeLiveScore.calculatedResult.summary && (
                      <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        📊 {activeLiveScore.calculatedResult.summary}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Selected Player of the Match Card */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                      <Award size={16} style={{ color: '#fbbf24' }} /> Player of the Match (Auto Selected)
                    </span>
                    <span
                      className={`badge ${activeLiveScore.match.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {activeLiveScore.match.status === 'Completed' ? 'Finalized Award' : 'Live Projected Leader'}
                    </span>
                  </label>

                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    {activeLiveScore.momDetails?.selectedPlayerName || activeLiveScore.match.momPlayerName ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              🏆 {activeLiveScore.momDetails?.selectedPlayerName || activeLiveScore.match.momPlayerName}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {activeLiveScore.momDetails?.selectedPlayerTeamName || activeLiveScore.match.winningTeamName || 'Match Participant'}
                            </div>
                          </div>

                          <div style={{ padding: '0.4rem 0.85rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>
                            Performance Score: {activeLiveScore.momDetails?.totalScore ?? activeLiveScore.match.momScore ?? 0} pts
                          </div>
                        </div>

                        <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                            🏏 <strong>Batting:</strong> {activeLiveScore.momDetails?.battingSummary || 'Evaluated'}
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            🎯 <strong>Bowling:</strong> {activeLiveScore.momDetails?.bowlingSummary || 'Evaluated'}
                          </div>
                        </div>

                        <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setMomDetailsModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <BarChart2 size={14} /> View MOM Calculation & Leaderboard
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>
                        No player performances recorded yet to calculate Man of the Match. Performances will be automatically evaluated as deliveries are scored.
                      </div>
                    )}
                  </div>
                </div>

                {canManageCricket ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveOutcome}
                    disabled={actionLoading}
                  >
                    <Save size={16} /> {actionLoading ? 'Saving...' : 'Save & Finalize Match Outcome'}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Match outcome can only be finalized by an Umpire or Administrator.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Wicket Dialog Modal */}
      <Modal
        isOpen={wicketModalOpen}
        onClose={() => setWicketModalOpen(false)}
        title="Record Dismissal / Wicket"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setWicketModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleConfirmWicket} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Confirm Wicket'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Dismissed Batsman *</label>
            <select
              className="form-select"
              value={wicketDismissedPlayerId}
              onChange={(e) => setWicketDismissedPlayerId(Number(e.target.value))}
            >
              {currentInnings?.striker && (
                <option value={currentInnings.striker.playerId}>
                  {currentInnings.striker.playerName} (Striker)
                </option>
              )}
              {currentInnings?.nonStriker && (
                <option value={currentInnings.nonStriker.playerId}>
                  {currentInnings.nonStriker.playerName} (Non-Striker)
                </option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Wicket Type *</label>
            <select
              className="form-select"
              value={wicketType}
              onChange={(e) => setWicketType(e.target.value)}
            >
              <option value="Bowled">Bowled</option>
              <option value="Caught">Caught</option>
              <option value="RunOut">Run Out (Bowler not credited)</option>
              <option value="Stumped">Stumped</option>
              <option value="HitWicket">Hit Wicket</option>
            </select>
          </div>

          {(wicketType === 'Caught' || wicketType === 'Stumped' || wicketType === 'RunOut') && (
            <div className="form-group">
              <label className="form-label">
                {wicketType === 'Caught' ? 'Caught By (Fielder) *' : wicketType === 'Stumped' ? 'Stumped By (Wicketkeeper) *' : 'Run Out By (Fielder) *'}
              </label>
              <select
                className="form-select"
                value={wicketFielderPlayerId}
                onChange={(e) => setWicketFielderPlayerId(Number(e.target.value))}
              >
                <option value={0}>-- Select Fielder --</option>
                {bowlingPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.playerCategory})
                  </option>
                ))}
              </select>
            </div>
          )}

          {wicketType === 'RunOut' && (
            <div className="form-group">
              <label className="form-label">Runs completed before runout</label>
              <input
                type="number"
                min={0}
                max={4}
                className="form-input"
                value={wicketRunsScored}
                onChange={(e) => setWicketRunsScored(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Select New Batsman Modal */}
      <Modal
        isOpen={newBatsmanModalOpen}
        onClose={() => setNewBatsmanModalOpen(false)}
        title="Select New Batsman"
        size="sm"
        footer={
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleSelectNewBatsman}
            disabled={actionLoading || newBatsmanId === 0}
          >
            Send Batsman to Crease
          </button>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            A wicket has fallen. Please select an eligible incoming batsman from the batting team:
          </div>

          <div className="form-group">
            <label className="form-label">Incoming Batsman</label>
            <select
              className="form-select"
              value={newBatsmanId}
              onChange={(e) => setNewBatsmanId(Number(e.target.value))}
            >
              <option value={0}>-- Select New Batsman --</option>
              {battingPlayers
                .filter((p) => {
                  const isDismissed = currentInnings?.battingPerformances.some((bp) => bp.playerId === p.id && bp.isOut);
                  const isAtCrease = currentInnings?.striker?.playerId === p.id || currentInnings?.nonStriker?.playerId === p.id;
                  return !isDismissed && !isAtCrease;
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.playerCategory})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Select Next Bowler Modal */}
      <Modal
        isOpen={nextBowlerModalOpen}
        onClose={() => setNextBowlerModalOpen(false)}
        title="Select Next Bowler"
        size="sm"
        footer={
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleNextOver}
            disabled={actionLoading || nextBowlerId === 0}
          >
            Start Next Over
          </button>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Over {currentInnings?.currentOverNumber || 1} Complete
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              Previous Bowler: <span style={{ color: 'var(--accent-cricket)' }}>{currentInnings?.previousBowlerName || currentInnings?.currentBowler?.playerName || 'N/A'}</span>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Select the bowler for Over {(currentInnings?.currentOverNumber || 1) + 1} (consecutive overs by the same bowler are not allowed):
          </div>

          <div className="form-group">
            <label className="form-label">Select Next Bowler *</label>
            <select
              className="form-select"
              value={nextBowlerId}
              onChange={(e) => setNextBowlerId(Number(e.target.value))}
            >
              <option value={0}>-- Select Next Bowler --</option>
              {bowlingPlayers
                .filter((p) => {
                  const prevId = currentInnings?.previousBowlerId || currentInnings?.currentBowler?.playerId;
                  return p.id !== prevId;
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.playerCategory})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Man of the Match Calculation & Leaderboard Modal */}
      <Modal
        isOpen={momDetailsModalOpen}
        onClose={() => setMomDetailsModalOpen(false)}
        title="Player of the Match (MOM) - Performance Breakdown"
        size="lg"
      >
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
            MOM points are computed authoritatively from recorded match performances. Factors include:
            runs scored, strike rate, boundaries (4s/6s), wickets taken, bowling economy rate, maidens, all-rounder bonus (both runs & wickets), and winning team impact.
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Batting Pts</th>
                  <th>Bowling Pts</th>
                  <th>All-Rounder</th>
                  <th>Win Bonus</th>
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {!activeLiveScore?.momDetails?.leaderboard || activeLiveScore.momDetails.leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No player statistics available yet for this match.
                    </td>
                  </tr>
                ) : (
                  activeLiveScore.momDetails.leaderboard.map((item) => {
                    const isWinner = item.rank === 1 && item.totalScore > 0;
                    return (
                      <tr
                        key={item.playerId}
                        style={{
                          background: isWinner ? 'rgba(245, 158, 11, 0.12)' : undefined,
                        }}
                      >
                        <td>
                          {isWinner ? (
                            <span title="Winner" style={{ fontSize: '1.1rem' }}>🏆</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.rank}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: isWinner ? '#fbbf24' : 'var(--text-primary)', fontWeight: 700 }}>
                              {item.playerName}
                            </span>
                            {isWinner && (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                MOM
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {item.battingSummary} • {item.bowlingSummary}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{item.teamName}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.battingPoints}</td>
                        <td style={{ fontWeight: 600 }}>{item.bowlingPoints}</td>
                        <td>
                          {item.allRounderBonus > 0 ? (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>+{item.allRounderBonus}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {item.winningTeamBonus > 0 ? (
                            <span style={{ color: '#3b82f6', fontWeight: 700 }}>+{item.winningTeamBonus}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: isWinner ? '#fbbf24' : 'var(--accent-cricket)' }}>
                          {item.totalScore}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
