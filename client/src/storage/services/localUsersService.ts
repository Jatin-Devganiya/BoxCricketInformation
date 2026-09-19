import { STORAGE_KEYS, DbUser, DbUserRole, DbUserPermissionOverride, DbRole } from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { User } from '../../types';
import { localAuthService } from './localAuthService';

const userRepo = new LocalStorageRepository<DbUser>(STORAGE_KEYS.USERS);
const userRoleRepo = new LocalStorageRepository<DbUserRole>(STORAGE_KEYS.USER_ROLES);
const userPermissionRepo = new LocalStorageRepository<DbUserPermissionOverride>(STORAGE_KEYS.USER_PERMISSIONS);
const roleRepo = new LocalStorageRepository<DbRole>(STORAGE_KEYS.ROLES);

export const localUsersService = {
  getAll: async (): Promise<User[]> => {
    const users = userRepo.getAll();
    return Promise.all(users.map((u) => localAuthService.buildUserProfile(u)));
  },

  getById: async (id: number | string): Promise<User> => {
    const user = userRepo.getById(id);
    if (!user) throw new Error('User not found');
    return await localAuthService.buildUserProfile(user);
  },

  create: async (payload: any): Promise<User> => {
    const existing = userRepo.findOne(
      (u) => u.username.toLowerCase() === (payload.username || '').trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Username '${payload.username}' is already taken.`);
    }

    const now = new Date().toISOString();
    const newUser = userRepo.create({
      username: (payload.username || '').trim(),
      firstName: (payload.firstName || '').trim(),
      lastName: (payload.lastName || '').trim(),
      passwordHash: payload.password ? `$2a$11$DevDummyHash${payload.username}` : '$2a$11$DevDummyHashDefault',
      status: payload.status || 'Active',
      createdAt: now,
      updatedAt: now,
    });

    // Assign roles
    const roles = roleRepo.getAll();
    if (Array.isArray(payload.roles)) {
      for (const rName of payload.roles) {
        const r = roles.find((rl) => rl.name.toLowerCase() === String(rName).toLowerCase());
        if (r) {
          userRoleRepo.create({
            userId: newUser.id,
            roleId: r.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } else {
      // Default to User role
      const defaultRole = roles.find((rl) => rl.name === 'User') || roles[0];
      if (defaultRole) {
        userRoleRepo.create({
          userId: newUser.id,
          roleId: defaultRole.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Permission overrides if any
    if (payload.overrides && typeof payload.overrides === 'object') {
      for (const [perm, val] of Object.entries(payload.overrides)) {
        if (val === 'Allow' || val === 'Deny' || typeof val === 'boolean') {
          userPermissionRepo.create({
            userId: newUser.id,
            permission: perm,
            isAllowed: val === 'Allow' || val === true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    LocalStorageDataStore.rebuildIndexes();
    return await localAuthService.buildUserProfile(newUser);
  },

  update: async (id: number | string, payload: any): Promise<User> => {
    const user = userRepo.getById(id);
    if (!user) throw new Error('User not found');

    if (payload.username && payload.username.toLowerCase() !== user.username.toLowerCase()) {
      const duplicate = userRepo.findOne(
        (u) => String(u.id) !== String(id) && u.username.toLowerCase() === payload.username.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Username '${payload.username}' is already taken.`);
      }
    }

    const now = new Date().toISOString();
    const updates: Partial<DbUser> = {
      updatedAt: now,
    };
    if (payload.firstName !== undefined) updates.firstName = payload.firstName;
    if (payload.lastName !== undefined) updates.lastName = payload.lastName;
    if (payload.username !== undefined) updates.username = payload.username;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.password) updates.passwordHash = `$2a$11$DevDummyHash${payload.username || user.username}`;

    userRepo.update(id, updates);

    // Update roles if provided
    if (Array.isArray(payload.roles)) {
      const existingUserRoles = userRoleRepo.find((ur) => String(ur.userId) === String(id));
      for (const ur of existingUserRoles) {
        userRoleRepo.delete(ur.id);
      }
      const allRoles = roleRepo.getAll();
      for (const rName of payload.roles) {
        const r = allRoles.find((rl) => rl.name.toLowerCase() === String(rName).toLowerCase());
        if (r) {
          userRoleRepo.create({
            userId: id,
            roleId: r.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Update permission overrides if provided
    if (payload.overrides && typeof payload.overrides === 'object') {
      const existingOverrides = userPermissionRepo.find((po) => String(po.userId) === String(id));
      for (const eo of existingOverrides) {
        userPermissionRepo.delete(eo.id);
      }
      for (const [perm, val] of Object.entries(payload.overrides)) {
        if (val === 'Allow' || val === 'Deny' || typeof val === 'boolean') {
          userPermissionRepo.create({
            userId: id,
            permission: perm,
            isAllowed: val === 'Allow' || val === true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    LocalStorageDataStore.rebuildIndexes();
    const updated = userRepo.getById(id)!;
    return await localAuthService.buildUserProfile(updated);
  },

  delete: async (id: number | string): Promise<void> => {
    const user = userRepo.getById(id);
    if (!user) throw new Error('User not found');

    // Prevent deleting the primary admin account
    if (user.username.toLowerCase() === 'admin') {
      throw new Error('The primary admin user cannot be deleted.');
    }

    // Cascade delete user roles & overrides
    const uRoles = userRoleRepo.find((ur) => String(ur.userId) === String(id));
    for (const ur of uRoles) userRoleRepo.delete(ur.id);

    const overrides = userPermissionRepo.find((po) => String(po.userId) === String(id));
    for (const ov of overrides) userPermissionRepo.delete(ov.id);

    userRepo.delete(id);
    LocalStorageDataStore.rebuildIndexes();
  },
};
