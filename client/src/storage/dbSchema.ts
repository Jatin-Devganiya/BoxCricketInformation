/**
 * Normalized database schema definitions for CricketStats LocalStorage Temporary Database.
 * Every collection corresponds to a SQL Server table in CricketDbContext.
 */

export const STORAGE_KEYS = {
  ROLES: 'cricketstats_roles',
  USERS: 'cricketstats_users',
  USER_ROLES: 'cricketstats_user_roles',
  USER_PERMISSIONS: 'cricketstats_user_permissions',
  ROLE_PERMISSIONS: 'cricketstats_role_permissions',
  PLAYERS: 'cricketstats_players',
  TEAMS: 'cricketstats_teams',
  TEAM_PLAYERS: 'cricketstats_team_players',
  SERIES: 'cricketstats_series',
  MATCHES: 'cricketstats_matches',
  MATCH_INNINGS: 'cricketstats_match_innings',
  BALL_EVENTS: 'cricketstats_ball_events',
  DISMISSALS: 'cricketstats_dismissals',
  MATCH_EXTRAS: 'cricketstats_match_extras',
  MATCH_BATTING_PERFORMANCES: 'cricketstats_match_batting_performances',
  MATCH_BOWLING_PERFORMANCES: 'cricketstats_match_bowling_performances',
  SCORECARDS: 'cricketstats_scorecards',
  USER_LOGIN_HISTORIES: 'cricketstats_user_login_histories',
  MANIFEST: 'cricketstats_manifest',
} as const;

export type EntityId = number | string;

export interface DbRole {
  id: EntityId;
  name: string; // Admin, Umpire, User
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbUser {
  id: EntityId;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  status: string; // Active, Inactive
  createdAt: string;
  updatedAt: string;
}

export interface DbUserRole {
  id: EntityId;
  userId: EntityId;
  roleId: EntityId;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserPermissionOverride {
  id: EntityId;
  userId: EntityId;
  permission: string; // Matches, LiveScoring, UserManagement, Players, Teams, Series
  isAllowed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbRolePermission {
  id: EntityId;
  roleId: EntityId;
  permission: string;
  isAllowed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbPlayer {
  id: EntityId;
  firstName: string;
  lastName: string;
  playerCategory: string; // Batsman, Bowler, AllRounder, WicketKeeper
  status: string; // Active, Inactive
  userId?: EntityId | null;
  createdByUserId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbTeam {
  id: EntityId;
  name: string;
  shortName: string;
  status: string; // Active, Inactive
  createdByUserId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbTeamPlayer {
  id: EntityId;
  teamId: EntityId;
  playerId: EntityId;
  joinedDate: string;
  leftDate?: string | null;
  status: string; // Active, Inactive
  createdAt?: string;
  updatedAt?: string;
}

export interface DbSeries {
  id: EntityId;
  name: string;
  startDate: string;
  endDate: string;
  status: string; // Scheduled, InProgress, Completed, Cancelled
  description?: string | null;
  createdByUserId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbMatch {
  id: EntityId;
  seriesId: EntityId;
  team1Id: EntityId;
  team2Id: EntityId;
  matchOrder: number;
  requiredOvers: number;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: string; // Scheduled, InProgress, Completed, Abandoned, Cancelled
  winningTeamId?: EntityId | null;
  result?: string | null;
  resultType?: string | null; // runs, wickets, tie, abandoned, no_result, pending
  winningMargin?: number | null;
  momPlayerId?: EntityId | null;
  momScore?: number | null;
  createdByUserId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbMatchInnings {
  id: EntityId;
  matchId: EntityId;
  teamId: EntityId; // Batting team
  inningsNumber: number; // 1 or 2
  runs: number;
  wickets: number;
  balls: number; // Legal balls bowled
  extras: number;
  status: string; // Scheduled, InProgress, Completed
  currentStrikerId?: EntityId | null;
  currentNonStrikerId?: EntityId | null;
  currentBowlerId?: EntityId | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbBallEvent {
  id: EntityId;
  matchId: EntityId;
  inningsId: EntityId;
  overNumber: number;
  ballNumber: number;
  deliveryNumber: number;
  strikerPlayerId: EntityId;
  nonStrikerPlayerId: EntityId;
  bowlerPlayerId: EntityId;
  eventType: string; // Normal, Wicket, NoBall, Wide, LegBye, DeadBall
  runs: number;
  batRuns: number;
  extraRuns: number;
  extraType: string; // None, Wide, NoBall, LegBye
  isLegalBall: boolean;
  isWicket: boolean;
  wicketType?: string | null; // Bowled, Caught, RunOut, Stumped, HitWicket
  dismissedPlayerId?: EntityId | null;
  fielderPlayerId?: EntityId | null;
  bowlerCreditedWicket: boolean;
  createdAt: string;
}

export interface DbDismissal {
  id: EntityId;
  matchId: EntityId;
  inningsId: EntityId;
  ballEventId: EntityId;
  dismissedPlayerId: EntityId;
  wicketType: string;
  bowlerId: EntityId;
  fielderId?: EntityId | null;
  catcherId?: EntityId | null;
  stumpingPlayerId?: EntityId | null;
  runOutFielderId?: EntityId | null;
  createdAt: string;
}

export interface DbMatchExtra {
  id: EntityId;
  matchId: EntityId;
  inningsId: EntityId;
  ballEventId: EntityId;
  extraType: string; // Wide, NoBall, Bye, LegBye, DeadBall, Penalty
  runs: number;
  createdAt: string;
}

export interface DbMatchBattingPerformance {
  id: EntityId;
  matchInningsId: EntityId;
  playerId: EntityId;
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
  dismissalType?: string | null; // NotOut, Bowled, Caught, RunOut, Stumped, HitWicket
  bowled: boolean;
  sixInRowCount: number;
  fourInRowCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbMatchBowlingPerformance {
  id: EntityId;
  matchInningsId: EntityId;
  playerId: EntityId;
  ballsBowled: number; // integer count of legal deliveries
  runsConceded: number;
  wickets: number;
  maidenOvers: number;
  hatTricks: number;
  wides: number;
  noBalls: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbScorecard {
  id: EntityId;
  matchId: EntityId;
  inningsId?: EntityId | null;
  totalRuns: number;
  totalWickets: number;
  overs: string;
  extras: number;
  result?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserLoginHistory {
  id: EntityId;
  userId: EntityId;
  username: string;
  sessionId: string;
  loginTime: string;
  logoutTime?: string | null;
  status: string; // Active, Terminated, LoggedOut
  ipAddress?: string | null;
  hostName?: string | null;
  logoutReason?: string | null;
  logoutByUserId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportMetadata {
  applicationName: string;
  exportVersion: string;
  schemaVersion: string;
  storageMode: string;
  exportedAt: string;
  recordCounts: Record<string, number>;
}

export interface CompleteExportData {
  exportMetadata: ExportMetadata;
  roles: DbRole[];
  users: DbUser[];
  userRoles: DbUserRole[];
  userPermissions: DbUserPermissionOverride[];
  rolePermissions: DbRolePermission[];
  players: DbPlayer[];
  teams: DbTeam[];
  teamPlayers: DbTeamPlayer[];
  series: DbSeries[];
  matches: DbMatch[];
  matchInnings: DbMatchInnings[];
  ballEvents: DbBallEvent[];
  dismissals: DbDismissal[];
  matchExtras: DbMatchExtra[];
  matchBattingPerformances: DbMatchBattingPerformance[];
  matchBowlingPerformances: DbMatchBowlingPerformance[];
  scorecards: DbScorecard[];
  userLoginHistories: DbUserLoginHistory[];
}
