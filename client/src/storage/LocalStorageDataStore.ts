import {
  STORAGE_KEYS,
  EntityId,
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
  CompleteExportData,
} from './dbSchema';
import { generateInitialSeed } from './dbSeed';

const CHUNK_THRESHOLD = 1500;

class LocalStorageDataStoreManager {
  private cache: Map<string, any[]> = new Map();
  private initialized = false;

  // Lightweight Indexes
  public matchesBySeries: Map<string, string[]> = new Map();
  public inningsByMatch: Map<string, string[]> = new Map();
  public ballsByInnings: Map<string, string[]> = new Map();
  public playersByTeam: Map<string, string[]> = new Map();
  public battingByInnings: Map<string, string[]> = new Map();
  public bowlingByInnings: Map<string, string[]> = new Map();
  public battingByPlayer: Map<string, string[]> = new Map();
  public bowlingByPlayer: Map<string, string[]> = new Map();

  // Pending write debounce map
  private pendingWrites: Set<string> = new Set();
  private writeTimer: any = null;

  constructor() {
    this.ensureInitialized();
  }

  public ensureInitialized(): void {
    if (this.initialized) return;

    try {
      const hasData = localStorage.getItem(STORAGE_KEYS.ROLES);
      if (!hasData) {
        this.seedInitialDatabase();
      } else {
        this.loadAllFromLocalStorage();
        this.migrateNonNumericIds();
      }
      this.rebuildIndexes();
      this.initialized = true;
    } catch (e) {
      console.warn('LocalStorageDataStore initialization warning:', e);
      this.seedInitialDatabase();
      this.rebuildIndexes();
      this.initialized = true;
    }
  }

  public seedInitialDatabase(): void {
    const seed = generateInitialSeed();
    this.cache.set(STORAGE_KEYS.ROLES, seed.roles);
    this.cache.set(STORAGE_KEYS.USERS, seed.users);
    this.cache.set(STORAGE_KEYS.USER_ROLES, seed.userRoles);
    this.cache.set(STORAGE_KEYS.USER_PERMISSIONS, seed.userPermissions);
    this.cache.set(STORAGE_KEYS.ROLE_PERMISSIONS, seed.rolePermissions);
    this.cache.set(STORAGE_KEYS.PLAYERS, seed.players);
    this.cache.set(STORAGE_KEYS.TEAMS, seed.teams);
    this.cache.set(STORAGE_KEYS.TEAM_PLAYERS, seed.teamPlayers);
    this.cache.set(STORAGE_KEYS.SERIES, seed.series);
    this.cache.set(STORAGE_KEYS.MATCHES, seed.matches);
    this.cache.set(STORAGE_KEYS.MATCH_INNINGS, seed.matchInnings);
    this.cache.set(STORAGE_KEYS.BALL_EVENTS, seed.ballEvents);
    this.cache.set(STORAGE_KEYS.DISMISSALS, seed.dismissals);
    this.cache.set(STORAGE_KEYS.MATCH_EXTRAS, seed.matchExtras);
    this.cache.set(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES, seed.matchBattingPerformances);
    this.cache.set(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES, seed.matchBowlingPerformances);
    this.cache.set(STORAGE_KEYS.SCORECARDS, seed.scorecards);
    this.cache.set(STORAGE_KEYS.USER_LOGIN_HISTORIES, seed.userLoginHistories);

    this.persistAllToLocalStorage();
    this.rebuildIndexes();
  }

  private loadAllFromLocalStorage(): void {
    const allKeys = Object.values(STORAGE_KEYS);
    for (const key of allKeys) {
      if (key === STORAGE_KEYS.MANIFEST) continue;
      this.cache.set(key, this.readCollectionFromStorage(key));
    }
  }

