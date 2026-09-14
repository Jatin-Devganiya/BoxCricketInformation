import {
  STORAGE_KEYS,
  EntityId,
  DbMatch,
  DbMatchInnings,
  DbBallEvent,
  DbDismissal,
  DbMatchExtra,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
  DbTeam,
  DbPlayer,
  DbTeamPlayer,
} from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import {
  LiveScore,
  LiveInnings,
  LiveBatsman,
  LiveBowler,
  BallEventItem,
  EligibleBowlersResponse,
  EligibleBowlerItem,
  ChasingStatus,
  StartInningsPayload,
  RecordBallPayload,
  RecordWicketPayload,
  BattingRecord,
  BowlingRecord,
} from '../../types';
import { toCricketOvers, calculateStrikeRate, calculateEconomyRate, calculateHatTricks } from '../cricketCalculations';
import { calculateMatchResult } from '../matchResultCalculator';
import { calculateManOfTheMatch } from '../manOfTheMatchCalculator';
import { localMatchesService } from './localMatchesService';

const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);
const inningsRepo = new LocalStorageRepository<DbMatchInnings>(STORAGE_KEYS.MATCH_INNINGS);
const ballEventRepo = new LocalStorageRepository<DbBallEvent>(STORAGE_KEYS.BALL_EVENTS);
const dismissalRepo = new LocalStorageRepository<DbDismissal>(STORAGE_KEYS.DISMISSALS);
const extraRepo = new LocalStorageRepository<DbMatchExtra>(STORAGE_KEYS.MATCH_EXTRAS);
const battingRepo = new LocalStorageRepository<DbMatchBattingPerformance>(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES);
const bowlingRepo = new LocalStorageRepository<DbMatchBowlingPerformance>(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES);
const teamRepo = new LocalStorageRepository<DbTeam>(STORAGE_KEYS.TEAMS);
const playerRepo = new LocalStorageRepository<DbPlayer>(STORAGE_KEYS.PLAYERS);
const teamPlayerRepo = new LocalStorageRepository<DbTeamPlayer>(STORAGE_KEYS.TEAM_PLAYERS);

