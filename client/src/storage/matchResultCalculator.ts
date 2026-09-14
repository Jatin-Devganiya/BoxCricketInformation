import { DbMatch, DbMatchInnings, DbTeam } from './dbSchema';
import { MatchResultCalculationResult } from '../types';

export const DEFAULT_TOTAL_WICKETS = 10;

export function calculateMatchResult(
  match: DbMatch,
  inningsList: DbMatchInnings[],
  teamsMap: Map<string, DbTeam>,
  customTotalWickets: number = DEFAULT_TOTAL_WICKETS,
  customTargetRuns?: number
): MatchResultCalculationResult {
  const result: MatchResultCalculationResult = {
    resultDescription: 'Result pending',
    resultType: 'pending',
    winningTeamId: null,
    winningTeamName: null,
    winningMargin: null,
    isComplete: false,
    summary: '',
  };

  if (!match) return result;

  const status = (match.status || '').trim();
  if (status.toLowerCase() === 'abandoned') {
    return {
      resultDescription: 'Match abandoned',
      resultType: 'abandoned',
      winningTeamId: null,
      winningTeamName: null,
      winningMargin: null,
      isComplete: true,
      summary: 'Match abandoned',
    };
  }
  if (status.toLowerCase() === 'cancelled') {
    return {
      resultDescription: 'Match cancelled',
      resultType: 'cancelled',
      winningTeamId: null,
      winningTeamName: null,
      winningMargin: null,
      isComplete: true,
      summary: 'Match cancelled',
    };
  }
  if (status.toLowerCase() === 'noresult' || status.toLowerCase() === 'no result') {
    return {
      resultDescription: 'No result',
      resultType: 'no_result',
      winningTeamId: null,
      winningTeamName: null,
      winningMargin: null,
      isComplete: true,
      summary: 'No result',
    };
  }

  const sortedInnings = [...inningsList].sort((a, b) => a.inningsNumber - b.inningsNumber);
  const inn1 = sortedInnings.find((i) => i.inningsNumber === 1);
  const inn2 = sortedInnings.find((i) => i.inningsNumber === 2);

  if (!inn1) {
    return result;
  }

  const inn1Team = teamsMap.get(String(inn1.teamId));
  const inn1TeamName = inn1Team ? inn1Team.name : `Team ${inn1.teamId}`;

  if (!inn2) {
    result.summary = `${inn1TeamName} scored ${inn1.runs}/${inn1.wickets} (Innings 1 Complete)`;
    return result;
  }

  const inn2Team = teamsMap.get(String(inn2.teamId));
  const inn2TeamName = inn2Team ? inn2Team.name : `Team ${inn2.teamId}`;

  const maxWickets = customTotalWickets > 0 ? customTotalWickets : DEFAULT_TOTAL_WICKETS;
  const inn1Runs = inn1.runs;
  const inn2Runs = inn2.runs;
  const inn2Wickets = inn2.wickets;

  const targetRuns = customTargetRuns && customTargetRuns > 0 ? customTargetRuns : inn1Runs + 1;

  // Case: Second innings team reaches target
  if (inn2Runs >= targetRuns) {
    const wicketsRemaining = Math.max(0, maxWickets - inn2Wickets);
    const wicketSuffix = wicketsRemaining === 1 ? '1 wicket' : `${wicketsRemaining} wickets`;

    result.winningTeamId = inn2.teamId as any;
    result.winningTeamName = inn2TeamName;
    result.winningMargin = wicketsRemaining;
    result.resultType = 'wickets';
    result.resultDescription = `${inn2TeamName} won by ${wicketSuffix}`;
    result.isComplete = true;
    result.summary = `${inn2TeamName} chased ${targetRuns} (${inn2Runs}/${inn2Wickets})`;
    return result;
  }

  // Check if second innings or match is complete
  const isMatchFinalized = match.status?.toLowerCase() === 'completed';
  const isInnings2Finished =
    inn2.status?.toLowerCase() === 'completed' ||
    inn2Wickets >= maxWickets ||
    (match.requiredOvers > 0 && inn2.balls >= match.requiredOvers * 6);

  if (isMatchFinalized || isInnings2Finished) {
    // Tie
    if (inn1Runs === inn2Runs) {
      result.winningTeamId = null;
      result.winningTeamName = null;
      result.winningMargin = 0;
      result.resultType = 'tie';
      result.resultDescription = 'Match tied';
      result.isComplete = true;
      result.summary = `Scores level (${inn1Runs} - ${inn2Runs})`;
      return result;
    }

    // First innings team won
    if (inn1Runs > inn2Runs) {
      const runMargin = inn1Runs - inn2Runs;
      const runSuffix = runMargin === 1 ? '1 run' : `${runMargin} runs`;

      result.winningTeamId = inn1.teamId as any;
      result.winningTeamName = inn1TeamName;
      result.winningMargin = runMargin;
      result.resultType = 'runs';
      result.resultDescription = `${inn1TeamName} won by ${runSuffix}`;
      result.isComplete = true;
      result.summary = `${inn1TeamName} defended ${inn1Runs} (restricted ${inn2TeamName} to ${inn2Runs}/${inn2Wickets})`;
      return result;
    }
  }

  // Innings in progress
  const remainingToChase = targetRuns - inn2Runs;
  result.resultDescription = 'Result pending';
  result.resultType = 'pending';
  result.isComplete = false;
  result.summary = `${inn2TeamName} need ${remainingToChase} run${remainingToChase === 1 ? '' : 's'} to win`;
  return result;
}
