import { create } from 'zustand';
import type { Role } from '@muscleup/shared';
import type { BranchRoleGrant, MeResponse } from '../api/types';

interface SessionState {
  isAuthenticated: boolean;
  user: MeResponse | null;
  activeRole: Role | null;
  grants: BranchRoleGrant[];
  setSession: (user: MeResponse, grants: BranchRoleGrant[], activeRole: Role) => void;
  setActiveRole: (role: Role) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  activeRole: null,
  grants: [],
  setSession: (user, grants, activeRole) =>
    set({ isAuthenticated: true, user, grants, activeRole }),
  setActiveRole: (role) => set({ activeRole: role }),
  clear: () => set({ isAuthenticated: false, user: null, activeRole: null, grants: [] }),
}));
