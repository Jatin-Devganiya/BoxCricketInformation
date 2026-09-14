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

  // 5. Teams
  const teams: DbTeam[] = [
    { id: 1, name: 'Royal Strikers', shortName: 'RS', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 2, name: 'Thunder Kings', shortName: 'TK', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 3, name: 'Super Blasters', shortName: 'SB', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
    { id: 4, name: 'Phoenix Warriors', shortName: 'PW', status: 'Active', createdByUserId: 1, createdAt: now, updatedAt: now },
  ];

  // 6. Players
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

  // 7. TeamPlayers
  const teamPlayers: DbTeamPlayer[] = [
    // Royal Strikers (Team 1)
    { id: 1, teamId: 1, playerId: 1, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 2, teamId: 1, playerId: 2, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 3, teamId: 1, playerId: 3, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 4, teamId: 1, playerId: 4, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 5, teamId: 1, playerId: 5, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    // Thunder Kings (Team 2)
    { id: 6, teamId: 2, playerId: 6, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 7, teamId: 2, playerId: 7, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 8, teamId: 2, playerId: 8, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 9, teamId: 2, playerId: 9, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
    { id: 10, teamId: 2, playerId: 10, joinedDate: now, status: 'Active', createdAt: now, updatedAt: now },
  ];

  // 8. Series
  const series: DbSeries[] = [
    {
      id: 1,
      name: 'Box Cricket Premier League 2026',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'InProgress',
      description: 'Premier 6-overs Box Cricket Tournament',
      createdByUserId: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 9. Matches
  const matches: DbMatch[] = [
    {
      id: 1,
      seriesId: 1,
      team1Id: 1,
      team2Id: 2,
      matchOrder: 1,
      requiredOvers: 6,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '19:00',
      address: 'Surat Box Cricket Arena, Pitch 1',
      status: 'Completed',
      winningTeamId: 1,
      result: 'Royal Strikers won by 14 runs',
      resultType: 'runs',
      winningMargin: 14,
      momPlayerId: 2, // Virat Kohli
      momScore: 82.0,
      createdByUserId: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      seriesId: 1,
      team1Id: 3,
      team2Id: 4,
      matchOrder: 2,
      requiredOvers: 6,
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      scheduledTime: '20:30',
      address: 'Surat Box Cricket Arena, Pitch 2',
      status: 'Scheduled',
      createdByUserId: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 10. MatchInnings
  const matchInnings: DbMatchInnings[] = [
    {
      id: 1,
      matchId: 1,
      teamId: 1,
      inningsNumber: 1,
      runs: 78,
      wickets: 2,
      balls: 36, // 6.0 overs
      extras: 3,
      status: 'Completed',
      currentStrikerId: 2,
      currentNonStrikerId: 4,
      currentBowlerId: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      matchId: 1,
      teamId: 2,
      inningsNumber: 2,
      runs: 64,
      wickets: 4,
      balls: 36, // 6.0 overs
      extras: 1,
      status: 'Completed',
      currentStrikerId: 9,
      currentNonStrikerId: 8,
      currentBowlerId: 3,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 11. Batting Performances
  const matchBattingPerformances: DbMatchBattingPerformance[] = [
    // Innings 1: RS
    {
      id: 1,
      matchInningsId: 1,
      playerId: 1, // Rohit
      runs: 24,
      ballsFaced: 12,
      fours: 2,
      sixes: 2,
      dotBalls: 2,
      ones: 4,
      twos: 2,
      threes: 0,
      fives: 0,
      sixRunBalls: 2,
      isOut: true,
      dismissalType: 'Caught',
      bowled: false,
      sixInRowCount: 1,
      fourInRowCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      matchInningsId: 1,
      playerId: 2, // Virat
      runs: 42,
      ballsFaced: 18,
      fours: 4,
      sixes: 3,
      dotBalls: 1,
      ones: 6,
      twos: 4,
      threes: 0,
      fives: 0,
      sixRunBalls: 3,
      isOut: false,
      dismissalType: 'NotOut',
      bowled: false,
      sixInRowCount: 2,
      fourInRowCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      matchInningsId: 1,
      playerId: 4, // Hardik
      runs: 12,
      ballsFaced: 6,
      fours: 1,
      sixes: 1,
      dotBalls: 1,
      ones: 2,
      twos: 1,
      threes: 0,
      fives: 0,
      sixRunBalls: 1,
      isOut: true,
      dismissalType: 'Bowled',
      bowled: true,
      sixInRowCount: 0,
      fourInRowCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    // Innings 2: TK
    {
      id: 4,
      matchInningsId: 2,
      playerId: 6, // Rahul
      runs: 18,
      ballsFaced: 11,
      fours: 2,
      sixes: 1,
      dotBalls: 3,
      ones: 2,
      twos: 1,
      threes: 0,
      fives: 0,
      sixRunBalls: 1,
      isOut: true,
      dismissalType: 'Bowled',
      bowled: true,
      sixInRowCount: 0,
      fourInRowCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      matchInningsId: 2,
      playerId: 8, // Surya
      runs: 32,
      ballsFaced: 15,
      fours: 3,
      sixes: 2,
      dotBalls: 2,
      ones: 4,
      twos: 2,
      threes: 0,
      fives: 0,
      sixRunBalls: 2,
      isOut: true,
      dismissalType: 'Caught',
      bowled: false,
      sixInRowCount: 1,
      fourInRowCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      matchInningsId: 2,
      playerId: 9, // Pant
      runs: 14,
      ballsFaced: 10,
      fours: 1,
      sixes: 1,
      dotBalls: 3,
      ones: 3,
      twos: 1,
      threes: 0,
      fives: 0,
      sixRunBalls: 1,
      isOut: false,
      dismissalType: 'NotOut',
      bowled: false,
      sixInRowCount: 0,
      fourInRowCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 12. Bowling Performances
  const matchBowlingPerformances: DbMatchBowlingPerformance[] = [
    // Innings 1 Bowlers (TK)
    {
      id: 1,
      matchInningsId: 1,
      playerId: 7, // Shami
      ballsBowled: 18, // 3.0 overs
      runsConceded: 36,
      wickets: 1,
      maidenOvers: 0,
      hatTricks: 0,
      wides: 1,
      noBalls: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      matchInningsId: 1,
      playerId: 10, // Kuldeep
      ballsBowled: 18, // 3.0 overs
      runsConceded: 42,
      wickets: 1,
      maidenOvers: 0,
      hatTricks: 0,
      wides: 2,
      noBalls: 1,
      createdAt: now,
      updatedAt: now,
    },
    // Innings 2 Bowlers (RS)
    {
      id: 3,
      matchInningsId: 2,
      playerId: 3, // Bumrah
      ballsBowled: 18, // 3.0 overs
      runsConceded: 26,
      wickets: 3,
      maidenOvers: 1,
      hatTricks: 1, // Has 1 hat-trick!
      wides: 0,
      noBalls: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      matchInningsId: 2,
      playerId: 5, // Jadeja
      ballsBowled: 18, // 3.0 overs
      runsConceded: 38,
      wickets: 1,
      maidenOvers: 0,
      hatTricks: 0,
      wides: 1,
      noBalls: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 13. BallEvents (Representative detailed events for Innings 1 & 2)
  const ballEvents: DbBallEvent[] = [
    // Innings 1 Over 1
    { id: 1, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 1, deliveryNumber: 1, strikerPlayerId: 1, nonStrikerPlayerId: 2, bowlerPlayerId: 7, eventType: 'Normal', runs: 4, batRuns: 4, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 2, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 2, deliveryNumber: 2, strikerPlayerId: 1, nonStrikerPlayerId: 2, bowlerPlayerId: 7, eventType: 'Normal', runs: 1, batRuns: 1, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 3, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 3, deliveryNumber: 3, strikerPlayerId: 2, nonStrikerPlayerId: 1, bowlerPlayerId: 7, eventType: 'Normal', runs: 6, batRuns: 6, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 4, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 4, deliveryNumber: 4, strikerPlayerId: 2, nonStrikerPlayerId: 1, bowlerPlayerId: 7, eventType: 'Normal', runs: 2, batRuns: 2, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 5, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 5, deliveryNumber: 5, strikerPlayerId: 2, nonStrikerPlayerId: 1, bowlerPlayerId: 7, eventType: 'Wide', runs: 1, batRuns: 0, extraRuns: 1, extraType: 'Wide', isLegalBall: false, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 6, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 5, deliveryNumber: 6, strikerPlayerId: 2, nonStrikerPlayerId: 1, bowlerPlayerId: 7, eventType: 'Normal', runs: 1, batRuns: 1, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },
    { id: 7, matchId: 1, inningsId: 1, overNumber: 1, ballNumber: 6, deliveryNumber: 7, strikerPlayerId: 1, nonStrikerPlayerId: 2, bowlerPlayerId: 7, eventType: 'Normal', runs: 0, batRuns: 0, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, createdAt: now },

    // Innings 2 Bumrah Hat-Trick Over (Over 2 of Innings 2)
    { id: 8, matchId: 1, inningsId: 2, overNumber: 2, ballNumber: 1, deliveryNumber: 1, strikerPlayerId: 6, nonStrikerPlayerId: 8, bowlerPlayerId: 3, eventType: 'Wicket', runs: 0, batRuns: 0, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: true, wicketType: 'Bowled', dismissedPlayerId: 6, bowlerCreditedWicket: true, createdAt: now },
    { id: 9, matchId: 1, inningsId: 2, overNumber: 2, ballNumber: 2, deliveryNumber: 2, strikerPlayerId: 7, nonStrikerPlayerId: 8, bowlerPlayerId: 3, eventType: 'Wicket', runs: 0, batRuns: 0, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: true, wicketType: 'Caught', dismissedPlayerId: 7, fielderPlayerId: 2, bowlerCreditedWicket: true, createdAt: now },
    { id: 10, matchId: 1, inningsId: 2, overNumber: 2, ballNumber: 3, deliveryNumber: 3, strikerPlayerId: 10, nonStrikerPlayerId: 8, bowlerPlayerId: 3, eventType: 'Wicket', runs: 0, batRuns: 0, extraRuns: 0, extraType: 'None', isLegalBall: true, isWicket: true, wicketType: 'Bowled', dismissedPlayerId: 10, bowlerCreditedWicket: true, createdAt: now },
  ];

  // 14. Dismissals
  const dismissals: DbDismissal[] = [
    { id: 1, matchId: 1, inningsId: 1, ballEventId: 1, dismissedPlayerId: 1, wicketType: 'Caught', bowlerId: 7, fielderId: 6, catcherId: 6, createdAt: now },
    { id: 2, matchId: 1, inningsId: 1, ballEventId: 2, dismissedPlayerId: 4, wicketType: 'Bowled', bowlerId: 10, createdAt: now },
    { id: 3, matchId: 1, inningsId: 2, ballEventId: 8, dismissedPlayerId: 6, wicketType: 'Bowled', bowlerId: 3, createdAt: now },
    { id: 4, matchId: 1, inningsId: 2, ballEventId: 9, dismissedPlayerId: 7, wicketType: 'Caught', bowlerId: 3, fielderId: 2, catcherId: 2, createdAt: now },
    { id: 5, matchId: 1, inningsId: 2, ballEventId: 10, dismissedPlayerId: 10, wicketType: 'Bowled', bowlerId: 3, createdAt: now },
  ];

  // 15. MatchExtras
  const matchExtras: DbMatchExtra[] = [
    { id: 1, matchId: 1, inningsId: 1, ballEventId: 5, extraType: 'Wide', runs: 1, createdAt: now },
  ];

  // 16. Scorecards
  const scorecards: DbScorecard[] = [
    { id: 1, matchId: 1, inningsId: 1, totalRuns: 78, totalWickets: 2, overs: '6.0', extras: 3, result: 'Royal Strikers won by 14 runs', createdAt: now, updatedAt: now },
    { id: 2, matchId: 1, inningsId: 2, totalRuns: 64, totalWickets: 4, overs: '6.0', extras: 1, result: 'Royal Strikers won by 14 runs', createdAt: now, updatedAt: now },
  ];

  // 17. UserLoginHistories
  const userLoginHistories: DbUserLoginHistory[] = [
    { id: 1, userId: 1, username: 'admin', sessionId: 'sess-dev-001', loginTime: now, status: 'Active', ipAddress: '127.0.0.1', hostName: 'localhost', createdAt: now, updatedAt: now },
  ];

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
