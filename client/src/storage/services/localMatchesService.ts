import {
  STORAGE_KEYS,
  DbMatch,
  DbMatchInnings,
  DbSeries,
  DbTeam,
  DbPlayer,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
  DbBallEvent,
  DbUser,
} from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { Match, Scorecard, InningsScorecard, BattingRecord, BowlingRecord } from '../../types';
import { toCricketOvers, calculateStrikeRate, calculateEconomyRate } from '../cricketCalculations';
import { canAddMatchesToSeries, getAllowedMatchTransitions } from '../../utils/statusRules';

const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);
const seriesRepo = new LocalStorageRepository<DbSeries>(STORAGE_KEYS.SERIES);
const teamRepo = new LocalStorageRepository<DbTeam>(STORAGE_KEYS.TEAMS);
const playerRepo = new LocalStorageRepository<DbPlayer>(STORAGE_KEYS.PLAYERS);
const inningsRepo = new LocalStorageRepository<DbMatchInnings>(STORAGE_KEYS.MATCH_INNINGS);
const battingRepo = new LocalStorageRepository<DbMatchBattingPerformance>(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES);
const bowlingRepo = new LocalStorageRepository<DbMatchBowlingPerformance>(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES);
const ballEventRepo = new LocalStorageRepository<DbBallEvent>(STORAGE_KEYS.BALL_EVENTS);
const userRepo = new LocalStorageRepository<DbUser>(STORAGE_KEYS.USERS);

const getCurrentUserIdFromStorage = (): number | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id ? Number(u.id) : null;
  } catch {
    return null;
  }
};

