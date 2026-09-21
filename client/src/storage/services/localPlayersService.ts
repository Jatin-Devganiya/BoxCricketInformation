import {
  STORAGE_KEYS,
  DbPlayer,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
  DbBallEvent,
  DbMatch,
  DbTeam,
  DbTeamPlayer,
} from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { Player, PlayerStatistics, BattingStats, BowlingStats, FieldingStats } from '../../types';
import { toCricketOvers, calculateStrikeRate, calculateEconomyRate } from '../cricketCalculations';

const playerRepo = new LocalStorageRepository<DbPlayer>(STORAGE_KEYS.PLAYERS);
const teamRepo = new LocalStorageRepository<DbTeam>(STORAGE_KEYS.TEAMS);
const teamPlayerRepo = new LocalStorageRepository<DbTeamPlayer>(STORAGE_KEYS.TEAM_PLAYERS);
const battingRepo = new LocalStorageRepository<DbMatchBattingPerformance>(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES);
const bowlingRepo = new LocalStorageRepository<DbMatchBowlingPerformance>(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES);
const ballEventRepo = new LocalStorageRepository<DbBallEvent>(STORAGE_KEYS.BALL_EVENTS);
const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);

function computePlayerRanks(
  allPlayers: DbPlayer[],
  battingRecords: DbMatchBattingPerformance[],
  bowlingRecords: DbMatchBowlingPerformance[]
) {
  // Aggregate runs & wickets across all players
  const playerRunsMap = new Map<string, number>();
  const playerWicketsMap = new Map<string, number>();

  for (const p of allPlayers) {
    const pId = String(p.id);
    const pBatting = battingRecords.filter((b) => String(b.playerId) === pId);
    const pBowling = bowlingRecords.filter((b) => String(b.playerId) === pId);
    playerRunsMap.set(pId, pBatting.reduce((acc, b) => acc + (b.runs || 0), 0));
    playerWicketsMap.set(pId, pBowling.reduce((acc, b) => acc + (b.wickets || 0), 0));
  }

  // Dense ranking for batting (players with runs > 0)
  const battingRanks = new Map<string, number>();
  let currentBatRank = 0;
  let prevRuns = -1;
  const sortedBatters = Array.from(playerRunsMap.entries())
    .filter(([_, runs]) => runs > 0)
    .sort((a, b) => b[1] - a[1]);
  for (const [pId, runs] of sortedBatters) {
    if (runs !== prevRuns) {
      currentBatRank++;
      prevRuns = runs;
    }
    battingRanks.set(pId, currentBatRank);
  }

  // Dense ranking for bowling (players with wickets > 0)
  const bowlingRanks = new Map<string, number>();
  let currentBowlRank = 0;
  let prevWickets = -1;
  const sortedBowlers = Array.from(playerWicketsMap.entries())
    .filter(([_, wickets]) => wickets > 0)
    .sort((a, b) => b[1] - a[1]);
  for (const [pId, wickets] of sortedBowlers) {
    if (wickets !== prevWickets) {
      currentBowlRank++;
      prevWickets = wickets;
    }
    bowlingRanks.set(pId, currentBowlRank);
  }

  return { battingRanks, bowlingRanks };
}

