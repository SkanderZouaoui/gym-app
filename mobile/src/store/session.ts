import { create } from 'zustand';
import type { Role } from '@muscleup/shared';
import type { MeResponse } from '../api/types';

interface SessionState {
  isAuthenticated: boolean;
  user: MeResponse | null;
  activeRole: Role | null;
  roles: Role[];
  /** true si la session a été reconstruite depuis le cache local (pas de confirmation réseau récente). */
  isDegraded: boolean;
  setSession: (user: MeResponse, roles: Role[], activeRole: Role, options?: { degraded?: boolean }) => void;
  setActiveRole: (role: Role) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  activeRole: null,
  roles: [],
  isDegraded: false,
  setSession: (user, roles, activeRole, options) =>
    set({ isAuthenticated: true, user, roles, activeRole, isDegraded: !!options?.degraded }),
  setActiveRole: (role) => set({ activeRole: role }),
  clear: () => set({ isAuthenticated: false, user: null, activeRole: null, roles: [], isDegraded: false }),
}));
