import { STORAGE_KEYS, DbTeam, DbTeamPlayer, DbPlayer, DbMatch } from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { Team, TeamDetail, Player } from '../../types';
import { localPlayersService } from './localPlayersService';

const teamRepo = new LocalStorageRepository<DbTeam>(STORAGE_KEYS.TEAMS);
const teamPlayerRepo = new LocalStorageRepository<DbTeamPlayer>(STORAGE_KEYS.TEAM_PLAYERS);
const playerRepo = new LocalStorageRepository<DbPlayer>(STORAGE_KEYS.PLAYERS);
const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);

export const localTeamsService = {
  getAll: async (): Promise<Team[]> => {
    const teams = teamRepo.getAll();
    const teamPlayers = teamPlayerRepo.getAll();

    return teams.map((t) => {
      const pCount = teamPlayers.filter((tp) => String(tp.teamId) === String(t.id) && tp.status === 'Active').length;
      return {
        id: t.id as any,
        name: t.name,
        shortName: t.shortName,
        status: t.status,
        playerCount: pCount,
        createdByUserId: t.createdByUserId ? (t.createdByUserId as any) : undefined,
      };
    });
  },

  getById: async (id: number | string): Promise<TeamDetail> => {
    const t = teamRepo.getById(id);
    if (!t) throw new Error('Team not found');

    const rosters = teamPlayerRepo.find((tp) => String(tp.teamId) === String(id) && tp.status === 'Active');
    const players: Player[] = [];

    for (const r of rosters) {
      const p = playerRepo.getById(r.playerId);
      if (p) {
        const fullP = await localPlayersService.getById(p.id);
        players.push(fullP);
      }
    }

    return {
      id: t.id as any,
      name: t.name,
      shortName: t.shortName,
      status: t.status,
      players,
      createdByUserId: t.createdByUserId ? (t.createdByUserId as any) : undefined,
    };
  },

  create: async (payload: any): Promise<Team> => {
    const name = (payload.name || '').trim();
    const shortName = (payload.shortName || '').trim() || name.substring(0, 3).toUpperCase();
    const status = payload.status || 'Active';

    // Unique active team name rule
    if (status === 'Active') {
      const duplicate = teamRepo.findOne(
        (t) => t.status === 'Active' && t.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`An active team with name '${name}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    const newTeam = teamRepo.create({
      name,
      shortName,
      status,
      createdByUserId: payload.createdByUserId || null,
      createdAt: now,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    return {
      id: newTeam.id as any,
      name: newTeam.name,
      shortName: newTeam.shortName,
      status: newTeam.status,
      playerCount: 0,
      createdByUserId: newTeam.createdByUserId ? (newTeam.createdByUserId as any) : undefined,
    };
  },

  update: async (id: number | string, payload: any): Promise<Team> => {
    const t = teamRepo.getById(id);
    if (!t) throw new Error('Team not found');

    const name = payload.name !== undefined ? payload.name.trim() : t.name;
    const shortName = payload.shortName !== undefined ? payload.shortName.trim() : t.shortName;
    const status = payload.status !== undefined ? payload.status : t.status;

    if (status === 'Active') {
      const duplicate = teamRepo.findOne(
        (tm) => String(tm.id) !== String(id) && tm.status === 'Active' && tm.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`An active team with name '${name}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    teamRepo.update(id, {
      name,
      shortName,
      status,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    const updated = teamRepo.getById(id)!;
    const pCount = teamPlayerRepo.count((tp) => String(tp.teamId) === String(id) && tp.status === 'Active');

    return {
      id: updated.id as any,
      name: updated.name,
      shortName: updated.shortName,
      status: updated.status,
      playerCount: pCount,
      createdByUserId: updated.createdByUserId ? (updated.createdByUserId as any) : undefined,
    };
  },

  delete: async (id: number | string): Promise<void> => {
    const t = teamRepo.getById(id);
    if (!t) throw new Error('Team not found');

    // Protect matches
    const hasMatches = matchRepo.exists(
      (m) => String(m.team1Id) === String(id) || String(m.team2Id) === String(id)
    );
    if (hasMatches) {
      // Deactivate to protect match history
      teamRepo.update(id, { status: 'Inactive', updatedAt: new Date().toISOString() });
      return;
    }

    // Delete rosters
    const rosters = teamPlayerRepo.find((tp) => String(tp.teamId) === String(id));
    for (const r of rosters) teamPlayerRepo.delete(r.id);

    teamRepo.delete(id);
    LocalStorageDataStore.rebuildIndexes();
  },

  addPlayer: async (teamId: number | string, playerId: number | string): Promise<void> => {
    const team = teamRepo.getById(teamId);
    if (!team) throw new Error('Team not found');

    const player = playerRepo.getById(playerId);
    if (!player) throw new Error('Player not found');

    const existing = teamPlayerRepo.findOne(
      (tp) => String(tp.teamId) === String(teamId) && String(tp.playerId) === String(playerId)
    );

    if (existing) {
      if (existing.status !== 'Active') {
        teamPlayerRepo.update(existing.id, { status: 'Active', updatedAt: new Date().toISOString() });
      }
      return;
    }

    const now = new Date().toISOString();
    teamPlayerRepo.create({
      teamId,
      playerId,
      joinedDate: now,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
  },

  removePlayer: async (teamId: number | string, playerId: number | string): Promise<void> => {
    const existing = teamPlayerRepo.findOne(
      (tp) => String(tp.teamId) === String(teamId) && String(tp.playerId) === String(playerId)
    );
    if (existing) {
      teamPlayerRepo.delete(existing.id);
      LocalStorageDataStore.rebuildIndexes();
    }
  },
};
