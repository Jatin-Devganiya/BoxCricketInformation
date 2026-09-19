import { STORAGE_KEYS, DbSeries, DbMatch, DbUser } from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { Series, SeriesDetail, Match } from '../../types';
import { localMatchesService } from './localMatchesService';
import { getAllowedSeriesTransitions } from '../../utils/statusRules';

const seriesRepo = new LocalStorageRepository<DbSeries>(STORAGE_KEYS.SERIES);
const matchRepo = new LocalStorageRepository<DbMatch>(STORAGE_KEYS.MATCHES);
const userRepo = new LocalStorageRepository<DbUser>(STORAGE_KEYS.USERS);

const getCurrentUserIdFromStorage = (): number | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id ? Number(u.id) : null;
  } catch {
    return null;
  }
};

export const localSeriesService = {
  getAll: async (status?: string): Promise<Series[]> => {
    let list = seriesRepo.getAll();

    if (status && status !== 'All') {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    const matches = matchRepo.getAll();
    const users = userRepo.getAll();

    return list.map((s) => {
      const sMatches = matches.filter((m) => String(m.seriesId) === String(s.id));
      const completed = sMatches.filter((m) => m.status === 'Completed').length;
      const creator = users.find((u) => String(u.id) === String(s.createdByUserId));

      return {
        id: s.id as any,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        description: s.description || undefined,
        totalMatches: sMatches.length,
        completedMatches: completed,
        createdByUserId: s.createdByUserId ? (s.createdByUserId as any) : undefined,
        createdByUsername: creator ? creator.username : undefined,
      };
    });
  },

  getById: async (id: number | string): Promise<SeriesDetail> => {
    const s = seriesRepo.getById(id);
    if (!s) throw new Error('Series not found');

    const allMatches = await localMatchesService.getAll({ seriesId: id as any });

    return {
      id: s.id as any,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
      description: s.description || undefined,
      totalMatches: allMatches.length,
      completedMatches: allMatches.filter((m) => m.status === 'Completed').length,
      matches: allMatches,
      createdByUserId: s.createdByUserId ? (s.createdByUserId as any) : undefined,
    };
  },

  create: async (payload: any): Promise<Series> => {
    const name = (payload.name || '').trim();
    const status = payload.status || 'Scheduled';

    if (status !== 'Scheduled') {
      throw new Error("A new series must be created with 'Scheduled' status.");
    }

    // Name uniqueness among non-cancelled
    const duplicate = seriesRepo.findOne(
      (s) => s.status !== 'Cancelled' && s.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A non-cancelled series with name '${name}' already exists.`);
    }

    const currentUserId = payload.createdByUserId ?? getCurrentUserIdFromStorage();
    const now = new Date().toISOString();
    const newSeries = seriesRepo.create({
      name,
      startDate: payload.startDate || now.split('T')[0],
      endDate: payload.endDate || now.split('T')[0],
      status,
      description: payload.description || null,
      createdByUserId: currentUserId,
      createdAt: now,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    return {
      id: newSeries.id as any,
      name: newSeries.name,
      startDate: newSeries.startDate,
      endDate: newSeries.endDate,
      status: newSeries.status,
      description: newSeries.description || undefined,
      totalMatches: 0,
      completedMatches: 0,
      createdByUserId: newSeries.createdByUserId ? (newSeries.createdByUserId as any) : undefined,
    };
  },

  update: async (id: number | string, payload: any): Promise<Series> => {
    const s = seriesRepo.getById(id);
    if (!s) throw new Error('Series not found');

    const name = payload.name !== undefined ? payload.name.trim() : s.name;
    const targetStatus = payload.status !== undefined ? payload.status : s.status;

    // Check status transition
    if (targetStatus !== s.status) {
      const allowed = getAllowedSeriesTransitions(s.status);
      if (!allowed.includes(targetStatus)) {
        throw new Error(`Invalid status transition from '${s.status}' to '${targetStatus}'.`);
      }

      // If transitioning to Completed, all matches must be inactive
      if (targetStatus === 'Completed') {
        const sMatches = matchRepo.find((m) => String(m.seriesId) === String(id));
        const activeMatches = sMatches.filter(
          (m) => m.status === 'Scheduled' || m.status === 'InProgress'
        );
        if (activeMatches.length > 0) {
          throw new Error('Cannot complete the series while there are scheduled or in-progress matches.');
        }
      }

      // If cancelling, cannot cancel if any match is InProgress
      if (targetStatus === 'Cancelled') {
        const sMatches = matchRepo.find((m) => String(m.seriesId) === String(id));
        const hasInProgress = sMatches.some((m) => m.status === 'InProgress');
        if (hasInProgress) {
          throw new Error('Cannot cancel the series while a match is in-progress.');
        }
      }
    }

    if (targetStatus !== 'Cancelled') {
      const duplicate = seriesRepo.findOne(
        (sr) => String(sr.id) !== String(id) && sr.status !== 'Cancelled' && sr.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`A non-cancelled series with name '${name}' already exists.`);
      }
    }

    const now = new Date().toISOString();
    seriesRepo.update(id, {
      name,
      startDate: payload.startDate || s.startDate,
      endDate: payload.endDate || s.endDate,
      status: targetStatus,
      description: payload.description !== undefined ? payload.description : s.description,
      updatedAt: now,
    });

    LocalStorageDataStore.rebuildIndexes();
    const updated = seriesRepo.getById(id)!;
    const sMatches = matchRepo.find((m) => String(m.seriesId) === String(id));

    return {
      id: updated.id as any,
      name: updated.name,
      startDate: updated.startDate,
      endDate: updated.endDate,
      status: updated.status,
      description: updated.description || undefined,
      totalMatches: sMatches.length,
      completedMatches: sMatches.filter((m) => m.status === 'Completed').length,
      createdByUserId: updated.createdByUserId ? (updated.createdByUserId as any) : undefined,
    };
  },

  delete: async (id: number | string): Promise<void> => {
    const s = seriesRepo.getById(id);
    if (!s) throw new Error('Series not found');

    const sMatches = matchRepo.find((m) => String(m.seriesId) === String(id));
    if (sMatches.length > 0) {
      throw new Error('Cannot delete series that contains matches.');
    }

    seriesRepo.delete(id);
    LocalStorageDataStore.rebuildIndexes();
  },
};
