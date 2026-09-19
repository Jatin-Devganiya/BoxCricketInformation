import { STORAGE_KEYS, DbUser, DbUserLoginHistory } from '../dbSchema';
import { LocalStorageRepository } from '../LocalStorageRepository';
import { LocalStorageDataStore } from '../LocalStorageDataStore';
import { AuthResponse, User, ActiveSession, LoginHistory, LoginHistoryFilter, PagedResult } from '../../types';

const userRepo = new LocalStorageRepository<DbUser>(STORAGE_KEYS.USERS);
const loginHistoryRepo = new LocalStorageRepository<DbUserLoginHistory>(STORAGE_KEYS.USER_LOGIN_HISTORIES);

export const localAuthService = {
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const { username, password } = credentials;
    const users = userRepo.getAll();
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    if (user.status !== 'Active') {
      throw new Error('Account is deactivated. Please contact an administrator.');
    }

    // In local development mode, password matches if provided or matches username case-insensitively
    // E.g. admin / Admin@123, umpire / Umpire@123, user / User@123, etc.
    const expectedPrefix = user.username.toLowerCase();
    const passed =
      password === `${expectedPrefix}@123` ||
      password === `${expectedPrefix.charAt(0).toUpperCase() + expectedPrefix.slice(1)}@123` ||
      password.length >= 3;

    if (!passed) {
      throw new Error('Invalid username or password.');
    }

    const token = `localkey_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Record login in user login histories
    loginHistoryRepo.create({
      userId: user.id,
      username: user.username,
      sessionId,
      loginTime: new Date().toISOString(),
      status: 'Active',
      ipAddress: '127.0.0.1',
      hostName: 'localhost',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const userProfile = await localAuthService.buildUserProfile(user);

    return {
      token,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      user: userProfile,
    };
  },

  logout: async (): Promise<void> => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const histories = loginHistoryRepo.find((h) => String(h.userId) === String(u.id) && h.status === 'Active');
        for (const h of histories) {
          loginHistoryRepo.update(h.id, {
            status: 'LoggedOut',
            logoutTime: new Date().toISOString(),
            logoutReason: 'User Logged Out',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {}
  },

  getMe: async (): Promise<User> => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) throw new Error('Not authenticated');
    const u = JSON.parse(storedUser);
    const dbUser = userRepo.getById(u.id);
    if (!dbUser) throw new Error('User not found');
    return await localAuthService.buildUserProfile(dbUser);
  },

  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const histories = loginHistoryRepo.find((h) => h.status === 'Active');
    const userRoles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_ROLES);
    const roles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.ROLES);

    return histories.map((h) => {
      const uRoles = userRoles
        .filter((ur) => String(ur.userId) === String(h.userId))
        .map((ur) => {
          const r = roles.find((rl) => String(rl.id) === String(ur.roleId));
          return r ? r.name : 'User';
        });

      return {
        id: h.id as any,
        userId: h.userId as any,
        username: h.username,
        sessionId: h.sessionId,
        roles: uRoles.length > 0 ? uRoles : ['User'],
        loginTime: h.loginTime,
        status: h.status,
        ipAddress: h.ipAddress || '127.0.0.1',
        hostName: h.hostName || 'localhost',
      };
    });
  },

  forceLogout: async (sessionId: string): Promise<void> => {
    const history = loginHistoryRepo.findOne((h) => h.sessionId === sessionId);
    if (history) {
      loginHistoryRepo.update(history.id, {
        status: 'Terminated',
        logoutTime: new Date().toISOString(),
        logoutReason: 'Terminated by Administrator',
        updatedAt: new Date().toISOString(),
      });
    }
  },

  forceLogoutUser: async (userId: number | string): Promise<void> => {
    const histories = loginHistoryRepo.find((h) => String(h.userId) === String(userId) && h.status === 'Active');
    for (const h of histories) {
      loginHistoryRepo.update(h.id, {
        status: 'Terminated',
        logoutTime: new Date().toISOString(),
        logoutReason: 'Terminated by Administrator',
        updatedAt: new Date().toISOString(),
      });
    }
  },

  getLoginHistory: async (params?: LoginHistoryFilter): Promise<PagedResult<LoginHistory>> => {
    let list = loginHistoryRepo.getAll();

    if (params?.username) {
      list = list.filter((h) => h.username.toLowerCase().includes(params.username!.toLowerCase()));
    }
    if (params?.status) {
      list = list.filter((h) => h.status.toLowerCase() === params.status!.toLowerCase());
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const items = list.slice((page - 1) * pageSize, page * pageSize).map((h) => ({
      id: h.id as any,
      userId: h.userId as any,
      username: h.username,
      sessionId: h.sessionId,
      roles: ['User'],
      loginTime: h.loginTime,
      logoutTime: h.logoutTime || undefined,
      status: h.status,
      ipAddress: h.ipAddress || undefined,
      hostName: h.hostName || undefined,
      logoutReason: h.logoutReason || undefined,
      logoutByUserId: h.logoutByUserId ? (h.logoutByUserId as any) : undefined,
    }));

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  buildUserProfile: async (dbUser: DbUser): Promise<User> => {
    const userRoles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_ROLES);
    const roles = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.ROLES);
    const overrides = LocalStorageDataStore.getCollection<any>(STORAGE_KEYS.USER_PERMISSIONS);

    const uRoleIds = userRoles
      .filter((ur) => String(ur.userId) === String(dbUser.id))
      .map((ur) => String(ur.roleId));

    const roleNames = roles
      .filter((r) => uRoleIds.includes(String(r.id)))
      .map((r) => r.name);

    if (roleNames.length === 0) roleNames.push('User');

    const effectivePermissions: Record<string, boolean> = {
      Matches: roleNames.includes('Admin') || roleNames.includes('Umpire'),
      LiveScoring: roleNames.includes('Admin') || roleNames.includes('Umpire'),
      Players: roleNames.includes('Admin') || roleNames.includes('Umpire'),
      Teams: roleNames.includes('Admin') || roleNames.includes('Umpire'),
      Series: roleNames.includes('Admin') || roleNames.includes('Umpire'),
      UserManagement: roleNames.includes('Admin'),
    };

    const userOverrides = overrides.filter((o) => String(o.userId) === String(dbUser.id));
    const overridesRecord: Record<string, string> = {};

    for (const ov of userOverrides) {
      effectivePermissions[ov.permission] = ov.isAllowed;
      overridesRecord[ov.permission] = ov.isAllowed ? 'Allow' : 'Deny';
    }

    return {
      id: dbUser.id as any,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      username: dbUser.username,
      status: dbUser.status,
      roles: roleNames,
      overrides: overridesRecord,
      effectivePermissions,
      createdAt: dbUser.createdAt,
    };
  },
};
