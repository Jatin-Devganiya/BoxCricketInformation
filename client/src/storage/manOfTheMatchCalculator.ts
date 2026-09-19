import {
  DbMatch,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
  DbPlayer,
  DbTeam,
  DbTeamPlayer,
} from './dbSchema';
import { toCricketOvers } from './cricketCalculations';
import { MomCalculationResult, PlayerMomScore } from '../types';

export function calculateManOfTheMatch(
  match: DbMatch,
  matchPlayers: DbPlayer[],
  teamPlayers: DbTeamPlayer[],
  teamsMap: Map<string, DbTeam>,
  battingPerformances: DbMatchBattingPerformance[],
  bowlingPerformances: DbMatchBowlingPerformance[]
): MomCalculationResult {
  const result: MomCalculationResult = {
    selectedPlayerId: null,
    selectedPlayerName: null,
    selectedPlayerTeamName: null,
    totalScore: 0,
    battingPoints: 0,
    bowlingPoints: 0,
    allRounderBonus: 0,
    winningTeamBonus: 0,
    battingSummary: '',
    bowlingSummary: '',
    leaderboard: [],
  };

  if (!match) return result;

  // Build map of all players in match
  const playerMap = new Map<string, DbPlayer>();
  for (const p of matchPlayers) {
    playerMap.set(String(p.id), p);
  }

  // Also include players in batting/bowling performances
  for (const bp of battingPerformances) {
    if (!playerMap.has(String(bp.playerId))) {
      const matchP = matchPlayers.find((p) => String(p.id) === String(bp.playerId));
      if (matchP) playerMap.set(String(bp.playerId), matchP);
    }
  }
  for (const bowl of bowlingPerformances) {
    if (!playerMap.has(String(bowl.playerId))) {
      const matchP = matchPlayers.find((p) => String(p.id) === String(bowl.playerId));
      if (matchP) playerMap.set(String(bowl.playerId), matchP);
    }
  }

  const leaderboard: PlayerMomScore[] = [];

  for (const [pIdStr, player] of playerMap.entries()) {
    const playerId = player.id;

    // Identify player's team in this match
    let playerTeamId: any = 0;
    let teamName = 'Team';

    const tp = teamPlayers.find(
      (t) =>
        String(t.playerId) === pIdStr &&
        (String(t.teamId) === String(match.team1Id) || String(t.teamId) === String(match.team2Id))
    );

    if (tp) {
      playerTeamId = tp.teamId;
      const t = teamsMap.get(String(tp.teamId));
      teamName = t ? t.name : String(tp.teamId) === String(match.team1Id) ? 'Team 1' : 'Team 2';
    } else {
      // Default to team1
      playerTeamId = match.team1Id;
      const t = teamsMap.get(String(match.team1Id));
      teamName = t ? t.name : 'Team 1';
    }

    // Batting stats
    const pBatting = battingPerformances.filter((b) => String(b.playerId) === pIdStr);
    const runs = pBatting.reduce((acc, b) => acc + (b.runs || 0), 0);
    const ballsFaced = pBatting.reduce((acc, b) => acc + (b.ballsFaced || 0), 0);
    const fours = pBatting.reduce((acc, b) => acc + (b.fours || 0), 0);
    const sixes = pBatting.reduce((acc, b) => acc + (b.sixes || 0), 0);
    const isOut = pBatting.some((b) => b.isOut);
    const hasBatted = pBatting.length > 0 && (ballsFaced > 0 || runs > 0 || isOut);

    const strikeRate = ballsFaced > 0 ? Math.round(((runs * 100.0) / ballsFaced) * 100) / 100 : 0.0;

    // Bowling stats
    const pBowling = bowlingPerformances.filter((b) => String(b.playerId) === pIdStr);
    const wickets = pBowling.reduce((acc, b) => acc + (b.wickets || 0), 0);
    const ballsBowled = pBowling.reduce((acc, b) => acc + (b.ballsBowled || 0), 0);
    const runsConceded = pBowling.reduce((acc, b) => acc + (b.runsConceded || 0), 0);
    const maidens = pBowling.reduce((acc, b) => acc + (b.maidenOvers || 0), 0);
    const hasBowled = pBowling.length > 0 && ballsBowled > 0;

    const economyRate = ballsBowled > 0 ? Math.round(((runsConceded * 6.0) / ballsBowled) * 100) / 100 : 0.0;
    const oversDisplay = toCricketOvers(ballsBowled);

    // 1. Batting Points
    let battingPoints = 0.0;
    if (hasBatted) {
      battingPoints += runs * 1.0;
      battingPoints += fours * 1.0 + sixes * 2.0;

      if (ballsFaced >= 5 || runs >= 10) {
        if (strikeRate >= 150.0) {
          battingPoints += 15.0;
        } else if (strikeRate >= 125.0) {
          battingPoints += 10.0;
        } else if (strikeRate >= 100.0) {
          battingPoints += 5.0;
        }
      }

      if (runs >= 100) {
        battingPoints += 25.0;
      } else if (runs >= 75) {
        battingPoints += 15.0;
      } else if (runs >= 50) {
        battingPoints += 10.0;
      }
    }

    // 2. Bowling Points
    let bowlingPoints = 0.0;
    if (hasBowled) {
      bowlingPoints += wickets * 20.0;

      if (wickets >= 5) {
        bowlingPoints += 20.0;
      } else if (wickets === 4) {
        bowlingPoints += 15.0;
      } else if (wickets === 3) {
        bowlingPoints += 10.0;
      }

      if (ballsBowled >= 6) {
        if (economyRate <= 5.0) {
          bowlingPoints += 15.0;
        } else if (economyRate <= 7.0) {
          bowlingPoints += 10.0;
        } else if (economyRate <= 9.0) {
          bowlingPoints += 5.0;
        }
      }

      bowlingPoints += maidens * 5.0;
    }

    // 3. All-Rounder Bonus
    let allRounderBonus = 0.0;
    if (runs >= 50 && wickets >= 2) {
      allRounderBonus = 20.0;
    } else if (runs >= 30 && wickets >= 2) {
      allRounderBonus = 15.0;
    } else if (runs >= 20 && wickets >= 1) {
      allRounderBonus = 10.0;
    }

    // 4. Winning Team Bonus
    let winningBonus = 0.0;
    if (match.winningTeamId && String(playerTeamId) === String(match.winningTeamId)) {
      winningBonus = 5.0;
    }

    const totalScore = Math.round((battingPoints + bowlingPoints + allRounderBonus + winningBonus) * 100) / 100;

    const batSummary = hasBatted
      ? `${runs}${isOut ? '' : '*'} (${ballsFaced} balls), ${fours}x4, ${sixes}x6, SR: ${strikeRate}${
          isOut ? '' : ' (not out)'
        }`
      : 'Did not bat';

    const bowlSummary = hasBowled
      ? `${wickets} wicket${wickets === 1 ? '' : 's'}, ${runsConceded} runs, ${oversDisplay} ov, Econ: ${economyRate}`
      : 'Did not bowl';

    const hasContribution = runs > 0 || ballsFaced > 0 || wickets > 0 || ballsBowled > 0;

    leaderboard.push({
      rank: 0,
      playerId: playerId as any,
      playerName: `${player.firstName} ${player.lastName}`.trim(),
      teamId: playerTeamId,
      teamName,
      totalScore,
      battingPoints,
      bowlingPoints,
      allRounderBonus,
      winningTeamBonus: winningBonus,
      runs,
      ballsFaced,
      fours,
      sixes,
      isOut,
      strikeRate,
      wickets,
      ballsBowled,
      oversDisplay,
      runsConceded,
      economyRate,
      maidens,
      battingSummary: batSummary,
      bowlingSummary: bowlSummary,
      hasContribution,
    });
  }

  // Deterministic tie-breaker ranking
  const ranked = [...leaderboard].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    if (b.runs !== a.runs) return b.runs - a.runs;
    const aEcon = a.ballsBowled > 0 ? a.economyRate : 999.0;
    const bEcon = b.ballsBowled > 0 ? b.economyRate : 999.0;
    if (aEcon !== bEcon) return aEcon - bEcon;
    if (b.strikeRate !== a.strikeRate) return b.strikeRate - a.strikeRate;
    return String(a.playerId).localeCompare(String(b.playerId));
  });

  ranked.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  result.leaderboard = ranked;

  const winner = ranked.find((p) => p.hasContribution && p.totalScore > 0);
  if (winner) {
    result.selectedPlayerId = winner.playerId;
    result.selectedPlayerName = winner.playerName;
    result.selectedPlayerTeamName = winner.teamName;
    result.totalScore = winner.totalScore;
    result.battingPoints = winner.battingPoints;
    result.bowlingPoints = winner.bowlingPoints;
    result.allRounderBonus = winner.allRounderBonus;
    result.winningTeamBonus = winner.winningTeamBonus;
    result.battingSummary = winner.battingSummary;
    result.bowlingSummary = winner.bowlingSummary;
  }

  return result;
}