  private readCollectionFromStorage(key: string): any[] {
    try {
      // Check if chunked manifest exists
      const manifestRaw = localStorage.getItem(`${key}_manifest`);
      if (manifestRaw) {
        const manifest = JSON.parse(manifestRaw);
        if (Array.isArray(manifest.chunks)) {
          const items: any[] = [];
          for (const chunkKey of manifest.chunks) {
            const chunkRaw = localStorage.getItem(chunkKey);
            if (chunkRaw) {
              items.push(...JSON.parse(chunkRaw));
            }
          }
          return items;
        }
      }

      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error reading key ${key} from localStorage:`, e);
      return [];
    }
  }

  public persistAllToLocalStorage(): void {
    for (const [key, items] of this.cache.entries()) {
      this.writeCollectionToStorage(key, items);
    }
  }

  private writeCollectionToStorage(key: string, items: any[]): void {
    try {
      if (items.length > CHUNK_THRESHOLD) {
        // Chunk large collection
        const chunkSize = 1000;
        const numChunks = Math.ceil(items.length / chunkSize);
        const chunkKeys: string[] = [];

        for (let i = 0; i < numChunks; i++) {
          const chunkKey = `${key}_chunk_${i}`;
          const chunkData = items.slice(i * chunkSize, (i + 1) * chunkSize);
          localStorage.setItem(chunkKey, JSON.stringify(chunkData));
          chunkKeys.push(chunkKey);
        }

        // Clean up old extra chunks if any
        let extraIdx = numChunks;
        while (localStorage.getItem(`${key}_chunk_${extraIdx}`)) {
          localStorage.removeItem(`${key}_chunk_${extraIdx}`);
          extraIdx++;
        }

        // Save manifest and remove legacy flat key
        localStorage.setItem(`${key}_manifest`, JSON.stringify({ chunks: chunkKeys, total: items.length }));
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(items));
        // Remove chunk manifest if previously chunked
        const manifestRaw = localStorage.getItem(`${key}_manifest`);
        if (manifestRaw) {
          try {
            const manifest = JSON.parse(manifestRaw);
            if (Array.isArray(manifest.chunks)) {
              for (const ck of manifest.chunks) localStorage.removeItem(ck);
            }
          } catch {}
          localStorage.removeItem(`${key}_manifest`);
        }
      }
    } catch (e) {
      console.error(`Storage quota error or write failure on ${key}:`, e);
    }
  }

  public rebuildIndexes(): void {
    this.matchesBySeries.clear();
    this.inningsByMatch.clear();
    this.ballsByInnings.clear();
    this.playersByTeam.clear();
    this.battingByInnings.clear();
    this.bowlingByInnings.clear();
    this.battingByPlayer.clear();
    this.bowlingByPlayer.clear();

    const matches: DbMatch[] = this.cache.get(STORAGE_KEYS.MATCHES) || [];
    for (const m of matches) {
      const sKey = String(m.seriesId);
      if (!this.matchesBySeries.has(sKey)) this.matchesBySeries.set(sKey, []);
      this.matchesBySeries.get(sKey)!.push(String(m.id));
    }

    const innings: DbMatchInnings[] = this.cache.get(STORAGE_KEYS.MATCH_INNINGS) || [];
    for (const inn of innings) {
      const mKey = String(inn.matchId);
      if (!this.inningsByMatch.has(mKey)) this.inningsByMatch.set(mKey, []);
      this.inningsByMatch.get(mKey)!.push(String(inn.id));
    }

    const balls: DbBallEvent[] = this.cache.get(STORAGE_KEYS.BALL_EVENTS) || [];
    for (const b of balls) {
      const iKey = String(b.inningsId);
      if (!this.ballsByInnings.has(iKey)) this.ballsByInnings.set(iKey, []);
      this.ballsByInnings.get(iKey)!.push(String(b.id));
    }

    const teamPlayers: DbTeamPlayer[] = this.cache.get(STORAGE_KEYS.TEAM_PLAYERS) || [];
    for (const tp of teamPlayers) {
      const tKey = String(tp.teamId);
      if (!this.playersByTeam.has(tKey)) this.playersByTeam.set(tKey, []);
      this.playersByTeam.get(tKey)!.push(String(tp.playerId));
    }

    const batting: DbMatchBattingPerformance[] = this.cache.get(STORAGE_KEYS.MATCH_BATTING_PERFORMANCES) || [];
    for (const bp of batting) {
      const iKey = String(bp.matchInningsId);
      if (!this.battingByInnings.has(iKey)) this.battingByInnings.set(iKey, []);
      this.battingByInnings.get(iKey)!.push(String(bp.id));

      const pKey = String(bp.playerId);
      if (!this.battingByPlayer.has(pKey)) this.battingByPlayer.set(pKey, []);
      this.battingByPlayer.get(pKey)!.push(String(bp.id));
    }

    const bowling: DbMatchBowlingPerformance[] = this.cache.get(STORAGE_KEYS.MATCH_BOWLING_PERFORMANCES) || [];
    for (const bowl of bowling) {
      const iKey = String(bowl.matchInningsId);
      if (!this.bowlingByInnings.has(iKey)) this.bowlingByInnings.set(iKey, []);
      this.bowlingByInnings.get(iKey)!.push(String(bowl.id));

      const pKey = String(bowl.playerId);
      if (!this.bowlingByPlayer.has(pKey)) this.bowlingByPlayer.set(pKey, []);
      this.bowlingByPlayer.get(pKey)!.push(String(bowl.id));
    }
  }

  // --- Collection Accessors ---

  public getCollection<T>(key: string): T[] {
    this.ensureInitialized();
    return (this.cache.get(key) as T[]) || [];
  }

  public getById<T extends { id: EntityId }>(key: string, id: EntityId): T | null {
    this.ensureInitialized();
    const items = this.getCollection<T>(key);
    const idStr = String(id);
    return items.find((i) => String(i.id) === idStr) || null;
  }

  public insert<T extends { id: EntityId }>(key: string, item: T, immediate = true): T {
    this.ensureInitialized();
    const items = this.getCollection<T>(key);

    // If ID is missing, assign a numeric ID
    if (item.id === undefined || item.id === null || item.id === '') {
      const numericIds = items
        .map((i) => (typeof i.id === 'number' ? i.id : parseInt(String(i.id), 10)))
        .filter((n) => !isNaN(n) && isFinite(n));
      item.id = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    }

    items.push(item);

    if (immediate) {
      this.writeCollectionToStorage(key, items);
      this.rebuildIndexes();
    } else {
      this.scheduleWrite(key);
    }

    this.notifyUpdate();
    return item;
  }

  public update<T extends { id: EntityId }>(key: string, id: EntityId, updates: Partial<T>, immediate = true): T | null {
    this.ensureInitialized();
    const items = this.getCollection<T>(key);
    const idStr = String(id);
    const idx = items.findIndex((i) => String(i.id) === idStr);

    if (idx === -1) return null;

    const existing = items[idx];
    const updated = { ...existing, ...updates, id: existing.id }; // Preserve original ID strictly
    items[idx] = updated;

    if (immediate) {
      this.writeCollectionToStorage(key, items);
      this.rebuildIndexes();
    } else {
      this.scheduleWrite(key);
    }

    this.notifyUpdate();
    return updated;
  }

  public delete(key: string, id: EntityId, immediate = true): boolean {
    this.ensureInitialized();
    const items = this.getCollection(key);
    const idStr = String(id);
    const idx = items.findIndex((i: any) => String(i.id) === idStr);

    if (idx === -1) return false;

    items.splice(idx, 1);

    if (immediate) {
      this.writeCollectionToStorage(key, items);
      this.rebuildIndexes();
    } else {
      this.scheduleWrite(key);
    }

    this.notifyUpdate();
    return true;
  }

  public setCollection<T>(key: string, items: T[], immediate = true): void {
    this.cache.set(key, items);
    if (immediate) {
      this.writeCollectionToStorage(key, items);
      this.rebuildIndexes();
    } else {
      this.scheduleWrite(key);
    }
    this.notifyUpdate();
  }

  private scheduleWrite(key: string): void {
    this.pendingWrites.add(key);
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.flushPendingWrites();
    }, 150);
  }

  public flushPendingWrites(): void {
    if (this.pendingWrites.size === 0) return;
    for (const key of this.pendingWrites) {
      const items = this.cache.get(key) || [];
      this.writeCollectionToStorage(key, items);
    }
    this.pendingWrites.clear();
    this.rebuildIndexes();
  }

  private notifyUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cricketstats-storage-updated'));
    }
  }

  public getStorageUsage(): {
    usedBytes: number;
    estimatedMb: number;
    recordCounts: Record<string, number>;
  } {
    this.ensureInitialized();
    let totalChars = 0;
    const recordCounts: Record<string, number> = {};

    for (const [key, items] of this.cache.entries()) {
      recordCounts[key.replace('cricketstats_', '')] = items.length;
      try {
        const str = JSON.stringify(items);
        totalChars += str.length;
      } catch {}
    }

    // Storage byte estimation (approx 2 bytes per UTF-16 character in browser memory/storage)
    const usedBytes = totalChars * 2;
    const estimatedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;

    return {
      usedBytes,
      estimatedMb,
      recordCounts,
    };
  }

  public clearAll(): void {
    const allKeys = Object.values(STORAGE_KEYS);
    for (const k of allKeys) {
      localStorage.removeItem(k);
      localStorage.removeItem(`${k}_manifest`);
      // Clean chunks
      for (let i = 0; i < 20; i++) {
        localStorage.removeItem(`${k}_chunk_${i}`);
      }
    }
    this.cache.clear();
    this.rebuildIndexes();
    this.notifyUpdate();
  }

  private migrateNonNumericIds(): void {
    try {
      // 1. Migrate Players
      const players = this.getCollection<any>(STORAGE_KEYS.PLAYERS);
      let maxPlayerId = Math.max(
        0,
        ...players
          .map((p) => (typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10)))
          .filter((n) => !isNaN(n) && isFinite(n))
      );
      const playerMap = new Map<string, number>();
      let playersChanged = false;

      for (const p of players) {
        if (typeof p.id === 'string' && isNaN(Number(p.id))) {
          maxPlayerId += 1;
          playerMap.set(String(p.id), maxPlayerId);
          p.id = maxPlayerId;
          playersChanged = true;
        } else {
          p.id = Number(p.id);
        }
      }

      if (playersChanged) {
        this.writeCollectionToStorage(STORAGE_KEYS.PLAYERS, players);
      }

      // 2. Migrate Teams
      const teams = this.getCollection<any>(STORAGE_KEYS.TEAMS);
      let maxTeamId = Math.max(
        0,
        ...teams
          .map((t) => (typeof t.id === 'number' ? t.id : parseInt(String(t.id), 10)))
          .filter((n) => !isNaN(n) && isFinite(n))
      );
      const teamMap = new Map<string, number>();
      let teamsChanged = false;

      for (const t of teams) {
        if (typeof t.id === 'string' && isNaN(Number(t.id))) {
          maxTeamId += 1;
          teamMap.set(String(t.id), maxTeamId);
          t.id = maxTeamId;
          teamsChanged = true;
        } else {
          t.id = Number(t.id);
        }
      }

      if (teamsChanged) {
        this.writeCollectionToStorage(STORAGE_KEYS.TEAMS, teams);
      }

      // 3. Migrate Series
      const series = this.getCollection<any>(STORAGE_KEYS.SERIES);
      let maxSeriesId = Math.max(
        0,
        ...series
          .map((s) => (typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10)))
          .filter((n) => !isNaN(n) && isFinite(n))
      );
      const seriesMap = new Map<string, number>();
      let seriesChanged = false;

      for (const s of series) {
        if (typeof s.id === 'string' && isNaN(Number(s.id))) {
          maxSeriesId += 1;
          seriesMap.set(String(s.id), maxSeriesId);
          s.id = maxSeriesId;
          seriesChanged = true;
        } else {
          s.id = Number(s.id);
        }
      }

      if (seriesChanged) {
        this.writeCollectionToStorage(STORAGE_KEYS.SERIES, series);
      }

      // 4. Update team_players foreign keys
      if (playerMap.size > 0 || teamMap.size > 0) {
        const teamPlayers = this.getCollection<any>(STORAGE_KEYS.TEAM_PLAYERS);
        let tpChanged = false;
        for (const tp of teamPlayers) {
          if (playerMap.has(String(tp.playerId))) {
            tp.playerId = playerMap.get(String(tp.playerId))!;
            tpChanged = true;
          } else if (!isNaN(Number(tp.playerId))) {
            tp.playerId = Number(tp.playerId);
          }
          if (teamMap.has(String(tp.teamId))) {
            tp.teamId = teamMap.get(String(tp.teamId))!;
            tpChanged = true;
          } else if (!isNaN(Number(tp.teamId))) {
            tp.teamId = Number(tp.teamId);
          }
        }
        if (tpChanged) {
          this.writeCollectionToStorage(STORAGE_KEYS.TEAM_PLAYERS, teamPlayers);
        }
      }

      // 5. Update matches foreign keys
      if (teamMap.size > 0 || seriesMap.size > 0 || playerMap.size > 0) {
        const matches = this.getCollection<any>(STORAGE_KEYS.MATCHES);
        let matchesChanged = false;
        for (const m of matches) {
          if (teamMap.has(String(m.team1Id))) {
            m.team1Id = teamMap.get(String(m.team1Id))!;
            matchesChanged = true;
          }
          if (teamMap.has(String(m.team2Id))) {
            m.team2Id = teamMap.get(String(m.team2Id))!;
            matchesChanged = true;
          }
          if (seriesMap.has(String(m.seriesId))) {
            m.seriesId = seriesMap.get(String(m.seriesId))!;
            matchesChanged = true;
          }
          if (playerMap.has(String(m.momPlayerId))) {
            m.momPlayerId = playerMap.get(String(m.momPlayerId))!;
            matchesChanged = true;
          }
        }
        if (matchesChanged) {
          this.writeCollectionToStorage(STORAGE_KEYS.MATCHES, matches);
        }
      }
    } catch (err) {
      console.warn('Non-numeric ID migration notice:', err);
    }
  }
}

export const LocalStorageDataStore = new LocalStorageDataStoreManager();
