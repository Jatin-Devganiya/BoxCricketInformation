export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
  roles: string[];
  overrides?: Record<string, string>;
  effectivePermissions?: Record<string, boolean>;
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
  manOfTheMatchCount?: number;
  totalRuns?: number;
  totalWickets?: number;
  battingRank?: number | null;
  bowlingRank?: number | null;
  createdByUserId?: number;
  createdByUsername?: string;
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
  manOfTheMatchCount: number;
  momCount?: number;
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
  createdByUserId?: number;
  createdByUsername?: string;
}

export interface TeamDetail {
  id: number;
  name: string;
  shortName: string;
  status: string;
  players: Player[];
  createdByUserId?: number;
  createdByUsername?: string;
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
  createdByUserId?: number;
  createdByUsername?: string;
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
  momScore?: number | null;
  resultType?: string;
  winningMargin?: number;
  createdByUserId?: number;
  createdByUsername?: string;
}

export interface ActiveSession {
  id: number;
  userId: number;
  username: string;
  sessionId: string;
  roles: string[];
  loginTime: string;
  status: string;
  ipAddress?: string;
  hostName?: string;
}

export interface LoginHistory {
  id: number;
  userId: number;
  username: string;
  sessionId: string;
  roles: string[];
  loginTime: string;
  logoutTime?: string;
  status: string;
  ipAddress?: string;
  hostName?: string;
  logoutReason?: string;
  logoutByUserId?: number;
  logoutByUsername?: string;
}

export interface LoginHistoryFilter {
  username?: string;
  userId?: number;
  role?: string;
  status?: string;
  ipAddress?: string;
  fromDate?: string;
  toDate?: string;
  logoutFromDate?: string;
  logoutToDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  hatTricks: number;
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

export interface ChasingStatus {
  target: number;
  currentRuns: number;
  runsToWin: number;
  totalLegalBalls: number;
  legalBallsBowled: number;
  ballsLeft: number;
  displayText: string;
  isTargetChased: boolean;
  isTargetNotReached: boolean;
  isActive: boolean;
}

export interface EligibleBowlerItem {
  playerId: number;
  playerName: string;
  playerCategory: string;
  legalBallsBowled: number;
  oversDisplay: string;
  runsConceded: number;
  wickets: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface EligibleBowlersResponse {
  currentBowlerId: number;
  currentBowlerName: string;
  currentOverNumber: number;
  legalBallsBowledInOver: number;
  totalDeliveriesInOver: number;
  isMidOver: boolean;
  eligibleBowlers: EligibleBowlerItem[];
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
  chasingStatus?: ChasingStatus | null;
  striker?: LiveBatsman;
  nonStriker?: LiveBatsman;
  currentBowler?: LiveBowler;
  previousBowlerId?: number;
  previousBowlerName?: string;
  isOverComplete: boolean;
  requiresNewBatsman: boolean;
  lastDismissedPlayerId?: number;
  canChangeBowlerPreOver?: boolean;
  canReplaceBowlerMidOver?: boolean;
  currentOverLegalBalls?: number;
  currentOverDeliveriesCount?: number;
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
  chasingStatus?: ChasingStatus | null;
  momDetails?: MomCalculationResult | null;
  calculatedResult?: MatchResultCalculationResult | null;
}

export interface MatchResultCalculationResult {
  resultDescription: string;
  resultType: string;
  winningTeamId?: number | null;
  winningTeamName?: string | null;
  winningMargin?: number | null;
  isComplete: boolean;
  summary: string;
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

export interface PlayerMomScore {
  rank: number;
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  totalScore: number;
  battingPoints: number;
  bowlingPoints: number;
  allRounderBonus: number;
  winningTeamBonus: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  strikeRate: number;
  wickets: number;
  ballsBowled: number;
  oversDisplay: string;
  runsConceded: number;
  economyRate: number;
  maidens: number;
  battingSummary: string;
  bowlingSummary: string;
  hasContribution: boolean;
}

export interface MomCalculationResult {
  selectedPlayerId?: number | null;
  selectedPlayerName?: string | null;
  selectedPlayerTeamName?: string | null;
  totalScore: number;
  battingPoints: number;
  bowlingPoints: number;
  allRounderBonus: number;
  winningTeamBonus: number;
  battingSummary: string;
  bowlingSummary: string;
  leaderboard: PlayerMomScore[];
}

export interface ExportMetadata {
  applicationName: string;
  exportVersion: string;
  schemaVersion: string;
  storageMode: string;
  exportedAt: string;
  recordCounts: Record<string, number>;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recordCounts: Record<string, number>;
  data?: any;
}

