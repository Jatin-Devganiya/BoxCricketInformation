export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
  roles: string[];
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  playerCategory: string; // Batsman, Bowler, AllRounder, WicketKeeper
  status: string;
  userId?: number;
  currentTeamName?: string;
  createdAt: string;
}

export interface BattingStats {
  matches: number;
  innings: number;
  totalRuns: number;
  ballsFaced: number;
  totalBallsPlayed: number;
  highestScore: number;
  runRate: number; // Strike Rate
  fours: number;
  sixes: number;
  dotBalls: number;
  zeroOutCount: number;
  ones: number;
  twos: number;
  threes: number;
  fives: number;
  sixRunBalls: number;
  sixInRowCount: number;
  fourInRowCount: number;
  dismissals: number;
}

export interface BowlingStats {
  matches: number;
  innings: number;
  ballsBowled: number;
  oversFormatted: string; // e.g. "1.5"
  runsConceded: number;
  wickets: number;
  economyRate: number;
  highestWickets: string; // e.g. "3/26"
  maidenOvers: number;
  hatTricks: number;
  wides: number;
  noBalls: number;
}

export interface FieldingStats {
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface PlayerStatistics {
  playerId: number;
  playerName: string;
  playerCategory: string;
  batting: BattingStats;
  bowling: BowlingStats;
  fielding: FieldingStats;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  status: string;
  playerCount: number;
}

export interface TeamDetail {
  id: number;
  name: string;
  shortName: string;
  status: string;
  players: Player[];
}

export interface Series {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  description?: string;
  totalMatches: number;
  completedMatches: number;
}

export interface SeriesDetail extends Series {
  matches: Match[];
}

export interface Match {
  id: number;
  seriesId: number;
  seriesName: string;
  team1Id: number;
  team1Name: string;
  team1ShortName: string;
  team2Id: number;
  team2Name: string;
  team2ShortName: string;
  matchOrder: number;
  requiredOvers: number;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: string; // Scheduled, InProgress, Completed, Abandoned, Cancelled
  winningTeamId?: number;
  winningTeamName?: string;
  result?: string;
  momPlayerId?: number;
  momPlayerName?: string;
}

export interface BattingRecord {
  id?: number;
  playerId: number;
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dotBalls: number;
  ones: number;
  twos: number;
  threes: number;
  fives: number;
  sixRunBalls: number;
  isOut: boolean;
  dismissalType?: string;
  bowled: boolean;
  sixInRowCount: number;
  fourInRowCount: number;
  strikeRate: number;
}

export interface BowlingRecord {
  id?: number;
  playerId: number;
  playerName: string;
  ballsBowled: number;
  oversDisplay: string;
  runsConceded: number;
  wickets: number;
  maidenOvers: number;
  hatTricks: number;
  wides: number;
  noBalls: number;
  economyRate: number;
}

export interface InningsScorecard {
  id?: number;
  matchId: number;
  teamId: number;
  teamName: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  balls: number;
  oversDisplay: string;
  extras?: number;
  status: string;
  battingPerformances: BattingRecord[];
  bowlingPerformances: BowlingRecord[];
}

export interface Scorecard {
  match: Match;
  innings1?: InningsScorecard;
  innings2?: InningsScorecard;
}

export interface TopPerformer {
  playerId: number;
  playerName: string;
  teamName: string;
  totalRuns: number;
  innings: number;
  strikeRate: number;
}

export interface TopBowler {
  playerId: number;
  playerName: string;
  teamName: string;
  totalWickets: number;
  innings: number;
  economyRate: number;
}

export interface DashboardStats {
  totalPlayers: number;
  totalTeams: number;
  totalSeries: number;
  totalMatches: number;
  completedMatches: number;
  scheduledMatches: number;
  todayMatches: number;
  recentMatches: Match[];
  topRunScorers: TopPerformer[];
  topWicketTakers: TopBowler[];
}

export interface LiveBatsman {
  playerId: number;
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dotBalls: number;
  ones: number;
  twos: number;
  threes: number;
  strikeRate: number;
  isStriker: boolean;
}

export interface LiveBowler {
  playerId: number;
  playerName: string;
  ballsBowled: number;
  oversDisplay: string;
  runsConceded: number;
  wickets: number;
  maidenOvers: number;
  wides: number;
  noBalls: number;
  economyRate: number;
}

export interface BallEventItem {
  id: number;
  overNumber: number;
  ballNumber: number;
  deliveryNumber: number;
  strikerPlayerId: number;
  strikerName: string;
  nonStrikerPlayerId: number;
  nonStrikerName: string;
  bowlerPlayerId: number;
  bowlerName: string;
  eventType: string; // Normal, Wide, NoBall, LegBye, DeadBall, Wicket
  runs: number;
  batRuns: number;
  extraRuns: number;
  extraType: string;
  isLegalBall: boolean;
  isWicket: boolean;
  wicketType?: string;
  dismissedPlayerId?: number;
  dismissedPlayerName?: string;
  fielderPlayerId?: number;
  fielderPlayerName?: string;
  bowlerCreditedWicket: boolean;
  displayText: string;
  createdAt: string;
}

export interface LiveInnings {
  id: number;
  matchId: number;
  inningsNumber: number;
  currentOverNumber: number;
  battingTeamId: number;
  battingTeamName: string;
  battingTeamShortName: string;
  bowlingTeamId: number;
  bowlingTeamName: string;
  bowlingTeamShortName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  extras: number;
  status: string;
  currentRunRate: number;
  targetRuns?: number;
  requiredRunRate?: number;
  striker?: LiveBatsman;
  nonStriker?: LiveBatsman;
  currentBowler?: LiveBowler;
  previousBowlerId?: number;
  previousBowlerName?: string;
  isOverComplete: boolean;
  requiresNewBatsman: boolean;
  lastDismissedPlayerId?: number;
  currentOverDeliveries: BallEventItem[];
  allDeliveries?: BallEventItem[];
  battingPerformances: BattingRecord[];
  bowlingPerformances: BowlingRecord[];
}

export interface LiveScore {
  match: Match;
  activeInningsNumber: number;
  innings1?: LiveInnings;
  innings2?: LiveInnings;
  currentInnings?: LiveInnings;
  isInningsComplete: boolean;
  isMatchComplete: boolean;
  matchSummary?: string;
}

export interface StartInningsPayload {
  inningsNumber: number;
  battingTeamId: number;
  strikerPlayerId: number;
  nonStrikerPlayerId: number;
  bowlerPlayerId: number;
}

export interface RecordBallPayload {
  eventType: string;
  runs?: number;
  batRuns?: number;
  extraRuns?: number;
  extraType?: string;
  bowlerPlayerId?: number;
  strikerPlayerId?: number;
  nonStrikerPlayerId?: number;
  overNumber?: number;
  ballNumber?: number;
}

export interface RecordWicketPayload {
  dismissedPlayerId: number;
  wicketType: string;
  fielderPlayerId?: number;
  runsScored?: number;
}