export const localPlayersService = {
  getAll: async (params?: { search?: string; category?: string; status?: string }): Promise<Player[]> => {
    let list = playerRepo.getAll();

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      );
    }
    if (params?.category && params.category !== 'All') {
      list = list.filter((p) => p.playerCategory.toLowerCase() === params.category!.toLowerCase());
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((p) => p.status.toLowerCase() === params.status!.toLowerCase());
    }

    const battingRecords = battingRepo.getAll();
    const bowlingRecords = bowlingRepo.getAll();
    const matches = matchRepo.getAll();
    const teams = teamRepo.getAll();
    const teamPlayers = teamPlayerRepo.getAll();

    // Compute global batting and bowling ranks across all active players in localStorage
    const allPlayersList = playerRepo.getAll();
    const { battingRanks, bowlingRanks } = computePlayerRanks(allPlayersList, battingRecords, bowlingRecords);

    // Map each player to full presentation model
    return list.map((p) => {
      const pBatting = battingRecords.filter((b) => String(b.playerId) === String(p.id));
      const pBowling = bowlingRecords.filter((b) => String(b.playerId) === String(p.id));
      const totalRuns = pBatting.reduce((acc, b) => acc + (b.runs || 0), 0);
      const totalWickets = pBowling.reduce((acc, b) => acc + (b.wickets || 0), 0);
      const momCount = matches.filter((m) => String(m.momPlayerId) === String(p.id)).length;

      // Current team lookup
      const activeTp = teamPlayers.find((tp) => String(tp.playerId) === String(p.id) && tp.status === 'Active');
      let currentTeamName = 'Free Agent';
      if (activeTp) {
        const t = teams.find((tm) => String(tm.id) === String(activeTp.teamId));
        if (t) currentTeamName = t.name;
      }

      return {
        id: p.id as any,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        playerCategory: p.playerCategory,
        status: p.status,
        userId: p.userId ? (p.userId as any) : undefined,
        currentTeamName,
        totalRuns,
        totalWickets,
        manOfTheMatchCount: momCount,
        battingRank: battingRanks.get(String(p.id)) ?? null,
        bowlingRank: bowlingRanks.get(String(p.id)) ?? null,
        createdByUserId: p.createdByUserId ? (p.createdByUserId as any) : undefined,
        createdAt: p.createdAt,
      };
    });
  },

  getById: async (id: number | string): Promise<Player> => {
    const p = playerRepo.getById(id);
    if (!p) throw new Error('Player not found');

    const battingRecords = battingRepo.find((b) => String(b.playerId) === String(p.id));
    const bowlingRecords = bowlingRepo.find((b) => String(b.playerId) === String(p.id));
    const matches = matchRepo.find((m) => String(m.momPlayerId) === String(p.id));
    const teamPlayers = teamPlayerRepo.find((tp) => String(tp.playerId) === String(p.id) && tp.status === 'Active');

    let currentTeamName = 'Free Agent';
    if (teamPlayers.length > 0) {
      const t = teamRepo.getById(teamPlayers[0].teamId);
      if (t) currentTeamName = t.name;
    }

    const allPlayersList = playerRepo.getAll();
    const allBatting = battingRepo.getAll();
    const allBowling = bowlingRepo.getAll();
    const { battingRanks, bowlingRanks } = computePlayerRanks(allPlayersList, allBatting, allBowling);

    return {
      id: p.id as any,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: `${p.firstName} ${p.lastName}`.trim(),
      playerCategory: p.playerCategory,
      status: p.status,
      userId: p.userId ? (p.userId as any) : undefined,
      currentTeamName,
      totalRuns: battingRecords.reduce((acc, b) => acc + (b.runs || 0), 0),
      totalWickets: bowlingRecords.reduce((acc, b) => acc + (b.wickets || 0), 0),
      battingRank: battingRanks.get(String(p.id)) ?? null,
      bowlingRank: bowlingRanks.get(String(p.id)) ?? null,
      manOfTheMatchCount: matches.length,
      createdAt: p.createdAt,
    };
  },

  getStatistics: async (id: number | string): Promise<PlayerStatistics> => {
    const p = playerRepo.getById(id);
    if (!p) throw new Error('Player not found');

    const battingRecords = battingRepo.find((b) => String(b.playerId) === String(p.id));
    const bowlingRecords = bowlingRepo.find((b) => String(b.playerId) === String(p.id));
    const inningsList = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCH_INNINGS);

    // Batting calculations
    const matchIds = new Set<string>();
    for (const b of battingRecords) {
      const inn = inningsList.find((i) => String(i.id) === String(b.matchInningsId));
      if (inn) matchIds.add(String(inn.matchId));
    }

    const battingMatches = matchIds.size;
    const battingInnings = battingRecords.length;
    const totalRuns = battingRecords.reduce((acc, b) => acc + (b.runs || 0), 0);
    const ballsFaced = battingRecords.reduce((acc, b) => acc + (b.ballsFaced || 0), 0);
    const highestScore = battingRecords.length > 0 ? Math.max(...battingRecords.map((b) => b.runs || 0)) : 0;
    const fours = battingRecords.reduce((acc, b) => acc + (b.fours || 0), 0);
    const sixes = battingRecords.reduce((acc, b) => acc + (b.sixes || 0), 0);
    const dotBalls = battingRecords.reduce((acc, b) => acc + (b.dotBalls || 0), 0);
    const zeroOutCount = battingRecords.filter((b) => (b.runs || 0) === 0 && b.isOut).length;
    const ones = battingRecords.reduce((acc, b) => acc + (b.ones || 0), 0);
    const twos = battingRecords.reduce((acc, b) => acc + (b.twos || 0), 0);
    const threes = battingRecords.reduce((acc, b) => acc + (b.threes || 0), 0);
    const fives = battingRecords.reduce((acc, b) => acc + (b.fives || 0), 0);
    const sixRunBalls = battingRecords.reduce((acc, b) => acc + (b.sixRunBalls || 0), 0);
    const sixInRowCount = battingRecords.reduce((acc, b) => acc + (b.sixInRowCount || 0), 0);
    const fourInRowCount = battingRecords.reduce((acc, b) => acc + (b.fourInRowCount || 0), 0);
    const dismissals = battingRecords.filter((b) => b.isOut).length;
    const strikeRate = calculateStrikeRate(totalRuns, ballsFaced);

    const batting: BattingStats = {
      matches: battingMatches,
      innings: battingInnings,
      totalRuns,
      ballsFaced,
      totalBallsPlayed: ballsFaced,
      highestScore,
      runRate: strikeRate,
      fours,
      sixes,
      dotBalls,
      zeroOutCount,
      ones,
      twos,
      threes,
      fives,
      sixRunBalls,
      sixInRowCount,
      fourInRowCount,
      dismissals,
    };

    // Bowling calculations
    const bowlMatchIds = new Set<string>();
    for (const b of bowlingRecords) {
      const inn = inningsList.find((i) => String(i.id) === String(b.matchInningsId));
      if (inn) bowlMatchIds.add(String(inn.matchId));
    }
    const ballsBowled = bowlingRecords.reduce((acc, b) => acc + (b.ballsBowled || 0), 0);
    const runsConceded = bowlingRecords.reduce((acc, b) => acc + (b.runsConceded || 0), 0);
    const wickets = bowlingRecords.reduce((acc, b) => acc + (b.wickets || 0), 0);
    const maidenOvers = bowlingRecords.reduce((acc, b) => acc + (b.maidenOvers || 0), 0);
    const hatTricks = bowlingRecords.reduce((acc, b) => acc + (b.hatTricks || 0), 0);
    const wides = bowlingRecords.reduce((acc, b) => acc + (b.wides || 0), 0);
    const noBalls = bowlingRecords.reduce((acc, b) => acc + (b.noBalls || 0), 0);
    const economyRate = calculateEconomyRate(runsConceded, ballsBowled);
    const oversFormatted = toCricketOvers(ballsBowled);

    let highestWickets = '0/0';
    if (bowlingRecords.length > 0) {
      const sorted = [...bowlingRecords].sort((a, b) => {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return a.runsConceded - b.runsConceded;
      });
      highestWickets = `${sorted[0].wickets}/${sorted[0].runsConceded}`;
    }

    const bowling: BowlingStats = {
      matches: bowlMatchIds.size,
      innings: bowlingRecords.length,
      ballsBowled,
      oversFormatted,
      runsConceded,
      wickets,
      economyRate,
      highestWickets,
      maidenOvers,
      hatTricks,
      wides,
      noBalls,
    };

    // Fielding calculations
    const ballEvents = ballEventRepo.getAll();
    const catches = ballEvents.filter(
      (b) => String(b.fielderPlayerId) === String(p.id) && b.wicketType === 'Caught'
    ).length;
    const stumpings = ballEvents.filter(
      (b) => String(b.fielderPlayerId) === String(p.id) && b.wicketType === 'Stumped'
    ).length;
    const runOuts = ballEvents.filter(
      (b) => String(b.fielderPlayerId) === String(p.id) && b.wicketType === 'RunOut'
    ).length;

    const fielding: FieldingStats = {
      catches,
      stumpings,
      runOuts,
    };

    const momCount = matchRepo.find((m) => String(m.momPlayerId) === String(p.id)).length;

    return {
      playerId: p.id as any,
      playerName: `${p.firstName} ${p.lastName}`.trim(),
      playerCategory: p.playerCategory,
      manOfTheMatchCount: momCount,
      batting,
      bowling,
      fielding,
    };
  },

  create: async (payload: any): Promise<Player> => {
    const firstName = (payload.firstName || '').trim();
    const lastName = (payload.lastName || '').trim();
    const status = payload.status || 'Active';

    // Unique active player rule
    if (status === 'Active') {
      const duplicate = playerRepo.findOne(
        (p) =>
          p.status === 'Active' &&
          p.firstName.toLowerCase() === firstName.toLowerCase() &&
          p.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`An active player with name '${firstName} ${lastName}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    const newPlayer = playerRepo.create({
      firstName,
      lastName,
      playerCategory: payload.playerCategory || 'Batsman',
      status,
      userId: payload.userId || null,
      createdByUserId: payload.createdByUserId || null,
      createdAt: now,
      updatedAt: now,
    });

    // If initial team assignment was chosen
    if (payload.teamId && payload.teamId > 0) {
      teamPlayerRepo.create({
        teamId: payload.teamId,
        playerId: newPlayer.id,
        joinedDate: now,
        status: 'Active',
        createdAt: now,
        updatedAt: now,
      });
    }

    LocalStorageDataStore.rebuildIndexes();
    return await localPlayersService.getById(newPlayer.id);
  },

  update: async (id: number | string, payload: any): Promise<Player> => {
    const p = playerRepo.getById(id);
    if (!p) throw new Error('Player not found');

    const firstName = payload.firstName !== undefined ? payload.firstName.trim() : p.firstName;
    const lastName = payload.lastName !== undefined ? payload.lastName.trim() : p.lastName;
    const status = payload.status !== undefined ? payload.status : p.status;

    // Unique active player rule
    if (status === 'Active') {
      const duplicate = playerRepo.findOne(
        (pl) =>
          String(pl.id) !== String(id) &&
          pl.status === 'Active' &&
          pl.firstName.toLowerCase() === firstName.toLowerCase() &&
          pl.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`An active player with name '${firstName} ${lastName}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    playerRepo.update(id, {
      firstName,
      lastName,
      playerCategory: payload.playerCategory || p.playerCategory,
      status,
      userId: payload.userId !== undefined ? payload.userId : p.userId,
      updatedAt: now,
    });

    // Team assignment update if provided
    if (payload.teamId !== undefined) {
      const existingRosters = teamPlayerRepo.find((tp) => String(tp.playerId) === String(id));
      for (const tp of existingRosters) {
        teamPlayerRepo.delete(tp.id);
      }
      if (payload.teamId && payload.teamId > 0) {
        teamPlayerRepo.create({
          teamId: payload.teamId,
          playerId: id,
          joinedDate: now,
          status: 'Active',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    LocalStorageDataStore.rebuildIndexes();
    return await localPlayersService.getById(id);
  },

  delete: async (id: number | string): Promise<void> => {
    const p = playerRepo.getById(id);
    if (!p) throw new Error('Player not found');

    // Protect historical match records
    const hasBatting = battingRepo.exists((b) => String(b.playerId) === String(id));
    const hasBowling = bowlingRepo.exists((b) => String(b.playerId) === String(id));
    const hasBalls = ballEventRepo.exists(
      (b) =>
        String(b.strikerPlayerId) === String(id) ||
        String(b.bowlerPlayerId) === String(id) ||
        String(b.nonStrikerPlayerId) === String(id)
    );

    if (hasBatting || hasBowling || hasBalls) {
      // Deactivate rather than cascading destructive historical loss
      playerRepo.update(id, { status: 'Inactive', updatedAt: new Date().toISOString() });
      return;
    }

    // Clean up roster links
    const rosters = teamPlayerRepo.find((tp) => String(tp.playerId) === String(id));
    for (const tp of rosters) teamPlayerRepo.delete(tp.id);

    playerRepo.delete(id);
    LocalStorageDataStore.rebuildIndexes();
  },
};
