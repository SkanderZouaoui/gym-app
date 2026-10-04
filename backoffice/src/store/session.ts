import { create } from 'zustand';
import type { Role } from '@muscleup/shared';

export interface MeResponse {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  homeBranchId: string | null;
  branchRoles: { role: Role; branchId: string | null }[];
}

interface SessionState {
  isAuthenticated: boolean;
  user: MeResponse | null;
  activeBranchId: string | null;
  setSession: (user: MeResponse) => void;
  setActiveBranchId: (branchId: string | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  activeBranchId: null,
  setSession: (user) =>
    set({
      isAuthenticated: true,
      user,
      activeBranchId: user.homeBranchId,
    }),
  setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),
  clear: () => set({ isAuthenticated: false, user: null, activeBranchId: null }),
}));

/** true si l'admin a une portée réseau (tous les sites). */
export function hasNetworkScope(user: MeResponse | null): boolean {
  return (user?.branchRoles ?? []).some((r) => r.role === 'ADMIN' && r.branchId === null);
}
