import { STORAGE_KEYS, CompleteExportData, ExportMetadata } from './dbSchema';
import { LocalStorageDataStore } from './LocalStorageDataStore';

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recordCounts: Record<string, number>;
  data?: CompleteExportData;
}

export const backupService = {
  exportAllData: (): CompleteExportData => {
    LocalStorageDataStore.ensureInitialized();

    const roles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.ROLES);
    const users = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USERS).map((u: any) => ({
      ...u,
      // Ensure plain password is never exposed in exports
      passwordHash: u.passwordHash ? '$2a$11$ExportProtectedDevHash' : '',
    }));
    const userRoles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_ROLES);
    const userPermissions = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_PERMISSIONS);
    const rolePermissions = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.ROLE_PERMISSIONS);
    const players = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.PLAYERS);
    const teams = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.TEAMS);
    const teamPlayers = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.TEAM_PLAYERS);
    const series = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.SERIES);
    const matches = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCHES);
    const matchInnings = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCH_INNINGS);
    const ballEvents = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.BALL_EVENTS);
    const dismissals = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.DISMISSALS);
    const matchExtras = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCH_EXTRAS);
    const matchBattingPerformances = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES);
    const matchBowlingPerformances = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES);
    const scorecards = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.SCORECARDS);
    const userLoginHistories = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_LOGIN_HISTORIES);


    const recordCounts: Record<string, number> = {
      roles: roles.length,
      users: users.length,
      userRoles: userRoles.length,
      userPermissions: userPermissions.length,
      rolePermissions: rolePermissions.length,
      players: players.length,
      teams: teams.length,
      teamPlayers: teamPlayers.length,
      series: series.length,
      matches: matches.length,
      matchInnings: matchInnings.length,
      ballEvents: ballEvents.length,
      dismissals: dismissals.length,
      matchExtras: matchExtras.length,
      matchBattingPerformances: matchBattingPerformances.length,
      matchBowlingPerformances: matchBowlingPerformances.length,
      scorecards: scorecards.length,
      userLoginHistories: userLoginHistories.length,
    };

    const exportMetadata: ExportMetadata = {
      applicationName: 'CricketStats',
      exportVersion: '1.0',
      schemaVersion: '1.0',
      storageMode: 'localStorage',
      exportedAt: new Date().toISOString(),
      recordCounts,
    };

    return {
      exportMetadata,
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
  },

  downloadExportFile: (): void => {
    const data = backupService.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CricketStats_Export_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  validateImport: (jsonString: string): ImportValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return {
        isValid: false,
        errors: [`Invalid JSON file format: ${e.message}`],
        warnings: [],
        recordCounts: {},
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        errors: ['Export root must be a JSON object.'],
        warnings: [],
        recordCounts: {},
      };
    }

    if (!parsed.exportMetadata) {
      errors.push("Missing 'exportMetadata' header in backup JSON.");
    }

    const requiredCollections = [
      'roles',
      'users',
      'players',
      'teams',
      'teamPlayers',
      'series',
      'matches',
      'matchInnings',
      'ballEvents',
      'matchBattingPerformances',
      'matchBowlingPerformances',
    ];

    for (const c of requiredCollections) {
      if (!Array.isArray(parsed[c])) {
        errors.push(`Missing required collection '${c}' or it is not an array.`);
      }
    }

    const recordCounts: Record<string, number> = {};
    if (errors.length > 0) {
      return { isValid: false, errors, warnings, recordCounts };
    }

    // Tally record counts
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) {
        recordCounts[key] = parsed[key].length;
      }
    }

    // Check unique IDs within each collection
    const validateUniqueIds = (name: string, list: any[]) => {
      const seen = new Set<string>();
      for (const item of list) {
        if (item.id === undefined || item.id === null) {
          errors.push(`Found record without 'id' in collection '${name}'.`);
          return;
        }
        const idStr = String(item.id);
        if (seen.has(idStr)) {
          errors.push(`Duplicate ID '${idStr}' found in collection '${name}'.`);
          return;
        }
        seen.add(idStr);
      }
    };

    validateUniqueIds('players', parsed.players);
    validateUniqueIds('teams', parsed.teams);
    validateUniqueIds('series', parsed.series);
    validateUniqueIds('matches', parsed.matches);
    validateUniqueIds('matchInnings', parsed.matchInnings);

    // Check key foreign-key relationships
    const playerIds = new Set(parsed.players.map((p: any) => String(p.id)));
    const teamIds = new Set(parsed.teams.map((t: any) => String(t.id)));
    const seriesIds = new Set(parsed.series.map((s: any) => String(s.id)));
    const matchIds = new Set(parsed.matches.map((m: any) => String(m.id)));
    const inningsIds = new Set(parsed.matchInnings.map((i: any) => String(i.id)));

    for (const tp of parsed.teamPlayers) {
      if (!teamIds.has(String(tp.teamId))) {
        warnings.push(`TeamPlayer references non-existent teamId '${tp.teamId}'.`);
      }
      if (!playerIds.has(String(tp.playerId))) {
        warnings.push(`TeamPlayer references non-existent playerId '${tp.playerId}'.`);
      }
    }

    for (const m of parsed.matches) {
      if (!seriesIds.has(String(m.seriesId))) {
        errors.push(`Match '${m.id}' references non-existent seriesId '${m.seriesId}'.`);
      }
      if (!teamIds.has(String(m.team1Id))) {
        errors.push(`Match '${m.id}' references non-existent team1Id '${m.team1Id}'.`);
      }
      if (!teamIds.has(String(m.team2Id))) {
        errors.push(`Match '${m.id}' references non-existent team2Id '${m.team2Id}'.`);
      }
    }

    for (const inn of parsed.matchInnings) {
      if (!matchIds.has(String(inn.matchId))) {
        errors.push(`MatchInnings '${inn.id}' references non-existent matchId '${inn.matchId}'.`);
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      recordCounts,
      data: isValid ? (parsed as CompleteExportData) : undefined,
    };
  },

  importData: (data: CompleteExportData): void => {
    // Topological order of insertion for full relational integrity
    LocalStorageDataStore.setCollection(STORAGE_KEYS.ROLES, data.roles || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.USERS, data.users || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.USER_ROLES, data.userRoles || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.USER_PERMISSIONS, data.userPermissions || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.ROLE_PERMISSIONS, data.rolePermissions || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.PLAYERS, data.players || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.TEAMS, data.teams || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.TEAM_PLAYERS, data.teamPlayers || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.SERIES, data.series || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.MATCHES, data.matches || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.MATCH_INNINGS, data.matchInnings || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.DISMISSALS, data.dismissals || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.MATCH_EXTRAS, data.matchExtras || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES, data.matchBattingPerformances || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES, data.matchBowlingPerformances || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.BALL_EVENTS, data.ballEvents || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.SCORECARDS, data.scorecards || [], false);
    LocalStorageDataStore.setCollection(STORAGE_KEYS.USER_LOGIN_HISTORIES, data.userLoginHistories || [], false);

    // Single flush and index rebuild
    LocalStorageDataStore.persistAllToLocalStorage();
    LocalStorageDataStore.rebuildIndexes();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cricketstats-storage-updated'));
    }
  },

  resetDatabase: (): void => {
    LocalStorageDataStore.clearAll();
    LocalStorageDataStore.seedInitialDatabase();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cricketstats-storage-updated'));
    }
  },
};