export const localLiveScoringService = {
  getLiveScore: async (matchId: number | string): Promise<LiveScore> => {
    const match = await localMatchesService.getById(matchId);
    const dbMatch = matchRepo.getById(matchId);
    if (!dbMatch) throw new Error('Match not found');

    const inningsList = inningsRepo.find((i) => String(i.matchId) === String(matchId));
    const inn1 = inningsList.find((i) => i.inningsNumber === 1);
    const inn2 = inningsList.find((i) => i.inningsNumber === 2);

    const teams = teamRepo.getAll();
    const players = playerRepo.getAll();
    const teamPlayers = teamPlayerRepo.getAll();
    const teamsMap = new Map<string, DbTeam>();
    for (const t of teams) teamsMap.set(String(t.id), t);

    const buildLiveInnings = (inn?: DbMatchInnings): LiveInnings | undefined => {
      if (!inn) return undefined;

      const battingTeam = teams.find((t) => String(t.id) === String(inn.teamId));
      const bowlingTeamId = String(dbMatch.team1Id) === String(inn.teamId) ? dbMatch.team2Id : dbMatch.team1Id;
      const bowlingTeam = teams.find((t) => String(t.id) === String(bowlingTeamId));

      const events = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id));
      const batting = battingRepo.find((b) => String(b.matchInningsId) === String(inn.id));
      const bowling = bowlingRepo.find((b) => String(b.matchInningsId) === String(inn.id));

      const legalBalls = inn.balls || 0;
      const oversDisplay = toCricketOvers(legalBalls);
      const currentOverNumber = Math.floor(legalBalls / 6) + 1;
      const currentOverLegalBalls = legalBalls % 6;
      const isOverComplete = legalBalls > 0 && legalBalls % 6 === 0;

      // Current over deliveries
      const currentOverEvents = events.filter((e) => e.overNumber === currentOverNumber);

      const allDeliveries: BallEventItem[] = events.map((e) => {
        const striker = players.find((p) => String(p.id) === String(e.strikerPlayerId));
        const nonStriker = players.find((p) => String(p.id) === String(e.nonStrikerPlayerId));
        const bowler = players.find((p) => String(p.id) === String(e.bowlerPlayerId));
        const dismissed = e.dismissedPlayerId ? players.find((p) => String(p.id) === String(e.dismissedPlayerId)) : null;
        const fielder = e.fielderPlayerId ? players.find((p) => String(p.id) === String(e.fielderPlayerId)) : null;

        let displayText = `${e.runs}`;
        if (e.isWicket) displayText = 'W';
        else if (e.eventType === 'Wide') displayText = e.runs > 1 ? `${e.runs}wd` : 'wd';
        else if (e.eventType === 'NoBall') displayText = e.runs > 1 ? `${e.runs}nb` : 'nb';
        else if (e.eventType === 'LegBye') displayText = `${e.runs}lb`;
        else if (e.eventType === 'DeadBall') displayText = 'db';

        return {
          id: e.id as any,
          overNumber: e.overNumber,
          ballNumber: e.ballNumber,
          deliveryNumber: e.deliveryNumber,
          strikerPlayerId: e.strikerPlayerId as any,
          strikerName: striker ? `${striker.firstName} ${striker.lastName}` : 'Striker',
          nonStrikerPlayerId: e.nonStrikerPlayerId as any,
          nonStrikerName: nonStriker ? `${nonStriker.firstName} ${nonStriker.lastName}` : 'Non-Striker',
          bowlerPlayerId: e.bowlerPlayerId as any,
          bowlerName: bowler ? `${bowler.firstName} ${bowler.lastName}` : 'Bowler',
          eventType: e.eventType,
          runs: e.runs,
          batRuns: e.batRuns,
          extraRuns: e.extraRuns,
          extraType: e.extraType,
          isLegalBall: e.isLegalBall,
          isWicket: e.isWicket,
          wicketType: e.wicketType || undefined,
          dismissedPlayerId: e.dismissedPlayerId ? (e.dismissedPlayerId as any) : undefined,
          dismissedPlayerName: dismissed ? `${dismissed.firstName} ${dismissed.lastName}` : undefined,
          fielderPlayerId: e.fielderPlayerId ? (e.fielderPlayerId as any) : undefined,
          fielderPlayerName: fielder ? `${fielder.firstName} ${fielder.lastName}` : undefined,
          bowlerCreditedWicket: e.bowlerCreditedWicket,
          displayText,
          createdAt: e.createdAt,
        };
      });

      const currentOverDeliveries = allDeliveries.filter((e) => e.overNumber === currentOverNumber);

      // Current striker & non-striker
      let striker: LiveBatsman | undefined;
      if (inn.currentStrikerId) {
        const bp = batting.find((b) => String(b.playerId) === String(inn.currentStrikerId));
        const p = players.find((pl) => String(pl.id) === String(inn.currentStrikerId));
        const r = bp?.runs || 0;
        const bf = bp?.ballsFaced || 0;
        striker = {
          playerId: inn.currentStrikerId as any,
          playerName: p ? `${p.firstName} ${p.lastName}` : 'Striker',
          runs: r,
          ballsFaced: bf,
          fours: bp?.fours || 0,
          sixes: bp?.sixes || 0,
          dotBalls: bp?.dotBalls || 0,
          ones: bp?.ones || 0,
          twos: bp?.twos || 0,
          threes: bp?.threes || 0,
          strikeRate: calculateStrikeRate(r, bf),
          isStriker: true,
        };
      }

      let nonStriker: LiveBatsman | undefined;
      if (inn.currentNonStrikerId) {
        const bp = batting.find((b) => String(b.playerId) === String(inn.currentNonStrikerId));
        const p = players.find((pl) => String(pl.id) === String(inn.currentNonStrikerId));
        const r = bp?.runs || 0;
        const bf = bp?.ballsFaced || 0;
        nonStriker = {
          playerId: inn.currentNonStrikerId as any,
          playerName: p ? `${p.firstName} ${p.lastName}` : 'Non-Striker',
          runs: r,
          ballsFaced: bf,
          fours: bp?.fours || 0,
          sixes: bp?.sixes || 0,
          dotBalls: bp?.dotBalls || 0,
          ones: bp?.ones || 0,
          twos: bp?.twos || 0,
          threes: bp?.threes || 0,
          strikeRate: calculateStrikeRate(r, bf),
          isStriker: false,
        };
      }

      // Current bowler
      let currentBowler: LiveBowler | undefined;
      if (inn.currentBowlerId) {
        const bowl = bowling.find((b) => String(b.playerId) === String(inn.currentBowlerId));
        const p = players.find((pl) => String(pl.id) === String(inn.currentBowlerId));
        const bb = bowl?.ballsBowled || 0;
        const rc = bowl?.runsConceded || 0;
        currentBowler = {
          playerId: inn.currentBowlerId as any,
          playerName: p ? `${p.firstName} ${p.lastName}` : 'Bowler',
          ballsBowled: bb,
          oversDisplay: toCricketOvers(bb),
          runsConceded: rc,
          wickets: bowl?.wickets || 0,
          maidenOvers: bowl?.maidenOvers || 0,
          hatTricks: bowl?.hatTricks || 0,
          wides: bowl?.wides || 0,
          noBalls: bowl?.noBalls || 0,
          economyRate: calculateEconomyRate(rc, bb),
        };
      }

      // Previous bowler
      let previousBowlerId: any;
      let previousBowlerName: string | undefined;
      if (currentOverNumber > 1) {
        const prevOverBalls = events.filter((e) => e.overNumber === currentOverNumber - 1);
        if (prevOverBalls.length > 0) {
          previousBowlerId = prevOverBalls[prevOverBalls.length - 1].bowlerPlayerId;
          const pb = players.find((pl) => String(pl.id) === String(previousBowlerId));
          if (pb) previousBowlerName = `${pb.firstName} ${pb.lastName}`;
        }
      }

      // Batting / Bowling records for scorecard tabs
      const battingPerformances: BattingRecord[] = batting.map((bp) => {
        const p = players.find((pl) => String(pl.id) === String(bp.playerId));
        return {
          id: bp.id as any,
          playerId: bp.playerId as any,
          playerName: p ? `${p.firstName} ${p.lastName}` : 'Batsman',
          runs: bp.runs || 0,
          ballsFaced: bp.ballsFaced || 0,
          fours: bp.fours || 0,
          sixes: bp.sixes || 0,
          dotBalls: bp.dotBalls || 0,
          ones: bp.ones || 0,
          twos: bp.twos || 0,
          threes: bp.threes || 0,
          fives: bp.fives || 0,
          sixRunBalls: bp.sixRunBalls || 0,
          isOut: bp.isOut || false,
          dismissalType: bp.dismissalType || undefined,
          bowled: bp.bowled || false,
          sixInRowCount: bp.sixInRowCount || 0,
          fourInRowCount: bp.fourInRowCount || 0,
          strikeRate: calculateStrikeRate(bp.runs || 0, bp.ballsFaced || 0),
        };
      });

      const bowlingPerformances: BowlingRecord[] = bowling.map((bowl) => {
        const p = players.find((pl) => String(pl.id) === String(bowl.playerId));
        return {
          id: bowl.id as any,
          playerId: bowl.playerId as any,
          playerName: p ? `${p.firstName} ${p.lastName}` : 'Bowler',
          ballsBowled: bowl.ballsBowled || 0,
          oversDisplay: toCricketOvers(bowl.ballsBowled || 0),
          runsConceded: bowl.runsConceded || 0,
          wickets: bowl.wickets || 0,
          maidenOvers: bowl.maidenOvers || 0,
          hatTricks: bowl.hatTricks || 0,
          wides: bowl.wides || 0,
          noBalls: bowl.noBalls || 0,
          economyRate: calculateEconomyRate(bowl.runsConceded || 0, bowl.ballsBowled || 0),
        };
      });

      const overs = legalBalls / 6.0;
      const currentRunRate = overs > 0 ? Math.round(((inn.runs || 0) / overs) * 100) / 100 : 0.0;

      const requiresNewBatsman = (!inn.currentStrikerId || !inn.currentNonStrikerId) && (inn.wickets || 0) < 10 && inn.status === 'InProgress';

      return {
        id: inn.id as any,
        matchId: inn.matchId as any,
        inningsNumber: inn.inningsNumber,
        currentOverNumber,
        battingTeamId: inn.teamId as any,
        battingTeamName: battingTeam ? battingTeam.name : 'Team',
        battingTeamShortName: battingTeam ? battingTeam.shortName : 'T',
        bowlingTeamId: bowlingTeamId as any,
        bowlingTeamName: bowlingTeam ? bowlingTeam.name : 'Opponent',
        bowlingTeamShortName: bowlingTeam ? bowlingTeam.shortName : 'OPP',
        runs: inn.runs || 0,
        wickets: inn.wickets || 0,
        legalBalls,
        oversDisplay,
        extras: inn.extras || 0,
        status: inn.status || 'Scheduled',
        currentRunRate,
        striker,
        nonStriker,
        currentBowler,
        previousBowlerId,
        previousBowlerName,
        isOverComplete,
        requiresNewBatsman,
        canChangeBowlerPreOver: currentOverDeliveries.length === 0,
        canReplaceBowlerMidOver: currentOverDeliveries.length > 0 && currentOverLegalBalls < 6,
        currentOverLegalBalls,
        currentOverDeliveriesCount: currentOverEvents.length,
        currentOverDeliveries,
        allDeliveries,
        battingPerformances,
        bowlingPerformances,
      };
    };

    const liveInn1 = buildLiveInnings(inn1);
    const liveInn2 = buildLiveInnings(inn2);

    let activeInningsNumber = 1;
    let currentInnings = liveInn1;

    if (inn2 && inn2.status === 'InProgress') {
      activeInningsNumber = 2;
      currentInnings = liveInn2;
    } else if (inn1 && inn1.status === 'Completed' && (!inn2 || inn2.status === 'Scheduled')) {
      activeInningsNumber = 2;
      currentInnings = liveInn2;
    }

    // Chasing status if innings 2 exists
    let chasingStatus: ChasingStatus | null = null;
    if (inn2 && inn1) {
      const target = (inn1.runs || 0) + 1;
      const currentRuns = inn2.runs || 0;
      const runsToWin = target - currentRuns;
      const totalLegalBalls = (dbMatch.requiredOvers || 6) * 6;
      const ballsLeft = Math.max(0, totalLegalBalls - (inn2.balls || 0));
      const isTargetChased = currentRuns >= target;
      const isTargetNotReached = ballsLeft <= 0 && runsToWin > 0;

      let displayText = `${ballsLeft} Balls Left • ${runsToWin} Runs to Win`;
      if (isTargetChased) displayText = 'Target Chased';
      else if (isTargetNotReached) displayText = 'Target Not Reached';

      chasingStatus = {
        target,
        currentRuns,
        runsToWin,
        totalLegalBalls,
        legalBallsBowled: inn2.balls || 0,
        ballsLeft,
        displayText,
        isTargetChased,
        isTargetNotReached,
        isActive: inn2.status === 'InProgress' && !isTargetChased && !isTargetNotReached,
      };
    }

    // Calculated Match Result
    const calcResult = calculateMatchResult(dbMatch, inningsList, teamsMap);

    // Man of the Match details
    const allBatting = battingRepo.getAll();
    const allBowling = bowlingRepo.getAll();
    const matchBatting = allBatting.filter((b) => inningsList.some((i) => String(i.id) === String(b.matchInningsId)));
    const matchBowling = allBowling.filter((b) => inningsList.some((i) => String(i.id) === String(b.matchInningsId)));
    const momDetails = calculateManOfTheMatch(dbMatch, players, teamPlayers, teamsMap, matchBatting, matchBowling);

    return {
      match,
      activeInningsNumber,
      innings1: liveInn1,
      innings2: liveInn2,
      currentInnings,
      isInningsComplete: currentInnings?.status === 'Completed',
      isMatchComplete: dbMatch.status === 'Completed',
      matchSummary: calcResult.summary || dbMatch.result || undefined,
      chasingStatus,
      momDetails,
      calculatedResult: calcResult,
    };
  },

  startInnings: async (matchId: number | string, payload: StartInningsPayload): Promise<LiveScore> => {
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const now = new Date().toISOString();
    let inn = inningsRepo.findOne(
      (i) => String(i.matchId) === String(matchId) && i.inningsNumber === payload.inningsNumber
    );

    if (!inn) {
      inn = inningsRepo.create({
        matchId,
        teamId: payload.battingTeamId,
        inningsNumber: payload.inningsNumber,
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: 0,
        status: 'InProgress',
        currentStrikerId: payload.strikerPlayerId,
        currentNonStrikerId: payload.nonStrikerPlayerId,
        currentBowlerId: payload.bowlerPlayerId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      inningsRepo.update(inn.id, {
        teamId: payload.battingTeamId,
        status: 'InProgress',
        currentStrikerId: payload.strikerPlayerId,
        currentNonStrikerId: payload.nonStrikerPlayerId,
        currentBowlerId: payload.bowlerPlayerId,
        updatedAt: now,
      });
    }

    // Set match status to InProgress
    matchRepo.update(matchId, { status: 'InProgress', updatedAt: now });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  recordBall: async (matchId: number | string, inningsId: number | string, payload: RecordBallPayload): Promise<LiveScore> => {
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    if (inn.status !== 'InProgress') {
      throw new Error('Innings is not in progress.');
    }

    if (!inn.currentStrikerId || !inn.currentNonStrikerId || !inn.currentBowlerId) {
      throw new Error('Striker, Non-Striker, and Bowler must all be set before recording a ball.');
    }

    // Check if over is complete and requires bowler rotation
    if (inn.balls > 0 && inn.balls % 6 === 0) {
      const completedOverNum = Math.floor(inn.balls / 6);
      const events = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id));
      const lastBall = events[events.length - 1];
      if (lastBall && lastBall.overNumber === completedOverNum && String(inn.currentBowlerId) === String(lastBall.bowlerPlayerId)) {
        throw new Error('Current over is complete. Please select the next bowler before scoring.');
      }
    }

    const eventType = payload.eventType || 'Normal';
    let isLegalBall = !(eventType === 'NoBall' || eventType === 'Wide' || eventType === 'DeadBall');
    let batRuns = 0;
    let extraRuns = 0;
    let extraType = 'None';

    switch (eventType) {
      case 'Normal':
        batRuns = payload.runs || 0;
        extraRuns = 0;
        extraType = 'None';
        break;
      case 'Wide':
        batRuns = 0;
        extraRuns = (payload.extraRuns || 0) > 0 ? payload.extraRuns! : (payload.runs || 0) > 0 ? payload.runs! : 1;
        extraType = 'Wide';
        isLegalBall = false;
        break;
      case 'NoBall':
        batRuns = payload.batRuns || 0;
        extraRuns = (payload.extraRuns || 0) > 0 ? payload.extraRuns! : 1;
        extraType = 'NoBall';
        isLegalBall = false;
        break;
      case 'LegBye':
        batRuns = 0;
        extraRuns = (payload.runs || 0) > 0 ? payload.runs! : 1;
        extraType = 'LegBye';
        isLegalBall = true;
        break;
      case 'DeadBall':
        batRuns = 0;
        extraRuns = 0;
        extraType = 'None';
        isLegalBall = false;
        break;
      default:
        batRuns = payload.runs || 0;
        extraRuns = 0;
        extraType = 'None';
        break;
    }

    const totalDeliveryRuns = batRuns + extraRuns;
    const currentOverNumber = Math.floor((inn.balls || 0) / 6) + 1;
    const existingOverEvents = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id) && b.overNumber === currentOverNumber);
    const deliveryNumberInOver = existingOverEvents.length + 1;
    const legalBallNumberInOver = isLegalBall ? ((inn.balls || 0) % 6) + 1 : (inn.balls || 0) % 6;

    const newBalls = isLegalBall ? (inn.balls || 0) + 1 : inn.balls || 0;
    const newRuns = (inn.runs || 0) + totalDeliveryRuns;
    const newExtras = (inn.extras || 0) + extraRuns;

    const now = new Date().toISOString();
    const ballEvent = ballEventRepo.create({
      matchId,
      inningsId: inn.id,
      overNumber: currentOverNumber,
      ballNumber: legalBallNumberInOver,
      deliveryNumber: deliveryNumberInOver,
      strikerPlayerId: inn.currentStrikerId,
      nonStrikerPlayerId: inn.currentNonStrikerId,
      bowlerPlayerId: inn.currentBowlerId,
      eventType,
      runs: totalDeliveryRuns,
      batRuns,
      extraRuns,
      extraType,
      isLegalBall,
      isWicket: false,
      bowlerCreditedWicket: false,
      createdAt: now,
    });

    if (extraRuns > 0) {
      extraRepo.create({
        matchId,
        inningsId: inn.id,
        ballEventId: ballEvent.id,
        extraType,
        runs: extraRuns,
        createdAt: now,
      });
    }

    // Strike rotation on odd runs
    let strikerId = inn.currentStrikerId;
    let nonStrikerId = inn.currentNonStrikerId;
    const runsForRotation = eventType === 'LegBye' ? extraRuns : batRuns;

    if (runsForRotation % 2 !== 0) {
      const temp = strikerId;
      strikerId = nonStrikerId;
      nonStrikerId = temp;
    }

    // End of over strike rotation: at 6 legal balls, batsmen switch ends
    if (isLegalBall && newBalls % 6 === 0) {
      const temp = strikerId;
      strikerId = nonStrikerId;
      nonStrikerId = temp;
    }

    inningsRepo.update(inn.id, {
      runs: newRuns,
      balls: newBalls,
      extras: newExtras,
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      updatedAt: now,
    });

    // Check completion & sync performances
    await localLiveScoringService.checkInningsAndMatchCompletion(match, inningsRepo.getById(inn.id)!);
    await localLiveScoringService.syncPerformancesFromEvents(inn.id);

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  recordWicket: async (matchId: number | string, inningsId: number | string, payload: RecordWicketPayload): Promise<LiveScore> => {
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    if (inn.status !== 'InProgress') {
      throw new Error('Innings is not in progress.');
    }

    if (!inn.currentStrikerId || !inn.currentNonStrikerId || !inn.currentBowlerId) {
      throw new Error('Striker, Non-Striker, and Bowler must all be set before recording a wicket.');
    }

    if (
      String(payload.dismissedPlayerId) !== String(inn.currentStrikerId) &&
      String(payload.dismissedPlayerId) !== String(inn.currentNonStrikerId)
    ) {
      throw new Error('Dismissed batsman must be currently at the crease (Striker or Non-Striker).');
    }

    const bowlerCredited = payload.wicketType !== 'RunOut';
    const runs = payload.runsScored || 0;
    const currentOverNumber = Math.floor((inn.balls || 0) / 6) + 1;
    const existingOverEvents = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id) && b.overNumber === currentOverNumber);
    const deliveryNumberInOver = existingOverEvents.length + 1;
    const legalBallNumberInOver = ((inn.balls || 0) % 6) + 1;

    const newBalls = (inn.balls || 0) + 1;
    const newWickets = (inn.wickets || 0) + 1;
    const newRuns = (inn.runs || 0) + runs;

    const now = new Date().toISOString();
    const ballEvent = ballEventRepo.create({
      matchId,
      inningsId: inn.id,
      overNumber: currentOverNumber,
      ballNumber: legalBallNumberInOver,
      deliveryNumber: deliveryNumberInOver,
      strikerPlayerId: inn.currentStrikerId,
      nonStrikerPlayerId: inn.currentNonStrikerId,
      bowlerPlayerId: inn.currentBowlerId,
      eventType: 'Wicket',
      runs,
      batRuns: payload.wicketType === 'RunOut' ? runs : 0,
      extraRuns: 0,
      extraType: 'None',
      isLegalBall: true,
      isWicket: true,
      wicketType: payload.wicketType,
      dismissedPlayerId: payload.dismissedPlayerId,
      fielderPlayerId: payload.fielderPlayerId || null,
      bowlerCreditedWicket: bowlerCredited,
      createdAt: now,
    });

    dismissalRepo.create({
      matchId,
      inningsId: inn.id,
      ballEventId: ballEvent.id,
      dismissedPlayerId: payload.dismissedPlayerId,
      wicketType: payload.wicketType,
      bowlerId: inn.currentBowlerId,
      fielderId: payload.fielderPlayerId || null,
      catcherId: payload.wicketType === 'Caught' ? payload.fielderPlayerId || null : null,
      stumpingPlayerId: payload.wicketType === 'Stumped' ? payload.fielderPlayerId || null : null,
      runOutFielderId: payload.wicketType === 'RunOut' ? payload.fielderPlayerId || null : null,
      createdAt: now,
    });

    // Vacate crease for dismissed batsman
    let strikerId: EntityId | null | undefined = inn.currentStrikerId;
    let nonStrikerId: EntityId | null | undefined = inn.currentNonStrikerId;

    if (String(payload.dismissedPlayerId) === String(inn.currentStrikerId)) {
      strikerId = null;
    } else {
      nonStrikerId = null;
    }

    // If over completed on this wicket ball
    if (newBalls % 6 === 0) {
      if (nonStrikerId) {
        strikerId = nonStrikerId;
        nonStrikerId = null;
      }
    }

    inningsRepo.update(inn.id, {
      runs: newRuns,
      balls: newBalls,
      wickets: newWickets,
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      updatedAt: now,
    });

    await localLiveScoringService.checkInningsAndMatchCompletion(match, inningsRepo.getById(inn.id)!);
    await localLiveScoringService.syncPerformancesFromEvents(inn.id);

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  selectNewBatsman: async (
    matchId: number | string,
    inningsId: number | string,
    newBatsmanPlayerId: number | string
  ): Promise<LiveScore> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const alreadyOut = ballEventRepo.exists(
      (b) => String(b.inningsId) === String(inn.id) && b.isWicket && String(b.dismissedPlayerId) === String(newBatsmanPlayerId)
    );
    if (alreadyOut) {
      throw new Error('Selected batsman has already been dismissed.');
    }

    if (
      String(inn.currentStrikerId) === String(newBatsmanPlayerId) ||
      String(inn.currentNonStrikerId) === String(newBatsmanPlayerId)
    ) {
      throw new Error('Selected batsman is already currently batting.');
    }

    const now = new Date().toISOString();
    if (!inn.currentStrikerId) {
      inningsRepo.update(inn.id, { currentStrikerId: newBatsmanPlayerId, updatedAt: now });
    } else {
      inningsRepo.update(inn.id, { currentNonStrikerId: newBatsmanPlayerId, updatedAt: now });
    }

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  nextOver: async (
    matchId: number | string,
    inningsId: number | string,
    nextBowlerPlayerId: number | string
  ): Promise<LiveScore> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const events = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id));
    const currentOverNumber = Math.floor((inn.balls || 0) / 6);
    const lastOverBalls = events.filter((e) => e.overNumber === currentOverNumber);

    if (lastOverBalls.length > 0) {
      const prevBowler = lastOverBalls[lastOverBalls.length - 1].bowlerPlayerId;
      if (String(prevBowler) === String(nextBowlerPlayerId)) {
        throw new Error('Bowler cannot bowl two consecutive overs.');
      }
    }

    const now = new Date().toISOString();
    inningsRepo.update(inn.id, { currentBowlerId: nextBowlerPlayerId, updatedAt: now });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  completeInnings: async (matchId: number | string, inningsId: number | string): Promise<LiveScore> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const now = new Date().toISOString();
    inningsRepo.update(inn.id, { status: 'Completed', updatedAt: now });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  completeMatch: async (
    matchId: number | string,
    payload: { winningTeamId?: number | string; result?: string; momPlayerId?: number | string }
  ): Promise<LiveScore> => {
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const now = new Date().toISOString();
    const inningsList = inningsRepo.find((i) => String(i.matchId) === String(matchId));
    for (const inn of inningsList) {
      if (inn.status !== 'Completed') {
        inningsRepo.update(inn.id, { status: 'Completed', updatedAt: now });
      }
    }

    matchRepo.update(matchId, {
      status: 'Completed',
      winningTeamId: payload.winningTeamId || match.winningTeamId,
      result: payload.result || match.result,
      momPlayerId: payload.momPlayerId || match.momPlayerId,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  getEligibleBowlers: async (matchId: number | string, inningsId: number | string): Promise<EligibleBowlersResponse> => {
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const bowlingTeamId = String(match.team1Id) === String(inn.teamId) ? match.team2Id : match.team1Id;
    const rosters = teamPlayerRepo.find((tp) => String(tp.teamId) === String(bowlingTeamId) && tp.status === 'Active');
    const players = playerRepo.getAll();

    let bowlingPlayers = rosters.map((r) => players.find((p) => String(p.id) === String(r.playerId))).filter(Boolean) as DbPlayer[];
    if (bowlingPlayers.length === 0) {
      bowlingPlayers = players.filter((p) => p.status === 'Active');
    }

    const events = ballEventRepo.find((b) => String(b.inningsId) === String(inn.id));
    const legalBallsInOver = (inn.balls || 0) % 6;
    const currentOverNumber = Math.floor((inn.balls || 0) / 6) + 1;
    const currentOverEvents = events.filter((e) => e.overNumber === currentOverNumber);
    const isMidOver = currentOverEvents.length > 0 && legalBallsInOver < 6;

    let prevOverBowlerId: any = null;
    if (currentOverNumber > 1) {
      const prevOverBalls = events.filter((e) => e.overNumber === currentOverNumber - 1);
      if (prevOverBalls.length > 0) {
        prevOverBowlerId = prevOverBalls[prevOverBalls.length - 1].bowlerPlayerId;
      }
    }

    let currentBowlerName = 'Unassigned';
    if (inn.currentBowlerId) {
      const cb = players.find((p) => String(p.id) === String(inn.currentBowlerId));
      if (cb) currentBowlerName = `${cb.firstName} ${cb.lastName}`;
    }

    const list: EligibleBowlerItem[] = bowlingPlayers.map((p) => {
      const pEvents = events.filter((e) => String(e.bowlerPlayerId) === String(p.id));
      const legalBalls = pEvents.filter((e) => e.isLegalBall).length;
      const runs = pEvents.reduce(
        (acc, e) => acc + (e.batRuns || 0) + (e.extraType === 'Wide' || e.extraType === 'NoBall' ? e.extraRuns || 0 : 0),
        0
      );
      const wkts = pEvents.filter((e) => e.isWicket && e.bowlerCreditedWicket).length;

      let isEligible = true;
      let reason: string | undefined;

      if (inn.currentBowlerId && String(p.id) === String(inn.currentBowlerId)) {
        isEligible = false;
        reason = 'Current Bowler';
      } else if (prevOverBowlerId && String(p.id) === String(prevOverBowlerId)) {
        isEligible = false;
        reason = 'Bowled Previous Over';
      }

      return {
        playerId: p.id as any,
        playerName: `${p.firstName} ${p.lastName}`,
        playerCategory: p.playerCategory,
        legalBallsBowled: legalBalls,
        oversDisplay: toCricketOvers(legalBalls),
        runsConceded: runs,
        wickets: wkts,
        isEligible,
        ineligibilityReason: reason,
      };
    });

    list.sort((a, b) => {
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
      return a.playerName.localeCompare(b.playerName);
    });

    return {
      currentBowlerId: (inn.currentBowlerId || 0) as any,
      currentBowlerName,
      currentOverNumber,
      legalBallsBowledInOver: legalBallsInOver,
      totalDeliveriesInOver: currentOverEvents.length,
      isMidOver,
      eligibleBowlers: list,
    };
  },

  changeBowler: async (
    matchId: number | string,
    inningsId: number | string,
    newBowlerPlayerId: number | string
  ): Promise<LiveScore> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const now = new Date().toISOString();
    inningsRepo.update(inn.id, { currentBowlerId: newBowlerPlayerId, updatedAt: now });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  replaceBowlerInOver: async (
    matchId: number | string,
    inningsId: number | string,
    newBowlerPlayerId: number | string
  ): Promise<LiveScore> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) throw new Error('Innings not found');

    const now = new Date().toISOString();
    inningsRepo.update(inn.id, { currentBowlerId: newBowlerPlayerId, updatedAt: now });

    LocalStorageDataStore.rebuildIndexes();
    return await localLiveScoringService.getLiveScore(matchId);
  },

  checkInningsAndMatchCompletion: async (match: DbMatch, inn: DbMatchInnings): Promise<void> => {
    const maxLegalBalls = (match.requiredOvers || 6) * 6;
    const now = new Date().toISOString();

    if (inn.inningsNumber === 1) {
      if ((inn.balls || 0) >= maxLegalBalls || (inn.wickets || 0) >= 10) {
        inningsRepo.update(inn.id, { status: 'Completed', updatedAt: now });
      }
    } else if (inn.inningsNumber === 2) {
      const inn1 = inningsRepo.findOne((i) => String(i.matchId) === String(match.id) && i.inningsNumber === 1);
      if (inn1) {
        let matchFinished = false;
        if ((inn.runs || 0) > (inn1.runs || 0)) {
          inningsRepo.update(inn.id, { status: 'Completed', updatedAt: now });
          matchFinished = true;
        } else if ((inn.balls || 0) >= maxLegalBalls || (inn.wickets || 0) >= 10) {
          inningsRepo.update(inn.id, { status: 'Completed', updatedAt: now });
          matchFinished = true;
        }

        if (matchFinished) {
          const allInnings = inningsRepo.find((i) => String(i.matchId) === String(match.id));
          const teams = teamRepo.getAll();
          const teamsMap = new Map<string, DbTeam>();
          for (const t of teams) teamsMap.set(String(t.id), t);

          const calcResult = calculateMatchResult(match, allInnings, teamsMap);

          // Calculate MOM
          const players = playerRepo.getAll();
          const teamPlayers = teamPlayerRepo.getAll();
          const matchBatting = battingRepo.find((b) => allInnings.some((i) => String(i.id) === String(b.matchInningsId)));
          const matchBowling = bowlingRepo.find((b) => allInnings.some((i) => String(i.id) === String(b.matchInningsId)));
          const momResult = calculateManOfTheMatch(match, players, teamPlayers, teamsMap, matchBatting, matchBowling);

          matchRepo.update(match.id, {
            status: 'Completed',
            result: calcResult.resultDescription,
            resultType: calcResult.resultType,
            winningMargin: calcResult.winningMargin,
            winningTeamId: calcResult.winningTeamId,
            momPlayerId: momResult.selectedPlayerId,
            momScore: momResult.totalScore,
            updatedAt: now,
          });
        }
      }
    }
  },

  syncPerformancesFromEvents: async (inningsId: EntityId): Promise<void> => {
    const inn = inningsRepo.getById(inningsId);
    if (!inn) return;

    const events = ballEventRepo.find((b) => String(b.inningsId) === String(inningsId));
    const now = new Date().toISOString();

    // 1. Batting Performances Sync
    const battingPlayerIds = new Set<string>();
    for (const e of events) {
      battingPlayerIds.add(String(e.strikerPlayerId));
      if (e.isWicket && e.dismissedPlayerId) {
        battingPlayerIds.add(String(e.dismissedPlayerId));
      }
    }
    if (inn.currentStrikerId) battingPlayerIds.add(String(inn.currentStrikerId));
    if (inn.currentNonStrikerId) battingPlayerIds.add(String(inn.currentNonStrikerId));

    for (const pIdStr of battingPlayerIds) {
      const pEvents = events.filter((e) => String(e.strikerPlayerId) === pIdStr);
      const runs = pEvents.reduce((acc, e) => acc + (e.batRuns || 0), 0);
      const ballsFaced = pEvents.filter((e) => e.eventType !== 'Wide').length;
      const fours = pEvents.filter((e) => e.batRuns === 4).length;
      const sixes = pEvents.filter((e) => e.batRuns === 6).length;
      const dots = pEvents.filter((e) => e.batRuns === 0 && e.isLegalBall).length;
      const ones = pEvents.filter((e) => e.batRuns === 1).length;
      const twos = pEvents.filter((e) => e.batRuns === 2).length;
      const threes = pEvents.filter((e) => e.batRuns === 3).length;
      const fives = pEvents.filter((e) => e.batRuns === 5).length;
      const sixRunBalls = pEvents.filter((e) => e.batRuns >= 6).length;

      const dismissal = events.slice().reverse().find((e) => e.isWicket && String(e.dismissedPlayerId) === pIdStr);
      const isOut = !!dismissal;
      const dismissalType = isOut ? dismissal!.wicketType : 'NotOut';
      const bowled = dismissalType === 'Bowled';

      // Streaks
      let maxSixInRow = 0, currentSixStreak = 0;
      let maxFourInRow = 0, currentFourStreak = 0;
      for (const ev of pEvents.filter((e) => e.isLegalBall)) {
        if (ev.batRuns === 6) {
          currentSixStreak++;
          if (currentSixStreak > maxSixInRow) maxSixInRow = currentSixStreak;
        } else {
          currentSixStreak = 0;
        }
        if (ev.batRuns === 4) {
          currentFourStreak++;
          if (currentFourStreak > maxFourInRow) maxFourInRow = currentFourStreak;
        } else {
          currentFourStreak = 0;
        }
      }

      let bp = battingRepo.findOne((b) => String(b.matchInningsId) === String(inn.id) && String(b.playerId) === pIdStr);
      if (!bp) {
        battingRepo.create({
          matchInningsId: inn.id,
          playerId: pIdStr,
          runs,
          ballsFaced,
          fours,
          sixes,
          dotBalls: dots,
          ones,
          twos,
          threes,
          fives,
          sixRunBalls,
          isOut,
          dismissalType,
          bowled,
          sixInRowCount: maxSixInRow,
          fourInRowCount: maxFourInRow,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        battingRepo.update(bp.id, {
          runs,
          ballsFaced,
          fours,
          sixes,
          dotBalls: dots,
          ones,
          twos,
          threes,
          fives,
          sixRunBalls,
          isOut,
          dismissalType,
          bowled,
          sixInRowCount: maxSixInRow,
          fourInRowCount: maxFourInRow,
          updatedAt: now,
        });
      }
    }

    // 2. Bowling Performances Sync
    const bowlerIds = new Set<string>();
    for (const e of events) bowlerIds.add(String(e.bowlerPlayerId));
    if (inn.currentBowlerId) bowlerIds.add(String(inn.currentBowlerId));

    for (const bIdStr of bowlerIds) {
      const bEvents = events.filter((e) => String(e.bowlerPlayerId) === bIdStr);
      const ballsBowled = bEvents.filter((e) => e.isLegalBall).length;
      const conceded = bEvents.reduce(
        (acc, e) => acc + (e.batRuns || 0) + (e.extraType === 'Wide' || e.extraType === 'NoBall' ? e.extraRuns || 0 : 0),
        0
      );
      const wickets = bEvents.filter((e) => e.isWicket && e.bowlerCreditedWicket).length;
      const wides = bEvents.filter((e) => e.extraType === 'Wide').length;
      const noBalls = bEvents.filter((e) => e.extraType === 'NoBall').length;

      // Maiden overs
      let maidenCount = 0;
      const overGroups = new Map<number, DbBallEvent[]>();
      for (const ev of bEvents) {
        if (!overGroups.has(ev.overNumber)) overGroups.set(ev.overNumber, []);
        overGroups.get(ev.overNumber)!.push(ev);
      }
      for (const [, ovEvents] of overGroups) {
        if (ovEvents.filter((e) => e.isLegalBall).length === 6) {
          const runsInOver = ovEvents.reduce(
            (acc, e) => acc + (e.batRuns || 0) + (e.extraType === 'Wide' || e.extraType === 'NoBall' ? e.extraRuns || 0 : 0),
            0
          );
          if (runsInOver === 0) maidenCount++;
        }
      }

      const hatTricks = calculateHatTricks(bEvents);

      let bowl = bowlingRepo.findOne((b) => String(b.matchInningsId) === String(inn.id) && String(b.playerId) === bIdStr);
      if (!bowl) {
        bowlingRepo.create({
          matchInningsId: inn.id,
          playerId: bIdStr,
          ballsBowled,
          runsConceded: conceded,
          wickets,
          maidenOvers: maidenCount,
          hatTricks,
          wides,
          noBalls,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        bowlingRepo.update(bowl.id, {
          ballsBowled,
          runsConceded: conceded,
          wickets,
          maidenOvers: maidenCount,
          hatTricks,
          wides,
          noBalls,
          updatedAt: now,
        });
      }
    }
  },
};
