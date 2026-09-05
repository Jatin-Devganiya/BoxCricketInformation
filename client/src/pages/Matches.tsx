import React, { useEffect, useState } from 'react';
import { matchesApi, seriesApi, teamsApi, liveScoringApi } from '../api/client';
import { Match, Series, Team, Player, LiveScore, LiveInnings, EligibleBowlersResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  canAddMatchesToSeries,
  getAllowedMatchCreationStatuses,
  getAllowedMatchTransitions,
  isMatchStatusLocked,
  canStartMatch,
  canLiveScore,
  getSeriesNotificationMessage,
} from '../utils/statusRules';
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
  Lock,
  XCircle
} from 'lucide-react';

interface MatchesProps {
  initialScorecardMatchId?: number | null;
  onClearInitialMatchId?: () => void;
}

export const Matches: React.FC<MatchesProps> = ({
  initialScorecardMatchId,
  onClearInitialMatchId,
}) => {
  const { canManageMatches, canScoreLive } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSeriesId, setSelectedSeriesId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const currentSelectedSeries = selectedSeriesId > 0 ? seriesList.find((s) => s.id === selectedSeriesId) : null;
  const canScheduleInSelectedSeries = currentSelectedSeries
    ? canAddMatchesToSeries(currentSelectedSeries.status)
    : seriesList.some((s) => canAddMatchesToSeries(s.status));
  const isSelectedSeriesCompleted = currentSelectedSeries?.status === 'Completed' || currentSelectedSeries?.status === 'Cancelled';

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

  // Bowler Change States (Scenario A: Pre-over, Scenario B: Incomplete mid-over)
  const [changeBowlerModalOpen, setChangeBowlerModalOpen] = useState<boolean>(false);
  const [isMidOverChange, setIsMidOverChange] = useState<boolean>(false);
  const [selectedNewBowlerId, setSelectedNewBowlerId] = useState<number>(0);
  const [eligibleBowlersData, setEligibleBowlersData] = useState<EligibleBowlersResponse | null>(null);
  const [bowlerLoading, setBowlerLoading] = useState<boolean>(false);

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
    // Find active series (Scheduled or InProgress)
    const activeSeriesList = seriesList.filter((s) => canAddMatchesToSeries(s.status));
    if (activeSeriesList.length === 0 && seriesList.length > 0) {
      alert('All existing series are completed or cancelled. Please create a new series under the Series section before scheduling matches.');
      return;
    }

    const currentSelected = seriesList.find((s) => s.id === selectedSeriesId);
    const defaultSeries = (currentSelected && canAddMatchesToSeries(currentSelected.status))
      ? currentSelected.id
      : (activeSeriesList[0]?.id || 0);

    const targetSeriesObj = seriesList.find((s) => s.id === defaultSeries);
    const allowedCreationStatuses = getAllowedMatchCreationStatuses(targetSeriesObj?.status);

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
      status: allowedCreationStatuses[0] || 'Scheduled',
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

    const targetSeries = seriesList.find((s) => s.id === Number(matchFormData.seriesId));
    if (!editingMatch && !canAddMatchesToSeries(targetSeries?.status)) {
      setMatchFormError(`Series "${targetSeries?.name}" is ${targetSeries?.status}. Cannot add matches to this series.`);
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

  const handleStartMatch = async (m: Match) => {
    const parentSeries = seriesList.find((s) => s.id === m.seriesId);
    if (!parentSeries || parentSeries.status !== 'InProgress') {
      alert('Series has not started yet. Match cannot be started.');
      return;
    }
    try {
      setLoading(true);
      await matchesApi.update(m.id, {
        seriesId: m.seriesId,
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        matchOrder: m.matchOrder,
        requiredOvers: m.requiredOvers,
        scheduledDate: m.scheduledDate,
        scheduledTime: m.scheduledTime,
        address: m.address,
        status: 'InProgress',
      });
      await fetchMatches();
      setModalTab('live');
      handleOpenScorecard(m.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start match.');
    } finally {
      setLoading(false);
    }
  };

  // Scorecard Helper functions for Innings Rows
  // ==========================================
  // LIVE SCORING HANDLERS
  // ==========================================

  const formatMatchResult = (result?: string, team1Name?: string, team2Name?: string) => {
    if (!result) return '';
    let formatted = result;
    if (formatted.startsWith('Team 1 ') && team1Name) {
      formatted = team1Name + formatted.slice('Team 1'.length);
    } else if (formatted.startsWith('Team 2 ') && team2Name) {
      formatted = team2Name + formatted.slice('Team 2'.length);
    }
    return formatted;
  };

  const getInningsOutcomeBadge = (
    innings: LiveInnings | undefined,
    liveScore: LiveScore | null
  ): { text: string; isWinner: boolean | null; color: string; bg: string; border: string } | null => {
    if (!innings || !liveScore) return null;

    const inn1 = liveScore.innings1;
    const inn2 = liveScore.innings2;
    const calc = liveScore.calculatedResult;
    const match = liveScore.match;

    const isTargetChased = Boolean(
      (inn2 && inn1 && inn2.runs > inn1.runs) ||
      inn2?.chasingStatus?.isTargetChased ||
      liveScore.chasingStatus?.isTargetChased
    );

    const isMatchComplete = Boolean(
      liveScore.isMatchComplete ||
      calc?.isComplete ||
      match?.status === 'Completed' ||
      isTargetChased
    );

    if (!isMatchComplete) {
      return null;
    }

    const currentTeamId = innings.battingTeamId;

    // Determine winning team ID
    let winningTeamId: number | null = calc?.winningTeamId ?? match?.winningTeamId ?? null;
    if (winningTeamId == null) {
      if (isTargetChased && inn2) {
        winningTeamId = inn2.battingTeamId;
      } else if (inn1 && inn2 && inn1.runs > inn2.runs) {
        winningTeamId = inn1.battingTeamId;
      }
    }

    // Determine result type: 'runs' | 'wickets' | 'tie' | 'abandoned' | 'cancelled'
    let resultType = (calc?.resultType ?? match?.resultType ?? '').toLowerCase();
    if (!resultType || resultType === 'pending') {
      if (isTargetChased) {
        resultType = 'wickets';
      } else if (inn1 && inn2 && inn1.runs > inn2.runs) {
        resultType = 'runs';
      } else if (inn1 && inn2 && inn1.runs === inn2.runs) {
        resultType = 'tie';
      }
    }

    // Tie
    if (resultType === 'tie' || (inn1 && inn2 && inn1.runs === inn2.runs && winningTeamId == null)) {
      return {
        text: 'Match Tied',
        isWinner: null,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    }

    // Abandoned / Cancelled
    if (resultType === 'abandoned' || match?.status === 'Abandoned') {
      return {
        text: 'Match Abandoned',
        isWinner: null,
        color: '#9ca3af',
        bg: 'rgba(156, 163, 175, 0.12)',
        border: 'rgba(156, 163, 175, 0.35)',
      };
    }
    if (resultType === 'cancelled' || match?.status === 'Cancelled') {
      return {
        text: 'Match Cancelled',
        isWinner: null,
        color: '#9ca3af',
        bg: 'rgba(156, 163, 175, 0.12)',
        border: 'rgba(156, 163, 175, 0.35)',
      };
    }

    // Winning margin
    let margin: number | null = calc?.winningMargin ?? match?.winningMargin ?? null;
    if (margin == null || margin <= 0) {
      if (resultType === 'wickets' && inn2) {
        margin = Math.max(0, 10 - inn2.wickets);
      } else if (resultType === 'runs' && inn1 && inn2) {
        margin = Math.max(0, inn1.runs - inn2.runs);
      }
    }

    const isWinner = winningTeamId != null && currentTeamId === winningTeamId;

    let marginDetail = '';
    if (resultType === 'runs' && margin != null && margin > 0) {
      marginDetail = `${margin} ${margin === 1 ? 'run' : 'runs'}`;
    } else if (resultType === 'wickets' && margin != null && margin > 0) {
      marginDetail = `${margin} ${margin === 1 ? 'wicket' : 'wickets'}`;
    }

    if (isWinner) {
      return {
        text: marginDetail ? `Won by ${marginDetail}` : 'Won the match',
        isWinner: true,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.35)',
      };
    } else {
      return {
        text: marginDetail ? `Lost by ${marginDetail}` : 'Lost the match',
        isWinner: false,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
      };
    }
  };

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

  const handleOpenChangeBowler = async (isMidOver: boolean) => {
    if (!activeLiveScore || !currentInnings) return;
    try {
      setBowlerLoading(true);
      setScorecardError(null);
      setIsMidOverChange(isMidOver);
      setSelectedNewBowlerId(0);
      const data = await liveScoringApi.getEligibleBowlers(activeLiveScore.match.id, currentInnings.id);
      setEligibleBowlersData(data);
      setChangeBowlerModalOpen(true);
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to fetch eligible bowlers.');
    } finally {
      setBowlerLoading(false);
    }
  };

  const handleConfirmChangeBowler = async () => {
    if (!activeLiveScore || !currentInnings || selectedNewBowlerId === 0 || actionLoading) {
      setScorecardError('Please select an eligible bowler.');
      return;
    }
    try {
      setActionLoading(true);
      setScorecardError(null);
      let updated: LiveScore;
      if (isMidOverChange) {
        updated = await liveScoringApi.replaceBowlerInOver(activeLiveScore.match.id, currentInnings.id, selectedNewBowlerId);
      } else {
        updated = await liveScoringApi.changeBowler(activeLiveScore.match.id, currentInnings.id, selectedNewBowlerId);
      }
      setActiveLiveScore(updated);
      setChangeBowlerModalOpen(false);
      setSelectedNewBowlerId(0);
      fetchMatches();
    } catch (err: any) {
      setScorecardError(err.response?.data?.message || 'Failed to change bowler.');
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

          {canManageMatches && (
            <button
              className="btn btn-primary"
              onClick={handleOpenCreateMatch}
              disabled={!canScheduleInSelectedSeries}
              title={
                !canScheduleInSelectedSeries
                  ? currentSelectedSeries
                    ? `Series "${currentSelectedSeries.name}" is ${currentSelectedSeries.status}. Match scheduling is not allowed.`
                    : 'No active series available to schedule matches.'
                  : 'Schedule Match'
              }
              style={
                !canScheduleInSelectedSeries
                  ? { opacity: 0.55, cursor: 'not-allowed', filter: 'grayscale(0.5)' }
                  : {}
              }
            >
              {!canScheduleInSelectedSeries ? <Lock size={16} /> : <Plus size={16} />} Schedule Match
            </button>
          )}
        </div>
      </div>

      {/* Series Selection Dropdown Bar & Notification Bar */}
      <div className="series-selection-bar" style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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

        {/* Series Notification Bar */}
        <div
          className="series-notification-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            background: isSelectedSeriesCompleted
              ? 'rgba(239, 68, 68, 0.09)'
              : currentSelectedSeries?.status === 'InProgress'
              ? 'rgba(245, 158, 11, 0.09)'
              : currentSelectedSeries
              ? 'rgba(16, 185, 129, 0.09)'
              : 'rgba(59, 130, 246, 0.08)',
            border: `1px solid ${
              isSelectedSeriesCompleted
                ? 'rgba(239, 68, 68, 0.28)'
                : currentSelectedSeries?.status === 'InProgress'
                ? 'rgba(245, 158, 11, 0.28)'
                : currentSelectedSeries
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(59, 130, 246, 0.2)'
            }`,
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Series:
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {currentSelectedSeries ? (
                <>
                  <Trophy size={15} style={{ color: isSelectedSeriesCompleted ? '#10b981' : 'var(--accent-cricket)' }} />
                  {currentSelectedSeries.name}
                </>
              ) : (
                <>
                  <Layers size={15} style={{ color: '#60a5fa' }} />
                  All Series / Tournaments
                </>
              )}
            </span>

            <span style={{ color: 'var(--border-color)', margin: '0 0.1rem' }}>|</span>

            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Status:
            </span>
            {currentSelectedSeries ? (
              <span
                className={`badge ${
                  currentSelectedSeries.status === 'Completed'
                    ? 'badge-success'
                    : currentSelectedSeries.status === 'InProgress'
                    ? 'badge-warning'
                    : currentSelectedSeries.status === 'Cancelled'
                    ? 'badge-danger'
                    : 'badge-info'
                }`}
                style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
              >
                {currentSelectedSeries.status === 'Completed' && <CheckCircle size={12} />}
                {currentSelectedSeries.status === 'InProgress' && <Activity size={12} />}
                {currentSelectedSeries.status}
              </span>
            ) : (
              <span className="badge badge-info" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}>
                All Statuses
              </span>
            )}

            {currentSelectedSeries && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '5px',
                  background:
                    currentSelectedSeries.status === 'Completed'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : currentSelectedSeries.status === 'InProgress'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : currentSelectedSeries.status === 'Cancelled'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(59, 130, 246, 0.12)',
                  color:
                    currentSelectedSeries.status === 'Completed'
                      ? '#34d399'
                      : currentSelectedSeries.status === 'InProgress'
                      ? '#fbbf24'
                      : currentSelectedSeries.status === 'Cancelled'
                      ? '#f87171'
                      : '#60a5fa',
                  border:
                    currentSelectedSeries.status === 'Completed'
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : currentSelectedSeries.status === 'InProgress'
                      ? '1px solid rgba(245, 158, 11, 0.25)'
                      : currentSelectedSeries.status === 'Cancelled'
                      ? '1px solid rgba(239, 68, 68, 0.25)'
                      : '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                {currentSelectedSeries.status === 'Completed' && <CheckCircle size={12} />}
                {currentSelectedSeries.status === 'InProgress' && <Activity size={12} />}
                {currentSelectedSeries.status === 'Cancelled' && <XCircle size={12} />}
                {currentSelectedSeries.status === 'Scheduled' && <Clock size={12} />}
                {getSeriesNotificationMessage(currentSelectedSeries.status)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {currentSelectedSeries ? (
              <>
                <span>
                  Matches:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {currentSelectedSeries.completedMatches ?? 0} / {currentSelectedSeries.totalMatches ?? 0}
                  </strong>{' '}
                  Completed
                </span>
                {currentSelectedSeries.startDate && (
                  <span>
                    Duration:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(currentSelectedSeries.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      {currentSelectedSeries.endDate ? ` - ${new Date(currentSelectedSeries.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                    </strong>
                  </span>
                )}
              </>
            ) : (
              <span>
                Total Series: <strong style={{ color: 'var(--text-primary)' }}>{seriesList.length}</strong> • Total Matches: <strong style={{ color: 'var(--text-primary)' }}>{matches.length}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

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
                  {canManageMatches && m.status?.toLowerCase() === 'scheduled' && (
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
                    <span>{formatMatchResult(m.result, m.team1Name, m.team2Name)}</span>
                  </div>
                )}
                {m.momPlayerName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                    <Trophy size={14} style={{ color: '#f59e0b' }} />
                    <span>Man of the Match: <strong style={{ color: '#fbbf24' }}>{m.momPlayerName}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                {(() => {
                  const parentSeries = seriesList.find((s) => s.id === m.seriesId);
                  const pStatus = parentSeries?.status || 'Scheduled';
                  const startAllowed = canStartMatch(m.status, pStatus);
                  const liveAllowed = canLiveScore(m.status, pStatus) && canScoreLive;

                  if (m.status === 'Scheduled') {
                    return (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          style={{
                            flex: 1,
                            opacity: startAllowed ? 1 : 0.6,
                            cursor: startAllowed ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!startAllowed}
                          title={
                            !startAllowed
                              ? 'Series has not started yet. Match cannot be started.'
                              : 'Start match and launch live scoring'
                          }
                          onClick={() => handleStartMatch(m)}
                        >
                          <PlayCircle size={14} /> Start Match
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setModalTab('scorecard');
                            handleOpenScorecard(m.id);
                          }}
                          title="View Scorecard"
                        >
                          <FileText size={14} />
                        </button>
                      </>
                    );
                  }

                  if (m.status === 'InProgress') {
                    return (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          style={{
                            flex: 1,
                            opacity: liveAllowed ? 1 : 0.6,
                            cursor: liveAllowed ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!liveAllowed}
                          title={
                            pStatus !== 'InProgress'
                              ? 'Series is not in progress. Live scoring is disabled.'
                              : !canScoreLive
                              ? 'Live scoring permission required'
                              : 'Open live scoring console'
                          }
                          onClick={() => {
                            setModalTab('live');
                            handleOpenScorecard(m.id);
                          }}
                        >
                          <Activity size={14} /> Live Scoring
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setModalTab('scorecard');
                            handleOpenScorecard(m.id);
                          }}
                          title="View Scorecard"
                        >
                          <FileText size={14} />
                        </button>
                      </>
                    );
                  }

                  // Completed, Cancelled, Abandoned
                  return (
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setModalTab('scorecard');
                        handleOpenScorecard(m.id);
                      }}
                    >
                      <FileText size={14} /> View Scorecard
                    </button>
                  );
                })()}

                {canManageMatches && (
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
              disabled={Boolean(editingMatch)}
              onChange={(e) => {
                const newSeriesId = Number(e.target.value);
                const sObj = seriesList.find((s) => s.id === newSeriesId);
                const allowed = getAllowedMatchCreationStatuses(sObj?.status);
                setMatchFormData({
                  ...matchFormData,
                  seriesId: newSeriesId,
                  status: allowed.includes(matchFormData.status) ? matchFormData.status : (allowed[0] || 'Scheduled'),
                });
              }}
            >
              <option value={0}>-- Select Series --</option>
              {seriesList.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={!canAddMatchesToSeries(s.status) && editingMatch?.seriesId !== s.id}
                  style={!canAddMatchesToSeries(s.status) ? { color: '#9ca3af', fontStyle: 'italic' } : {}}
                >
                  {s.name} {!canAddMatchesToSeries(s.status) ? `(${s.status} - Locked)` : `(${s.status})`}
                </option>
              ))}
            </select>
            {matchFormData.seriesId > 0 && !canAddMatchesToSeries(seriesList.find((s) => s.id === matchFormData.seriesId)?.status) && (
              <small style={{ color: '#ef4444', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertCircle size={13} /> This series is completed or cancelled and cannot accept new matches.
              </small>
            )}
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
            <label className="form-label">
              Status {(() => {
                const parent = seriesList.find((s) => s.id === matchFormData.seriesId);
                if (editingMatch && isMatchStatusLocked(editingMatch.status, parent?.status)) {
                  return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Locked)</span>;
                }
                return null;
              })()}
            </label>
            {(() => {
              const parent = seriesList.find((s) => s.id === matchFormData.seriesId);
              const allowedStatuses = editingMatch
                ? getAllowedMatchTransitions(editingMatch.status, parent?.status)
                : getAllowedMatchCreationStatuses(parent?.status);
              const locked = editingMatch ? isMatchStatusLocked(editingMatch.status, parent?.status) : false;

              return (
                <>
                  <select
                    className="form-select"
                    value={matchFormData.status}
                    disabled={locked}
                    onChange={(e) => setMatchFormData({ ...matchFormData, status: e.target.value })}
                  >
                    {allowedStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {editingMatch && locked && (
                    <small style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                      This match status is finalized or its series is completed/cancelled and cannot be changed.
                    </small>
                  )}
                </>
              );
            })()}
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
                {/* Status Validation Warning Banner */}
                {(() => {
                  const modalSeries = seriesList.find((s) => s.id === activeLiveScore.match.seriesId);
                  const pStatus = modalSeries?.status;
                  const mStatus = activeLiveScore.match.status;
                  const liveAllowed = canLiveScore(mStatus, pStatus);

                  if (!liveAllowed) {
                    let reason = 'Live scoring is disabled.';
                    if (pStatus === 'Scheduled') {
                      reason = 'This series is Scheduled. Live scoring cannot be started until the series status is InProgress.';
                    } else if (pStatus === 'Completed') {
                      reason = 'This series is Completed. Match scorecards are finalized and locked.';
                    } else if (pStatus === 'Cancelled') {
                      reason = 'This series has been Cancelled. Live scoring is not allowed.';
                    } else if (mStatus === 'Scheduled') {
                      reason = 'This match is Scheduled. Live scoring cannot be performed until match status is changed to InProgress.';
                    } else if (mStatus === 'Completed' || mStatus === 'Cancelled' || mStatus === 'Abandoned') {
                      reason = `This match is ${mStatus}. Scorecard is locked and live scoring is closed.`;
                    }

                    return (
                      <div
                        className="alert alert-warning"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
                      >
                        <Lock size={16} />
                        <span>{reason}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

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
                  !canScoreLive ? (
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
                      disabled={
                        actionLoading ||
                        setupStrikerId === 0 ||
                        setupNonStrikerId === 0 ||
                        setupBowlerId === 0 ||
                        !canLiveScore(activeLiveScore.match.status, seriesList.find((s) => s.id === activeLiveScore.match.seriesId)?.status) ||
                        !canScoreLive
                      }
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

                    {(() => {
                      if (activeInningsTab === 1 && !activeLiveScore.innings2) {
                        return canScoreLive ? (
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
                        ) : null;
                      }

                      const outcomeBadge = getInningsOutcomeBadge(currentInnings, activeLiveScore);
                      const momName =
                        activeLiveScore.match.momPlayerName ||
                        activeLiveScore.momDetails?.selectedPlayerName;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                          {outcomeBadge ? (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontSize: '1.05rem',
                                color: outcomeBadge.color,
                                background: outcomeBadge.bg,
                                border: `1px solid ${outcomeBadge.border}`,
                                padding: '0.45rem 1.25rem',
                                borderRadius: '24px',
                                fontWeight: 700,
                                marginTop: '0.75rem',
                                letterSpacing: '0.2px',
                              }}
                            >
                              {outcomeBadge.isWinner === true && <CheckCircle size={18} />}
                              {outcomeBadge.isWinner === false && <XCircle size={18} />}
                              <span>{outcomeBadge.text}</span>
                            </div>
                          ) : activeLiveScore.matchSummary ? (
                            <div style={{ fontSize: '1rem', color: '#f59e0b', fontWeight: 600, marginTop: '0.75rem' }}>
                              {activeLiveScore.matchSummary}
                            </div>
                          ) : null}

                          {momName && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem',
                                fontSize: '0.95rem',
                                color: '#f59e0b',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '0.4rem 1.15rem',
                                borderRadius: '20px',
                                fontWeight: 600,
                              }}
                            >
                              <Trophy size={16} style={{ color: '#f59e0b' }} />
                              <span>Man of the Match: <strong style={{ color: '#fbbf24' }}>{momName}</strong></span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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

                      {/* Live Chasing Status Message (Second Innings Target Chase) */}
                      {currentInnings?.inningsNumber === 2 && currentInnings?.chasingStatus && (
                        <div
                          style={{
                            marginTop: '0.85rem',
                            padding: '0.65rem 1.25rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontWeight: 700,
                            fontSize: '1rem',
                            letterSpacing: '0.2px',
                            background: currentInnings.chasingStatus.isTargetChased
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))'
                              : currentInnings.chasingStatus.isTargetNotReached
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))'
                              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.25))',
                            border: currentInnings.chasingStatus.isTargetChased
                              ? '1px solid rgba(16, 185, 129, 0.5)'
                              : currentInnings.chasingStatus.isTargetNotReached
                              ? '1px solid rgba(239, 68, 68, 0.5)'
                              : '1px solid rgba(245, 158, 11, 0.4)',
                            color: currentInnings.chasingStatus.isTargetChased
                              ? '#34d399'
                              : currentInnings.chasingStatus.isTargetNotReached
                              ? '#f87171'
                              : '#fbbf24',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                          }}
                        >
                          <span>🔥</span>
                          <span>{currentInnings.chasingStatus.displayText}</span>
                        </div>
                      )}
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
                      {canScoreLive && (
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
                        {canScoreLive && currentInnings?.canChangeBowlerPreOver && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ marginTop: '0.6rem', width: '100%', fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                            onClick={() => handleOpenChangeBowler(false)}
                            disabled={actionLoading}
                            title="Change bowler before delivering any ball in this over"
                          >
                            <RotateCw size={12} style={{ marginRight: '4px' }} /> Change Bowler
                          </button>
                        )}
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
                        {canScoreLive ? (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Bowler: <strong style={{ color: 'var(--text-primary)' }}>{currentInnings?.currentBowler?.playerName || 'Unassigned'}</strong> • Balls in Over: {currentInnings?.currentOverDeliveries?.length || 0}
                          </span>
                          {canScoreLive && currentInnings?.canReplaceBowlerMidOver && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.55rem',
                                borderColor: 'var(--accent-cricket)',
                                color: 'var(--accent-cricket)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              onClick={() => handleOpenChangeBowler(true)}
                              disabled={actionLoading}
                              title="Complete this in-progress over with another eligible bowler"
                            >
                              <RotateCw size={11} /> Complete Over With Another Bowler
                            </button>
                          )}
                        </div>
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
                      {currentInnings?.currentOverDeliveries && Array.from(new Set(currentInnings.currentOverDeliveries.map(d => d.bowlerName))).length > 1 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.45rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                          Over shared by: {Array.from(new Set(currentInnings.currentOverDeliveries.map(d => d.bowlerName))).map((bName) => {
                            const count = currentInnings.currentOverDeliveries.filter(d => d.bowlerName === bName && d.isLegalBall).length;
                            return `${bName} (${count} legal ball${count === 1 ? '' : 's'})`;
                          }).join(' • ')}
                        </div>
                      )}
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

                    {canScoreLive && canLiveScore(activeLiveScore.match.status, seriesList.find((s) => s.id === activeLiveScore.match.seriesId)?.status) ? (
                      currentInnings?.status === 'Completed' || activeLiveScore?.isMatchComplete || currentInnings?.chasingStatus?.isTargetChased ? (
                        <div
                          style={{
                            padding: '1.25rem',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            textAlign: 'center',
                            marginTop: '1rem',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#34d399', marginBottom: '0.35rem' }}>
                            {currentInnings?.chasingStatus?.isTargetChased ? '🎉 Target Chased — Chasing Team Has Won!' : 'Innings / Match Finished'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Scoring is locked for this completed innings. Review final outcomes and player statistics in the tabs above.
                          </div>
                        </div>
                      ) : (
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
                    )
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
                        <span>
                          {!canLiveScore(activeLiveScore.match.status, seriesList.find((s) => s.id === activeLiveScore.match.seriesId)?.status)
                            ? 'Live scoring is locked. Live scoring is only permitted when both the Series and Match are InProgress.'
                            : 'Live Score Viewing Mode — Ball-by-ball scoring controls are restricted to Umpires and Administrators.'}
                        </span>
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

                {canScoreLive && !isMatchStatusLocked(activeLiveScore.match.status, seriesList.find((s) => s.id === activeLiveScore.match.seriesId)?.status) ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveOutcome}
                    disabled={actionLoading}
                  >
                    <Save size={16} /> {actionLoading ? 'Saving...' : 'Save & Finalize Match Outcome'}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {isMatchStatusLocked(activeLiveScore.match.status, seriesList.find((s) => s.id === activeLiveScore.match.seriesId)?.status)
                      ? 'Match outcome has been finalized. Scorecard is locked.'
                      : 'Match outcome can only be finalized with live scoring permission.'}
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

      {/* Change / Replace Bowler Modal (Scenario A & Scenario B) */}
      <Modal
        isOpen={changeBowlerModalOpen}
        onClose={() => setChangeBowlerModalOpen(false)}
        title={isMidOverChange ? 'Complete In-Progress Over With Another Bowler' : 'Change Current Bowler'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setChangeBowlerModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmChangeBowler}
              disabled={actionLoading || selectedNewBowlerId === 0}
            >
              {isMidOverChange ? 'Continue Over With New Bowler' : 'Confirm Bowler'}
            </button>
          </div>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          {bowlerLoading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              Checking bowler eligibility...
            </div>
          ) : (
            <>
              {isMidOverChange ? (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(59, 130, 246, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    In-Progress Over: Over {eligibleBowlersData?.currentOverNumber || currentInnings?.currentOverNumber || 1}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Current Bowler: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{eligibleBowlersData?.currentBowlerName || currentInnings?.currentBowler?.playerName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Completed in Over: </span>
                      <strong style={{ color: '#34d399' }}>{eligibleBowlersData?.legalBallsBowledInOver || 0}/6 legal balls</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Remaining: </span>
                      <strong style={{ color: '#fbbf24' }}>{6 - (eligibleBowlersData?.legalBallsBowledInOver || 0)} balls</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                    The replacement bowler will finish the remaining balls of this over. Previous deliveries and bowling figures remain with the original bowler.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Pre-Over Bowler Update
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Currently selected bowler: <strong style={{ color: 'var(--accent-cricket)' }}>{eligibleBowlersData?.currentBowlerName || currentInnings?.currentBowler?.playerName}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    No balls have been delivered in this over yet (0 balls, 0 legal deliveries, 0 runs).
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Select {isMidOverChange ? 'Replacement' : 'New'} Bowler *
                </label>
                <select
                  className="form-select"
                  value={selectedNewBowlerId}
                  onChange={(e) => setSelectedNewBowlerId(Number(e.target.value))}
                >
                  <option value={0}>-- Select Eligible Bowler --</option>
                  {eligibleBowlersData?.eligibleBowlers
                    ?.filter((b) => b.isEligible)
                    .map((b) => (
                      <option key={b.playerId} value={b.playerId}>
                        {b.playerName} ({b.playerCategory}) • {b.oversDisplay} ov, {b.runsConceded}R, {b.wickets}W
                      </option>
                    ))}
                </select>
              </div>

              {eligibleBowlersData?.eligibleBowlers?.some((b) => !b.isEligible) && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ineligible: {eligibleBowlersData.eligibleBowlers.filter(b => !b.isEligible).map(b => `${b.playerName} (${b.ineligibilityReason})`).join(', ')}
                </div>
              )}
            </>
          )}
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
