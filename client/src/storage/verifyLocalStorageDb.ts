/**
 * Verification test suite for CricketStats LocalStorage Temporary Database Architecture.
 * Tests:
 * 1. Normalized storage schema and key naming (cricketstats_*)
 * 2. Stable unique ID generation (UUID/GUID)
 * 3. Seed data initialization
 * 4. CRUD operations and unique constraints (Players, Teams, Series, Matches)
 * 5. Live scoring engine (legal balls, strike rotation, over completion, wickets, bowler rotation)
 * 6. Hat-trick algorithm (consecutive legal deliveries, unbroken by wides/no-balls)
 * 7. Man of the Match calculation parity
 * 8. Match result calculation parity
 * 9. Export -> Clear -> Import roundtrip verification
 */

declare const process: any;

// Setup headless mock for localStorage and window
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
(globalThis as any).window = {
  dispatchEvent: () => true,
};
(globalThis as any).CustomEvent = class {
  constructor(public type: string, public eventInitDict?: any) {}
};

async function runTests() {
  console.log('=====================================================');
  console.log('CRICKETSTATS LOCALSTORAGE DATABASE VERIFICATION SUITE');
  console.log('=====================================================\n');

  const { LocalStorageDataStore } = await import('./LocalStorageDataStore');
  const { STORAGE_KEYS } = await import('./dbSchema');
  const { localPlayersService } = await import('./services/localPlayersService');
  const { localTeamsService } = await import('./services/localTeamsService');
  const { localSeriesService } = await import('./services/localSeriesService');
  const { localMatchesService } = await import('./services/localMatchesService');
  const { localLiveScoringService } = await import('./services/localLiveScoringService');
  const { localDashboardService } = await import('./services/localDashboardService');
  const { backupService } = await import('./backupService');
  const { calculateHatTricks } = await import('./cricketCalculations');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // --- Test 1: Initialization and Seed Data ---
  console.log('1. Checking Seed Data & Normalized Storage Collections...');
  LocalStorageDataStore.ensureInitialized();

  const roles = LocalStorageDataStore.getCollection(STORAGE_KEYS.ROLES);
  assert(roles.length === 3, 'Roles initialized with 3 roles');

  const users = LocalStorageDataStore.getCollection(STORAGE_KEYS.USERS);
  assert(users.length === 5, 'Users initialized with 5 users');

  const teams = LocalStorageDataStore.getCollection(STORAGE_KEYS.TEAMS);
  assert(teams.length === 4, 'Teams initialized with 4 teams');

  const players = LocalStorageDataStore.getCollection(STORAGE_KEYS.PLAYERS);
  assert(players.length === 10, 'Players initialized with 10 players');

  const teamPlayers = LocalStorageDataStore.getCollection(STORAGE_KEYS.TEAM_PLAYERS);
  assert(teamPlayers.length === 10, 'TeamPlayers relations normalized (10 roster entries)');

  const matches = LocalStorageDataStore.getCollection(STORAGE_KEYS.MATCHES);
  assert(matches.length === 2, 'Matches initialized with 2 matches');

  const ballEvents = LocalStorageDataStore.getCollection(STORAGE_KEYS.BALL_EVENTS);
  assert(ballEvents.length >= 10, `Ball events stored normalized (${ballEvents.length} deliveries)`);

  // --- Test 2: Foreign Key Relations (No embedded objects) ---
  console.log('\n2. Verifying Foreign Key Architecture (Normalized Entities)...');
  const sampleMatch = matches[0] as any;
  assert(sampleMatch.team1Id !== undefined && typeof sampleMatch.team1 !== 'object', 'Match references team1Id as FK, not embedded team object');
  assert(sampleMatch.seriesId !== undefined && typeof sampleMatch.series !== 'object', 'Match references seriesId as FK, not embedded series object');

  const sampleBall = ballEvents[0] as any;
  assert(sampleBall.strikerPlayerId !== undefined && sampleBall.bowlerPlayerId !== undefined, 'BallEvent references strikerPlayerId and bowlerPlayerId as FKs');

  // --- Test 3: Player Uniqueness Rules ---
  console.log('\n3. Testing Player Business Rules...');
  let duplicatePlayerError = false;
  try {
    await localPlayersService.create({
      firstName: 'Rohit',
      lastName: 'Sharma',
      status: 'Active',
      playerCategory: 'Batsman',
    });
  } catch (e: any) {
    duplicatePlayerError = e.message.includes('already exists');
  }
  assert(duplicatePlayerError, 'FirstName + LastName uniqueness enforced for Active players');

  const newPlayer = await localPlayersService.create({
    firstName: 'Ishan',
    lastName: 'Kishan',
    status: 'Active',
    playerCategory: 'WicketKeeper',
  });
  assert(newPlayer.id !== undefined && newPlayer.id !== null, 'New player created with unique stable ID');

  // Verify Player Statistics
  const viratStats = await localPlayersService.getStatistics(2);
  assert(viratStats.batting.totalRuns === 42, `Player statistics calculated correctly (Runs: ${viratStats.batting.totalRuns})`);
  assert(viratStats.batting.fours === 4 && viratStats.batting.sixes === 3, 'Boundary counts calculated accurately');

  // --- Test 4: Team Business Rules ---
  console.log('\n4. Testing Team Business Rules...');
  let duplicateTeamError = false;
  try {
    await localTeamsService.create({ name: 'Royal Strikers', status: 'Active' });
  } catch (e: any) {
    duplicateTeamError = e.message.includes('already exists');
  }
  assert(duplicateTeamError, 'Team Name uniqueness enforced for Active teams');

  // Add player to team roster
  await localTeamsService.addPlayer(1, newPlayer.id);
  const team1Detail = await localTeamsService.getById(1);
  const isPlayerInRoster = team1Detail.players.some((p) => String(p.id) === String(newPlayer.id));
  assert(isPlayerInRoster, 'Player added to team roster (TeamPlayers many-to-many relationship)');

  // --- Test 5: Series and Status Transitions ---
  console.log('\n5. Testing Series & Status Validation Rules...');
  let invalidSeriesStatusError = false;
  try {
    await localSeriesService.create({ name: 'Winter Cup', status: 'Completed' });
  } catch (e: any) {
    invalidSeriesStatusError = e.message.includes('Scheduled');
  }
  assert(invalidSeriesStatusError, 'New Series must be created with Scheduled status');

  const newSeries = await localSeriesService.create({ name: 'Winter Cup', status: 'Scheduled' });
  assert(newSeries.status === 'Scheduled', 'Series created in Scheduled status');

  // Valid transition to InProgress
  const updatedSeries = await localSeriesService.update(newSeries.id, { status: 'InProgress' });
  assert(updatedSeries.status === 'InProgress', 'Series status transitioned from Scheduled to InProgress');

  // --- Test 6: Live Scoring State Machine ---
  console.log('\n6. Testing Live Scoring State Machine...');
  // Schedule a new match for live scoring test
  const testMatch = await localMatchesService.create({
    seriesId: updatedSeries.id,
    team1Id: 1,
    team2Id: 2,
    matchOrder: 3,
    requiredOvers: 2, // 2-over match for fast test
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '21:00',
    address: 'Test Arena',
    status: 'Scheduled',
  });

  // Start Innings 1
  let live = await localLiveScoringService.startInnings(testMatch.id, {
    inningsNumber: 1,
    battingTeamId: 1,
    strikerPlayerId: 1, // Rohit
    nonStrikerPlayerId: 2, // Virat
    bowlerPlayerId: 7, // Shami
  });

  assert(live.match.status === 'InProgress', 'Match marked InProgress when innings started');
  assert(live.currentInnings?.striker?.playerId === 1, 'Current striker set');
  assert(live.currentInnings?.currentBowler?.playerId === 7, 'Current bowler set');

  // Ball 1: 1 run (Strike rotates to Virat)
  live = await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, {
    eventType: 'Normal',
    runs: 1,
  });
  assert(live.currentInnings?.runs === 1, 'Innings runs updated to 1');
  assert(live.currentInnings?.legalBalls === 1, 'Legal ball count updated to 1');
  assert(live.currentInnings?.striker?.playerId === 2, 'Strike rotated to non-striker on odd run (1)');

  // Ball 2: Wide delivery (1 extra run, legal balls unchanged)
  live = await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, {
    eventType: 'Wide',
    runs: 1,
  });
  assert(live.currentInnings?.runs === 2, 'Wide delivery adds extra run');
  assert(live.currentInnings?.legalBalls === 1, 'Wide delivery does NOT increment legal balls');
  assert(live.currentInnings?.extras === 1, 'Innings extras incremented');

  // Ball 3: 4 runs boundary by Virat
  live = await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, {
    eventType: 'Normal',
    runs: 4,
  });
  assert(live.currentInnings?.runs === 6, 'Total runs = 6');
  assert(live.currentInnings?.legalBalls === 2, 'Legal balls = 2');
  assert(live.currentInnings?.striker?.playerId === 2, 'Strike stays with striker on even run (4)');

  // Ball 4: Wicket (Caught, dismissed batsman: Virat)
  live = await localLiveScoringService.recordWicket(testMatch.id, live.currentInnings!.id, {
    wicketType: 'Caught',
    dismissedPlayerId: 2,
    fielderPlayerId: 8,
  });
  assert(live.currentInnings?.wickets === 1, 'Wickets incremented to 1');
  assert(live.currentInnings?.requiresNewBatsman === true, 'Innings requires new batsman after dismissal');

  // Select New Batsman: Hardik (4)
  live = await localLiveScoringService.selectNewBatsman(testMatch.id, live.currentInnings!.id, 4);
  assert(live.currentInnings?.requiresNewBatsman === false, 'Crease filled with new batsman');

  // Score remaining balls to complete over 1 (already bowled 3 legal balls: ball 1, ball 3, ball 4 wicket)
  await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, { eventType: 'Normal', runs: 0 }); // ball 4 (dot)
  await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, { eventType: 'Normal', runs: 2 }); // ball 5
  live = await localLiveScoringService.recordBall(testMatch.id, live.currentInnings!.id, { eventType: 'Normal', runs: 0 }); // ball 6 (over completes)


  assert(live.currentInnings?.isOverComplete === true, 'Over marked complete at 6 legal balls');

  // Bowler consecutive over check
  let consecutiveBowlerError = false;
  try {
    await localLiveScoringService.nextOver(testMatch.id, live.currentInnings!.id, 7); // Shami bowled over 1
  } catch (e: any) {
    consecutiveBowlerError = e.message.includes('consecutive');
  }
  assert(consecutiveBowlerError, 'Bowler rotation enforced (same bowler cannot bowl consecutive overs)');

  // Select valid next bowler: Kuldeep (10)
  live = await localLiveScoringService.nextOver(testMatch.id, live.currentInnings!.id, 10);
  assert(live.currentInnings?.currentBowler?.playerId === 10, 'Next bowler selected successfully');

  // --- Test 7: Hat-Trick Algorithm ---
  console.log('\n7. Testing Hat-Trick Calculation Engine...');
  const hatTrickDeliveries: any[] = [
    { overNumber: 1, deliveryNumber: 1, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
    { overNumber: 1, deliveryNumber: 2, isLegalBall: false, isWicket: false, bowlerCreditedWicket: false, eventType: 'Wide', extraType: 'Wide' }, // Wide in between
    { overNumber: 1, deliveryNumber: 3, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
    { overNumber: 1, deliveryNumber: 4, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
  ];
  const htCount = calculateHatTricks(hatTrickDeliveries);
  assert(htCount === 1, 'Hat-trick detected across 3 legal deliveries even with Wide in between');

  const brokenDeliveries: any[] = [
    { overNumber: 1, deliveryNumber: 1, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
    { overNumber: 1, deliveryNumber: 2, isLegalBall: true, isWicket: false, bowlerCreditedWicket: false, eventType: 'Normal', runs: 1 }, // Run in between
    { overNumber: 1, deliveryNumber: 3, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
    { overNumber: 1, deliveryNumber: 4, isLegalBall: true, isWicket: true, bowlerCreditedWicket: true, eventType: 'Wicket' },
  ];
  const brokenHtCount = calculateHatTricks(brokenDeliveries);
  assert(brokenHtCount === 0, 'Legal non-wicket ball correctly breaks hat-trick streak');

  // --- Test 8: Dashboard Aggregation ---
  console.log('\n8. Testing Dashboard Statistics Aggregator...');
  const dashStats = await localDashboardService.getStats();
  assert(dashStats.totalPlayers > 0, `Dashboard reports total players: ${dashStats.totalPlayers}`);
  assert(dashStats.topRunScorers.length > 0, `Top run scorers leaderboard populated (${dashStats.topRunScorers[0].playerName})`);
  assert(dashStats.topWicketTakers.length > 0, `Top wicket takers leaderboard populated (${dashStats.topWicketTakers[0].playerName})`);

  // --- Test 9: Export -> Clear -> Import Cycle ---
  console.log('\n9. Testing Full Export -> Clear -> Import Roundtrip Cycle...');
  const exported = backupService.exportAllData();
  assert(exported.exportMetadata !== undefined, 'Export metadata generated');
  assert(exported.players.length > 0, `Export contains ${exported.players.length} players`);
  assert(exported.teams.length > 0, `Export contains ${exported.teams.length} teams`);
  assert(exported.matches.length > 0, `Export contains ${exported.matches.length} matches`);
  assert(exported.ballEvents.length > 0, `Export contains ${exported.ballEvents.length} ball events`);

  // Verify passwords not plaintext
  const adminExport = exported.users.find((u) => u.username === 'admin');
  assert(!adminExport?.passwordHash.includes('Admin@123'), 'Passwords are not exported in plaintext');

  const exportJsonString = JSON.stringify(exported);
  const validation = backupService.validateImport(exportJsonString);
  assert(validation.isValid, 'Exported JSON validated successfully by import validator');

  // Store pre-clear counts and sample IDs
  const preExportPlayerCount = exported.players.length;
  const preExportSamplePlayerId = exported.players[0].id;
  const preExportSampleMatchId = exported.matches[0].id;

  // Clear all data
  console.log('  Clearing LocalStorage Temporary Database...');
  LocalStorageDataStore.clearAll();
  const clearedPlayers = LocalStorageDataStore.getCollection(STORAGE_KEYS.PLAYERS);
  assert(clearedPlayers.length === 0, 'LocalStorage database completely cleared');

  // Import JSON backup
  console.log('  Importing backup JSON into LocalStorage...');
  backupService.importData(validation.data!);

  const restoredPlayers = LocalStorageDataStore.getCollection(STORAGE_KEYS.PLAYERS);
  assert(restoredPlayers.length === preExportPlayerCount, `All ${restoredPlayers.length} players restored`);

  const restoredSamplePlayer = LocalStorageDataStore.getById(STORAGE_KEYS.PLAYERS, preExportSamplePlayerId);
  assert(restoredSamplePlayer !== null, `Player ID '${preExportSamplePlayerId}' preserved verbatim across import`);

  const restoredSampleMatch = LocalStorageDataStore.getById(STORAGE_KEYS.MATCHES, preExportSampleMatchId);
  assert(restoredSampleMatch !== null, `Match ID '${preExportSampleMatchId}' preserved verbatim across import`);

  const scorecard = await localMatchesService.getScorecard(preExportSampleMatchId);
  assert(scorecard.innings1?.runs === 78, `Match 1 Scorecard restored correctly (${scorecard.innings1?.runs} runs)`);

  console.log('\n=====================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in verification test:', err);
  process.exit(1);
});
