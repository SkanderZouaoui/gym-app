import { create } from 'zustand';
import type { Role } from '@muscleup/shared';

export interface MeResponse {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  roles: { role: Role }[];
}

interface SessionState {
  isAuthenticated: boolean;
  user: MeResponse | null;
  setSession: (user: MeResponse) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  setSession: (user) => set({ isAuthenticated: true, user }),
  clear: () => set({ isAuthenticated: false, user: null }),
}));

/** true si l'utilisateur a le rôle ADMIN. */
export function isAdmin(user: MeResponse | null): boolean {
  return (user?.roles ?? []).some((r) => r.role === 'ADMIN');
}
