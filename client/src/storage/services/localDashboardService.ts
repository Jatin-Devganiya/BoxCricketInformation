import {
  STORAGE_KEYS,
  DbPlayer,
  DbTeam,
  DbSeries,
  DbMatch,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
} from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { DashboardStats, TopPerformer, TopBowler } from '../../types';
import { localMatchesService } from './localMatchesService';
import { calculateStrikeRate, calculateEconomyRate } from '../cricketCalculations';

const playerRepo = new LocalStorageRepository<DbPlayer>(STORAGE_KEYS.PLAYERS);
const teamRepo = new LocalStorageRepository<DbTeam>(STORAGE_KEYS.TEAMS);
const seriesRepo = new LocalStorageRepository<DbSeries>(STORAGE_KEYS.SERIES);
const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);
const battingRepo = new LocalStorageRepository<DbMatchBattingPerformance>(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES);
const bowlingRepo = new LocalStorageRepository<DbMatchBowlingPerformance>(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES);

export const localDashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const players = playerRepo.getAll();
    const teams = teamRepo.getAll();
    const series = seriesRepo.getAll();
    const matches = matchRepo.getAll();
    const batting = battingRepo.getAll();
    const bowling = bowlingRepo.getAll();

    const todayStr = new Date().toISOString().split('T')[0];
    const completedMatches = matches.filter((m) => m.status === 'Completed').length;
    const scheduledMatches = matches.filter((m) => m.status === 'Scheduled').length;
    const todayMatches = matches.filter((m) => m.scheduledDate.startsWith(todayStr)).length;

    // Recent matches (last 5)
    const allMatchesMapped = await localMatchesService.getAll();
    const recentMatches = allMatchesMapped.slice(0, 5);

    // Top Run Scorers
    const playerRunsMap = new Map<string, { runs: number; balls: number; innings: number }>();
    for (const bp of batting) {
      const pKey = String(bp.playerId);
      if (!playerRunsMap.has(pKey)) playerRunsMap.set(pKey, { runs: 0, balls: 0, innings: 0 });
      const entry = playerRunsMap.get(pKey)!;
      entry.runs += bp.runs || 0;
      entry.balls += bp.ballsFaced || 0;
      entry.innings += 1;
    }

    const topRunScorers: TopPerformer[] = [];
    for (const [pIdStr, stats] of playerRunsMap.entries()) {
      const p = players.find((pl) => String(pl.id) === pIdStr);
      if (p) {
        topRunScorers.push({
          playerId: p.id as any,
          playerName: `${p.firstName} ${p.lastName}`.trim(),
          teamName: 'Player',
          totalRuns: stats.runs,
          innings: stats.innings,
          strikeRate: calculateStrikeRate(stats.runs, stats.balls),
        });
      }
    }
    topRunScorers.sort((a, b) => b.totalRuns - a.totalRuns);
    const topScorersLimited = topRunScorers.slice(0, 5);

    // Top Wicket Takers
    const playerWicketsMap = new Map<string, { wickets: number; balls: number; runsConceded: number; innings: number }>();
    for (const bowl of bowling) {
      const pKey = String(bowl.playerId);
      if (!playerWicketsMap.has(pKey)) {
        playerWicketsMap.set(pKey, { wickets: 0, balls: 0, runsConceded: 0, innings: 0 });
      }
      const entry = playerWicketsMap.get(pKey)!;
      entry.wickets += bowl.wickets || 0;
      entry.balls += bowl.ballsBowled || 0;
      entry.runsConceded += bowl.runsConceded || 0;
      entry.innings += 1;
    }

    const topWicketTakers: TopBowler[] = [];
    for (const [pIdStr, stats] of playerWicketsMap.entries()) {
      const p = players.find((pl) => String(pl.id) === pIdStr);
      if (p) {
        topWicketTakers.push({
          playerId: p.id as any,
          playerName: `${p.firstName} ${p.lastName}`.trim(),
          teamName: 'Player',
          totalWickets: stats.wickets,
          innings: stats.innings,
          economyRate: calculateEconomyRate(stats.runsConceded, stats.balls),
        });
      }
    }
    topWicketTakers.sort((a, b) => {
      if (b.totalWickets !== a.totalWickets) return b.totalWickets - a.totalWickets;
      return a.economyRate - b.economyRate;
    });
    const topBowlersLimited = topWicketTakers.slice(0, 5);

    return {
      totalPlayers: players.length,
      totalTeams: teams.length,
      totalSeries: series.length,
      totalMatches: matches.length,
      completedMatches,
      scheduledMatches,
      todayMatches,
      recentMatches,
      topRunScorers: topScorersLimited,
      topWicketTakers: topBowlersLimited,
    };
  },
};
