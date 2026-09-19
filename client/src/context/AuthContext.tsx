import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUmpire: boolean;
  isUser: boolean;
  canManageCricket: boolean;
  canManageUsers: boolean;
  canManageMatches: boolean;
  canScoreLive: boolean;
  canManagePlayers: boolean;
  canManageTeams: boolean;
  canManageSeries: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  sessionTerminatedNotice: string | null;
  clearSessionTerminatedNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionTerminatedNotice, setSessionTerminatedNotice] = useState<string | null>(() => {
    return sessionStorage.getItem('session_terminated_notice');
  });

  useEffect(() => {
    const handleSessionTerminated = (e: any) => {
      const reason = e.detail || 'Your session has been terminated by an administrator.';
      setSessionTerminatedNotice(reason);
      setToken(null);
      setUser(null);
    };

    window.addEventListener('session-terminated', handleSessionTerminated);
    return () => window.removeEventListener('session-terminated', handleSessionTerminated);
  }, []);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const clearSessionTerminatedNotice = () => {
    setSessionTerminatedNotice(null);
    sessionStorage.removeItem('session_terminated_notice');
  };

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    setToken(response.token);
    setUser(response.user);
    clearSessionTerminatedNotice();
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => hasRole(role));
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Check effective permissions from backend user profile
    if (user.effectivePermissions) {
      const key = Object.keys(user.effectivePermissions).find(
        (k) => k.toLowerCase() === permission.toLowerCase()
      );
      if (key !== undefined) {
        return !!user.effectivePermissions[key];
      }
    }

    // Role-based defaults fallback
    if (hasRole('Admin')) return true;
    if (hasRole('Umpire')) {
      if (permission.toLowerCase() === 'usermanagement') return false;
      return true;
    }
    return false;
  };

  const isAdmin = hasRole('Admin');
  const isUmpire = hasRole('Umpire');
  const isUser = hasRole('User') && !isAdmin && !isUmpire;

  const canManageMatches = hasPermission('Matches');
  const canScoreLive = hasPermission('LiveScoring');
  const canManageUsers = hasPermission('UserManagement');
  const canManagePlayers = hasPermission('Players');
  const canManageTeams = hasPermission('Teams');
  const canManageSeries = hasPermission('Series');
  const canManageCricket = canManageMatches || canScoreLive || canManagePlayers || canManageTeams || canManageSeries;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isUmpire,
        isUser,
        canManageCricket,
        canManageUsers,
        canManageMatches,
        canScoreLive,
        canManagePlayers,
        canManageTeams,
        canManageSeries,
        hasRole,
        hasAnyRole,
        hasPermission,
        loading,
        login,
        logout,
        sessionTerminatedNotice,
        clearSessionTerminatedNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