export const localMatchesService = {
  getAll: async (params?: { seriesId?: number | string; status?: string; date?: string; sortOrder?: string }): Promise<Match[]> => {
    let list = matchRepo.getAll();

    if (params?.seriesId && Number(params.seriesId) > 0) {
      list = list.filter((m) => String(m.seriesId) === String(params.seriesId));
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((m) => m.status.toLowerCase() === params.status!.toLowerCase());
    }
    if (params?.date) {
      list = list.filter((m) => m.scheduledDate.startsWith(params.date!));
    }

    const series = seriesRepo.getAll();
    const teams = teamRepo.getAll();
    const players = playerRepo.getAll();
    const users = userRepo.getAll();

    // Sort
    list.sort((a, b) => {
      const orderDiff = (a.matchOrder || 1) - (b.matchOrder || 1);
      if (orderDiff !== 0) return params?.sortOrder === 'desc' ? -orderDiff : orderDiff;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    return list.map((m) => {
      const s = series.find((sr) => String(sr.id) === String(m.seriesId));
      const t1 = teams.find((tm) => String(tm.id) === String(m.team1Id));
      const t2 = teams.find((tm) => String(tm.id) === String(m.team2Id));
      const winTeam = m.winningTeamId ? teams.find((tm) => String(tm.id) === String(m.winningTeamId)) : null;
      const mom = m.momPlayerId ? players.find((p) => String(p.id) === String(m.momPlayerId)) : null;
      const creator = users.find((u) => String(u.id) === String(m.createdByUserId));

      return {
        id: m.id as any,
        seriesId: m.seriesId as any,
        seriesName: s ? s.name : 'Unknown Tournament',
        team1Id: m.team1Id as any,
        team1Name: t1 ? t1.name : 'Team 1',
        team1ShortName: t1 ? t1.shortName : 'T1',
        team2Id: m.team2Id as any,
        team2Name: t2 ? t2.name : 'Team 2',
        team2ShortName: t2 ? t2.shortName : 'T2',
        matchOrder: m.matchOrder || 1,
        requiredOvers: m.requiredOvers || 6,
        scheduledDate: m.scheduledDate,
        scheduledTime: m.scheduledTime,
        address: m.address,
        status: m.status,
        winningTeamId: m.winningTeamId ? (m.winningTeamId as any) : undefined,
        winningTeamName: winTeam ? winTeam.name : undefined,
        result: m.result || undefined,
        resultType: m.resultType || undefined,
        winningMargin: m.winningMargin || undefined,
        momPlayerId: m.momPlayerId ? (m.momPlayerId as any) : undefined,
        momPlayerName: mom ? `${mom.firstName} ${mom.lastName}` : undefined,
        momScore: m.momScore !== undefined ? m.momScore : undefined,
        createdByUserId: m.createdByUserId ? (m.createdByUserId as any) : undefined,
        createdByUsername: creator ? creator.username : undefined,
      };
    });
  },

  getById: async (id: number | string): Promise<Match> => {
    const m = matchRepo.getById(id);
    if (!m) throw new Error('Match not found');

    const s = seriesRepo.getById(m.seriesId);
    const t1 = teamRepo.getById(m.team1Id);
    const t2 = teamRepo.getById(m.team2Id);
    const winTeam = m.winningTeamId ? teamRepo.getById(m.winningTeamId) : null;
    const mom = m.momPlayerId ? playerRepo.getById(m.momPlayerId) : null;
    const creator = m.createdByUserId ? userRepo.getById(m.createdByUserId) : null;

    return {
      id: m.id as any,
      seriesId: m.seriesId as any,
      seriesName: s ? s.name : 'Unknown Tournament',
      team1Id: m.team1Id as any,
      team1Name: t1 ? t1.name : 'Team 1',
      team1ShortName: t1 ? t1.shortName : 'T1',
      team2Id: m.team2Id as any,
      team2Name: t2 ? t2.name : 'Team 2',
      team2ShortName: t2 ? t2.shortName : 'T2',
      matchOrder: m.matchOrder || 1,
      requiredOvers: m.requiredOvers || 6,
      scheduledDate: m.scheduledDate,
      scheduledTime: m.scheduledTime,
      address: m.address,
      status: m.status,
      winningTeamId: m.winningTeamId ? (m.winningTeamId as any) : undefined,
      winningTeamName: winTeam ? winTeam.name : undefined,
      result: m.result || undefined,
      resultType: m.resultType || undefined,
      winningMargin: m.winningMargin || undefined,
      momPlayerId: m.momPlayerId ? (m.momPlayerId as any) : undefined,
      momPlayerName: mom ? `${mom.firstName} ${mom.lastName}` : undefined,
      momScore: m.momScore !== undefined ? m.momScore : undefined,
      createdByUserId: m.createdByUserId ? (m.createdByUserId as any) : undefined,
      createdByUsername: creator ? creator.username : undefined,
    };
  },

  create: async (payload: any): Promise<Match> => {
    const series = seriesRepo.getById(payload.seriesId);
    if (!series) throw new Error('Series not found');

    if (!canAddMatchesToSeries(series.status)) {
      throw new Error(`Cannot add matches to a '${series.status}' series.`);
    }

    if (String(payload.team1Id) === String(payload.team2Id)) {
      throw new Error('A match cannot be scheduled between the same team.');
    }

    const currentUserId = payload.createdByUserId ?? getCurrentUserIdFromStorage();
    const now = new Date().toISOString();
    const newMatch = matchRepo.create({
      seriesId: payload.seriesId,
      team1Id: payload.team1Id,
      team2Id: payload.team2Id,
      matchOrder: payload.matchOrder || 1,
      requiredOvers: payload.requiredOvers || 6,
      scheduledDate: payload.scheduledDate || now.split('T')[0],
      scheduledTime: payload.scheduledTime || '18:00',
      address: payload.address || 'Box Cricket Arena',
      status: payload.status || 'Scheduled',
      createdByUserId: currentUserId,
      createdAt: now,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    return await localMatchesService.getById(newMatch.id);
  },

  update: async (id: number | string, payload: any): Promise<Match> => {
    const m = matchRepo.getById(id);
    if (!m) throw new Error('Match not found');

    const series = seriesRepo.getById(m.seriesId);
    const targetStatus = payload.status || m.status;

    if (targetStatus !== m.status) {
      const allowed = getAllowedMatchTransitions(m.status, series?.status);
      if (!allowed.includes(targetStatus)) {
        throw new Error(`Invalid match transition from '${m.status}' to '${targetStatus}'.`);
      }
    }

    const now = new Date().toISOString();
    matchRepo.update(id, {
      seriesId: payload.seriesId !== undefined ? payload.seriesId : m.seriesId,
      team1Id: payload.team1Id !== undefined ? payload.team1Id : m.team1Id,
      team2Id: payload.team2Id !== undefined ? payload.team2Id : m.team2Id,
      matchOrder: payload.matchOrder !== undefined ? payload.matchOrder : m.matchOrder,
      requiredOvers: payload.requiredOvers !== undefined ? payload.requiredOvers : m.requiredOvers,
      scheduledDate: payload.scheduledDate || m.scheduledDate,
      scheduledTime: payload.scheduledTime || m.scheduledTime,
      address: payload.address !== undefined ? payload.address : m.address,
      status: targetStatus,
      winningTeamId: payload.winningTeamId !== undefined ? payload.winningTeamId : m.winningTeamId,
      result: payload.result !== undefined ? payload.result : m.result,
      resultType: payload.resultType !== undefined ? payload.resultType : m.resultType,
      winningMargin: payload.winningMargin !== undefined ? payload.winningMargin : m.winningMargin,
      momPlayerId: payload.momPlayerId !== undefined ? payload.momPlayerId : m.momPlayerId,
      momScore: payload.momScore !== undefined ? payload.momScore : m.momScore,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    return await localMatchesService.getById(id);
  },

  delete: async (id: number | string): Promise<void> => {
    const m = matchRepo.getById(id);
    if (!m) throw new Error('Match not found');

    // Protect matches with ball events
    const hasBalls = ballEventRepo.exists((b) => String(b.matchId) === String(id));
    if (hasBalls) {
      // Mark cancelled rather than destructive wipe
      matchRepo.update(id, { status: 'Cancelled', updatedAt: new Date().toISOString() });
      return;
    }

    // Cascade delete innings and performances
    const innings = inningsRepo.find((i) => String(i.matchId) === String(id));
    for (const inn of innings) {
      const bat = battingRepo.find((b) => String(b.matchInningsId) === String(inn.id));
      for (const b of bat) battingRepo.delete(b.id);

      const bowl = bowlingRepo.find((b) => String(b.matchInningsId) === String(inn.id));
      for (const b of bowl) bowlingRepo.delete(b.id);

      inningsRepo.delete(inn.id);
    }

    matchRepo.delete(id);
    LocalStorageDataStore.rebuildIndexes();
  },

  getScorecard: async (matchId: number | string): Promise<Scorecard> => {
    const match = await localMatchesService.getById(matchId);
    const inningsList = inningsRepo.find((i) => String(i.matchId) === String(matchId));
    const teams = teamRepo.getAll();
    const players = playerRepo.getAll();

    const inn1 = inningsList.find((i) => i.inningsNumber === 1);
    const inn2 = inningsList.find((i) => i.inningsNumber === 2);

    const mapInningsScorecard = (inn?: DbMatchInnings): InningsScorecard | undefined => {
      if (!inn) return undefined;
      const t = teams.find((tm) => String(tm.id) === String(inn.teamId));
      const batting = battingRepo.find((b) => String(b.matchInningsId) === String(inn.id));
      const bowling = bowlingRepo.find((b) => String(b.matchInningsId) === String(inn.id));

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

      return {
        id: inn.id as any,
        matchId: inn.matchId as any,
        teamId: inn.teamId as any,
        teamName: t ? t.name : 'Team',
        inningsNumber: inn.inningsNumber,
        runs: inn.runs || 0,
        wickets: inn.wickets || 0,
        balls: inn.balls || 0,
        oversDisplay: toCricketOvers(inn.balls || 0),
        extras: inn.extras || 0,
        status: inn.status || 'Scheduled',
        battingPerformances,
        bowlingPerformances,
      };
    };

    return {
      match,
      innings1: mapInningsScorecard(inn1),
      innings2: mapInningsScorecard(inn2),
    };
  },

  saveScorecard: async (matchId: number | string, payload: any): Promise<Scorecard> => {
    // Manual scorecard save support
    const match = matchRepo.getById(matchId);
    if (!match) throw new Error('Match not found');

    const saveInnings = (innNumber: number, data: any) => {
      if (!data) return;
      let inn = inningsRepo.findOne((i) => String(i.matchId) === String(matchId) && i.inningsNumber === innNumber);
      const now = new Date().toISOString();

      if (!inn) {
        inn = inningsRepo.create({
          matchId,
          teamId: data.teamId || (innNumber === 1 ? match.team1Id : match.team2Id),
          inningsNumber: innNumber,
          runs: data.runs || 0,
          wickets: data.wickets || 0,
          balls: data.balls || 0,
          extras: data.extras || 0,
          status: data.status || 'Completed',
          createdAt: now,
          updatedAt: now,
        });
      } else {
        inningsRepo.update(inn.id, {
          runs: data.runs !== undefined ? data.runs : inn.runs,
          wickets: data.wickets !== undefined ? data.wickets : inn.wickets,
          balls: data.balls !== undefined ? data.balls : inn.balls,
          extras: data.extras !== undefined ? data.extras : inn.extras,
          status: data.status || inn.status,
          updatedAt: now,
        });
      }

      // Save batting performances
      if (Array.isArray(data.battingPerformances)) {
        for (const bp of data.battingPerformances) {
          let existingBp = battingRepo.findOne(
            (b) => String(b.matchInningsId) === String(inn!.id) && String(b.playerId) === String(bp.playerId)
          );
          if (!existingBp) {
            battingRepo.create({
              matchInningsId: inn!.id,
              playerId: bp.playerId,
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
              dismissalType: bp.dismissalType || 'NotOut',
              bowled: bp.bowled || false,
              sixInRowCount: bp.sixInRowCount || 0,
              fourInRowCount: bp.fourInRowCount || 0,
              createdAt: now,
              updatedAt: now,
            });
          } else {
            battingRepo.update(existingBp.id, {
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
              dismissalType: bp.dismissalType || 'NotOut',
              bowled: bp.bowled || false,
              sixInRowCount: bp.sixInRowCount || 0,
              fourInRowCount: bp.fourInRowCount || 0,
              updatedAt: now,
            });
          }
        }
      }

      // Save bowling performances
      if (Array.isArray(data.bowlingPerformances)) {
        for (const bowl of data.bowlingPerformances) {
          let existingBowl = bowlingRepo.findOne(
            (b) => String(b.matchInningsId) === String(inn!.id) && String(b.playerId) === String(bowl.playerId)
          );
          if (!existingBowl) {
            bowlingRepo.create({
              matchInningsId: inn!.id,
              playerId: bowl.playerId,
              ballsBowled: bowl.ballsBowled || 0,
              runsConceded: bowl.runsConceded || 0,
              wickets: bowl.wickets || 0,
              maidenOvers: bowl.maidenOvers || 0,
              hatTricks: bowl.hatTricks || 0,
              wides: bowl.wides || 0,
              noBalls: bowl.noBalls || 0,
              createdAt: now,
              updatedAt: now,
            });
          } else {
            bowlingRepo.update(existingBowl.id, {
              ballsBowled: bowl.ballsBowled || 0,
              runsConceded: bowl.runsConceded || 0,
              wickets: bowl.wickets || 0,
              maidenOvers: bowl.maidenOvers || 0,
              hatTricks: bowl.hatTricks || 0,
              wides: bowl.wides || 0,
              noBalls: bowl.noBalls || 0,
              updatedAt: now,
            });
          }
        }
      }
    };

    saveInnings(1, payload.innings1);
    saveInnings(2, payload.innings2);

    LocalStorageDataStore.rebuildIndexes();
    return await localMatchesService.getScorecard(matchId);
  },
};
