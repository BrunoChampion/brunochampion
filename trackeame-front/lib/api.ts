import axios, { AxiosInstance } from 'axios';

const API_URL = (process.env.NEXT_PUBLIC_TRACKEAME_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSessionPayload {
  session: {
    id?: string;
    token?: string;
    expiresAt?: string;
    userId?: string;
  };
  user: User;
}

export type AuthSessionResponse = AuthSessionPayload | null;

export interface Habit {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  timeEntries?: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  habitId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  habit?: Habit;
}

export interface HabitMetricsResponse {
  habitId: string;
  entries: TimeEntry[];
}

export interface CreateHabitData {
  name: string;
  description?: string;
}

export interface UpdateHabitData {
  name?: string;
  description?: string;
}

// Auth API
export const authAPI = {
  signUpEmail: (data: RegisterData) => api.post('/api/auth/sign-up/email', data),
  signInEmail: (data: LoginData) => api.post('/api/auth/sign-in/email', data),
  getSession: () => api.get<AuthSessionResponse>('/api/auth/get-session'),
  signOut: () => api.post('/api/auth/sign-out', {}),
};

// Habits API
export const habitsAPI = {
  getAll: () => api.get<Habit[]>('/habits'),
  getOne: (id: string) => api.get<Habit>(`/habits/${id}`),
  create: (data: CreateHabitData) => api.post<Habit>('/habits', data),
  update: (id: string, data: UpdateHabitData) => api.patch<Habit>(`/habits/${id}`, data),
  delete: (id: string) => api.delete(`/habits/${id}`),
  getMetrics: (id: string) => api.get<HabitMetricsResponse>(`/habits/${id}/metrics`),
};

// Timer API
export const timerAPI = {
  start: (habitId: string) => api.post<TimeEntry>('/timer/start', { habitId }),
  stop: (timeEntryId: string) => api.post<TimeEntry>(`/timer/stop/${timeEntryId}`),
  getActive: (habitId?: string) => api.get<TimeEntry | null>('/timer/active', { params: { habitId } }),
  getEntries: (habitId?: string) => api.get<TimeEntry[]>('/timer/entries', { params: { habitId } }),
};

export default api;
