import axios from 'axios';
import {
  AuthResponse,
  DashboardStats,
  Match,
  Player,
  PlayerStatistics,
  Scorecard,
  Series,
  SeriesDetail,
  Team,
  TeamDetail,
  User,
  LiveScore,
  StartInningsPayload,
  RecordBallPayload,
  RecordWicketPayload,
  EligibleBowlersResponse,
  ActiveSession,
  LoginHistory,
  LoginHistoryFilter,
  PagedResult
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isTerminated =
        error.response.headers?.['x-session-terminated'] === 'true' ||
        error.response.data?.sessionTerminated === true ||
        (typeof error.response.data?.message === 'string' &&
          error.response.data.message.includes('terminated'));

      if (isTerminated) {
        const msg = error.response.data?.message || 'Your session has been terminated by an administrator.';
        sessionStorage.setItem('session_terminated_notice', msg);
        window.dispatchEvent(new CustomEvent('session-terminated', { detail: msg }));
      }

      // Clear token on 401
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignored if network or already ended
    }
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const { data } = await api.get<ActiveSession[]>('/auth/active-sessions');
    return data;
  },
  forceLogout: async (sessionId: string): Promise<void> => {
    await api.post(`/auth/force-logout/${sessionId}`);
  },
  forceLogoutUser: async (userId: number): Promise<void> => {
    await api.post(`/auth/force-logout-user/${userId}`);
  },
  getLoginHistory: async (params?: LoginHistoryFilter): Promise<PagedResult<LoginHistory>> => {
    const { data } = await api.get<PagedResult<LoginHistory>>('/auth/login-history', { params });
    return data;
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/users');
    return data;
  },
  getById: async (id: number): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },
  create: async (user: any): Promise<User> => {
    const { data } = await api.post<User>('/users', user);
    return data;
  },
  update: async (id: number, user: any): Promise<User> => {
    const { data } = await api.put<User>(`/users/${id}`, user);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export const playersApi = {
  getAll: async (params?: { search?: string; category?: string; status?: string }): Promise<Player[]> => {
    const { data } = await api.get<Player[]>('/players', { params });
    return data;
  },
  getById: async (id: number): Promise<Player> => {
    const { data } = await api.get<Player>(`/players/${id}`);
    return data;
  },
  getStatistics: async (id: number): Promise<PlayerStatistics> => {
    const { data } = await api.get<PlayerStatistics>(`/players/${id}/statistics`);
    return data;
  },
  create: async (player: any): Promise<Player> => {
    const { data } = await api.post<Player>('/players', player);
    return data;
  },
  update: async (id: number, player: any): Promise<Player> => {
    const { data } = await api.put<Player>(`/players/${id}`, player);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/players/${id}`);
  },
};

export const teamsApi = {
  getAll: async (): Promise<Team[]> => {
    const { data } = await api.get<Team[]>('/teams');
    return data;
  },
  getById: async (id: number): Promise<TeamDetail> => {
    const { data } = await api.get<TeamDetail>(`/teams/${id}`);
    return data;
  },
  create: async (team: any): Promise<Team> => {
    const { data } = await api.post<Team>('/teams', team);
    return data;
  },
  update: async (id: number, team: any): Promise<Team> => {
    const { data } = await api.put<Team>(`/teams/${id}`, team);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },
  addPlayer: async (teamId: number, playerId: number): Promise<void> => {
    await api.post(`/teams/${teamId}/players`, { playerId });
  },
  removePlayer: async (teamId: number, playerId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}/players/${playerId}`);
  },
};

export const seriesApi = {
  getAll: async (status?: string): Promise<Series[]> => {
    const { data } = await api.get<Series[]>('/series', { params: { status } });
    return data;
  },
  getById: async (id: number): Promise<SeriesDetail> => {
    const { data } = await api.get<SeriesDetail>(`/series/${id}`);
    return data;
  },
  create: async (series: any): Promise<Series> => {
    const { data } = await api.post<Series>('/series', series);
    return data;
  },
  update: async (id: number, series: any): Promise<Series> => {
    const { data } = await api.put<Series>(`/series/${id}`, series);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/series/${id}`);
  },
};

export const matchesApi = {
  getAll: async (params?: { seriesId?: number; status?: string; date?: string; sortOrder?: string }): Promise<Match[]> => {
    const { data } = await api.get<Match[]>('/matches', { params });
    return data;
  },
  getById: async (id: number): Promise<Match> => {
    const { data } = await api.get<Match>(`/matches/${id}`);
    return data;
  },
  create: async (match: any): Promise<Match> => {
    const { data } = await api.post<Match>('/matches', match);
    return data;
  },
  update: async (id: number, match: any): Promise<Match> => {
    const { data } = await api.put<Match>(`/matches/${id}`, match);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/matches/${id}`);
  },
  getScorecard: async (matchId: number): Promise<Scorecard> => {
    const { data } = await api.get<Scorecard>(`/matches/${matchId}/scorecard`);
    return data;
  },
  saveScorecard: async (matchId: number, payload: any): Promise<Scorecard> => {
    const { data } = await api.post<Scorecard>(`/matches/${matchId}/scorecard`, payload);
    return data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};

export const liveScoringApi = {
  getLiveScore: async (matchId: number): Promise<LiveScore> => {
    const { data } = await api.get<LiveScore>(`/matches/${matchId}/live-score`);
    return data;
  },
  startInnings: async (matchId: number, payload: StartInningsPayload): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/start`, payload);
    return data;
  },
  recordBall: async (matchId: number, inningsId: number, payload: RecordBallPayload): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/ball`, payload);
    return data;
  },
  recordWicket: async (matchId: number, inningsId: number, payload: RecordWicketPayload): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/wicket`, payload);
    return data;
  },
  selectNewBatsman: async (matchId: number, inningsId: number, newBatsmanPlayerId: number): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/new-batsman`, { newBatsmanPlayerId });
    return data;
  },
  nextOver: async (matchId: number, inningsId: number, nextBowlerPlayerId: number): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/next-over`, { nextBowlerPlayerId });
    return data;
  },
  completeInnings: async (matchId: number, inningsId: number): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/complete`);
    return data;
  },
  completeMatch: async (matchId: number, payload: { winningTeamId?: number; result?: string; momPlayerId?: number }): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/complete`, payload);
    return data;
  },
  getEligibleBowlers: async (matchId: number, inningsId: number): Promise<EligibleBowlersResponse> => {
    const { data } = await api.get<EligibleBowlersResponse>(`/matches/${matchId}/innings/${inningsId}/eligible-bowlers`);
    return data;
  },
  changeBowler: async (matchId: number, inningsId: number, newBowlerPlayerId: number): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/change-bowler`, { newBowlerPlayerId });
    return data;
  },
  replaceBowlerInOver: async (matchId: number, inningsId: number, newBowlerPlayerId: number): Promise<LiveScore> => {
    const { data } = await api.post<LiveScore>(`/matches/${matchId}/innings/${inningsId}/replace-bowler-in-over`, { newBowlerPlayerId });
    return data;
  },
};

export default api;
