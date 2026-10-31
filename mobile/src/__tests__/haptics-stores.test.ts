import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Haptics from 'expo-haptics';
import { haptics } from '../utils/haptics';
import { useSessionStore } from '../store/session';
import { useExercisePickStore } from '../store/exercisePick';
import type { MeResponse } from '../api/types';

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  impactAsync: vi.fn(),
  selectionAsync: vi.fn(),
  notificationAsync: vi.fn(),
}));

describe('haptics', () => {
  it('appelle expo-haptics quand disponible', async () => {
    await haptics.light();
    await haptics.success();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
  it('n’échoue jamais si la méthode est indisponible (Expo Go Android)', async () => {
    vi.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('not available on android'));
    vi.mocked(Haptics.selectionAsync).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(haptics.light()).resolves.toBeUndefined();
    await expect(haptics.selection()).resolves.toBeUndefined();
  });
});

describe('session store', () => {
  beforeEach(() => useSessionStore.getState().clear());
  const me = { id: 'u1' } as unknown as MeResponse;

  it('démarre déconnecté', () => {
    expect(useSessionStore.getState()).toMatchObject({ isAuthenticated: false, user: null, activeRole: null, roles: [] });
  });
  it('setSession puis changement de rôle actif', () => {
    useSessionStore.getState().setSession(me, ['MEMBER', 'COACH'] as never, 'MEMBER' as never);
    expect(useSessionStore.getState()).toMatchObject({ isAuthenticated: true, activeRole: 'MEMBER', isDegraded: false });
    useSessionStore.getState().setActiveRole('COACH' as never);
    expect(useSessionStore.getState().activeRole).toBe('COACH');
  });
  it('session dégradée (cache local) et clear', () => {
    useSessionStore.getState().setSession(me, ['MEMBER'] as never, 'MEMBER' as never, { degraded: true });
    expect(useSessionStore.getState().isDegraded).toBe(true);
    useSessionStore.getState().clear();
    expect(useSessionStore.getState()).toMatchObject({ isAuthenticated: false, user: null, roles: [], isDegraded: false });
  });
});

describe('exercise pick store', () => {
  it('transmet puis consomme le choix', () => {
    const pick = { target: 'builder' as const, exerciseId: 'e1', name: 'Squat', sets: [] };
    useExercisePickStore.getState().setPick(pick);
    expect(useExercisePickStore.getState().pick).toEqual(pick);
    useExercisePickStore.getState().clear();
    expect(useExercisePickStore.getState().pick).toBeNull();
  });
});
