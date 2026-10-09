import { create } from 'zustand';
import type { Role } from '@muscleup/shared';
import type { MeResponse } from '../api/types';

interface SessionState {
  isAuthenticated: boolean;
  user: MeResponse | null;
  activeRole: Role | null;
  roles: Role[];
  setSession: (user: MeResponse, roles: Role[], activeRole: Role) => void;
  setActiveRole: (role: Role) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  activeRole: null,
  roles: [],
  setSession: (user, roles, activeRole) =>
    set({ isAuthenticated: true, user, roles, activeRole }),
  setActiveRole: (role) => set({ activeRole: role }),
  clear: () => set({ isAuthenticated: false, user: null, activeRole: null, roles: [] }),
}));
