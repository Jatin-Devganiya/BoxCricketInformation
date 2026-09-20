import {
  DbRole,
  DbUser,
  DbUserRole,
  DbUserPermissionOverride,
  DbRolePermission,
  DbPlayer,
  DbTeam,
  DbTeamPlayer,
  DbSeries,
  DbMatch,
  DbMatchInnings,
  DbBallEvent,
  DbDismissal,
  DbMatchExtra,
  DbMatchBattingPerformance,
  DbMatchBowlingPerformance,
  DbScorecard,
  DbUserLoginHistory,
} from './dbSchema';

export interface InitialSeedDataset {
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

export function generateInitialSeed(): InitialSeedDataset {
  const now = new Date().toISOString();

  // 1. Roles
  const roles: DbRole[] = [
    { id: 1, name: 'Admin', description: 'Administrator with full privileges', createdAt: now, updatedAt: now },
    { id: 2, name: 'Umpire', description: 'Official match umpire and live scorer', createdAt: now, updatedAt: now },
    { id: 3, name: 'User', description: 'Standard viewer account', createdAt: now, updatedAt: now },
  ];

  // 2. Users
  // Passwords are encrypted / hashed format for development safety
  const users: DbUser[] = [
    {
      id: 1,
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: '$2a$11$DevDummyHashAdmin123',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      username: 'umpire',
      firstName: 'Official',
      lastName: 'Umpire',
      passwordHash: '$2a$11$DevDummyHashUmpire123',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      username: 'user',
      firstName: 'Match',
      lastName: 'Scorer',
      passwordHash: '$2a$11$DevDummyHashUser123',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      username: 'john',
      firstName: 'John',
      lastName: 'Official',
      passwordHash: '$2a$11$DevDummyHashJohn123',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      username: 'umpire2',
      firstName: 'Second',
      lastName: 'Umpire',
      passwordHash: '$2a$11$DevDummyHashUmpire2123',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 3. UserRoles
  const userRoles: DbUserRole[] = [
    { id: 1, userId: 1, roleId: 1, createdAt: now, updatedAt: now },
    { id: 2, userId: 2, roleId: 2, createdAt: now, updatedAt: now },
    { id: 3, userId: 3, roleId: 3, createdAt: now, updatedAt: now },
    { id: 4, userId: 4, roleId: 2, createdAt: now, updatedAt: now },
    { id: 5, userId: 5, roleId: 2, createdAt: now, updatedAt: now },
  ];

  // 4. UserPermissions
  const userPermissions: DbUserPermissionOverride[] = [
    { id: 1, userId: 4, permission: 'LiveScoring', isAllowed: false, createdAt: now, updatedAt: now },
  ];

  const rolePermissions: DbRolePermission[] = [
    { id: 1, roleId: 1, permission: 'UserManagement', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 2, roleId: 1, permission: 'Matches', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 3, roleId: 1, permission: 'LiveScoring', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 4, roleId: 1, permission: 'Players', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 5, roleId: 1, permission: 'Teams', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 6, roleId: 1, permission: 'Series', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 7, roleId: 2, permission: 'Matches', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 8, roleId: 2, permission: 'LiveScoring', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 9, roleId: 2, permission: 'Players', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 10, roleId: 2, permission: 'Teams', isAllowed: true, createdAt: now, updatedAt: now },
    { id: 11, roleId: 2, permission: 'Series', isAllowed: true, createdAt: now, updatedAt: now },
  ];

  // 5. Teams (Starts fresh — created from website)
  const teams: DbTeam[] = [];

  // 6. Players (Active 10 players seeded)
  const players: DbPlayer[] = [
    { id: 1, firstName: 'Rohit', lastName: 'Sharma', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 2, firstName: 'Virat', lastName: 'Kohli', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 3, firstName: 'Jasprit', lastName: 'Bumrah', playerCategory: 'Bowler', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 4, firstName: 'Hardik', lastName: 'Pandya', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 5, firstName: 'Ravindra', lastName: 'Jadeja', playerCategory: 'Bowler', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 6, firstName: 'KL', lastName: 'Rahul', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 7, firstName: 'Mohammed', lastName: 'Shami', playerCategory: 'Bowler', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 8, firstName: 'Suryakumar', lastName: 'Yadav', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 9, firstName: 'Rishabh', lastName: 'Pant', playerCategory: 'Batsman', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 10, firstName: 'Kuldeep', lastName: 'Yadav', playerCategory: 'Bowler', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
  ];

  // 7. TeamPlayers (Starts fresh — assigned from website)
  const teamPlayers: DbTeamPlayer[] = [];

  // 8. Series (Starts fresh — created from website)
  const series: DbSeries[] = [];

  // 9. Matches (Starts fresh — scheduled from website)
  const matches: DbMatch[] = [];

  // 10. MatchInnings (Starts fresh — generated during live scoring)
  const matchInnings: DbMatchInnings[] = [];

  // 11. BallEvents (Starts fresh — recorded during live scoring)
  const ballEvents: DbBallEvent[] = [];

  // 12. Dismissals (Starts fresh — recorded during live scoring)
  const dismissals: DbDismissal[] = [];

  // 13. MatchBattingPerformances (Starts fresh — generated during matches)
  const matchBattingPerformances: DbMatchBattingPerformance[] = [];

  // 14. MatchBowlingPerformances (Starts fresh — generated during matches)
  const matchBowlingPerformances: DbMatchBowlingPerformance[] = [];

  // 15. MatchExtras (Starts fresh — recorded during live scoring)
  const matchExtras: DbMatchExtra[] = [];

  // 16. Scorecards (Starts fresh — generated upon match completion)
  const scorecards: DbScorecard[] = [];

  // 17. UserLoginHistories (Starts fresh)
  const userLoginHistories: DbUserLoginHistory[] = [];

  return {
    roles,
    users,
    userRoles,
    userPermissions,
    rolePermissions,
    players,
    teams,
    teamPlayers,
    series,
    matches,
    matchInnings,
    ballEvents,
    dismissals,
    matchExtras,
    matchBattingPerformances,
    matchBowlingPerformances,
    scorecards,
    userLoginHistories,
  };
}
