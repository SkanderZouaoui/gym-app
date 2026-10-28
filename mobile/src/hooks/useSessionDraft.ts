// OFFLINE MODE DÉSACTIVÉ TEMPORAIREMENT (test en dev via Expo Go — MMKV est incompatible Expo Go).
// Pour réactiver : décommenter la ligne suivante et supprimer le stub Map ci-dessous.
// import { createMMKV } from 'react-native-mmkv';

/** Brouillon de séance en cours (sets/poids/reps saisis) — isolé du cache React Query pour ne jamais
 * être purgé par un changement de buster côté cache de requêtes. */
// const draftsStorage = createMMKV({ id: 'muscleup-drafts' });

/** Stub en mémoire (non persistant) tant que MMKV est désactivé — perdu à chaque reload. */
const draftsMemory = new Map<string, string>();
const draftsStorage = {
  getString: (key: string) => draftsMemory.get(key),
  set: (key: string, value: string) => draftsMemory.set(key, value),
  remove: (key: string) => draftsMemory.delete(key),
};

const DRAFT_VERSION = 1;
/** Un brouillon plus vieux que ça est considéré obsolète et ignoré/supprimé silencieusement. */
const MAX_DRAFT_AGE_MS = 12 * 60 * 60 * 1000;

export interface SessionDraftSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  previousLabel: string;
  weightKg: string;
  weightTouched: boolean;
  reps: string;
  restSeconds: number;
  done: boolean;
  isExtraSet: boolean;
}

export interface SessionDraftAddedExercise {
  exerciseId: string;
  name: string;
}

export interface SessionDraft {
  version: number;
  programId: string;
  dayId: string;
  startedAt: number;
  savedAt: number;
  elapsedSeconds: number;
  sets: SessionDraftSet[];
  addedExercises: SessionDraftAddedExercise[];
  removedExerciseIds: string[];
}

function draftKey(programId: string, dayId: string): string {
  return `session-draft:${programId}:${dayId}`;
}

export function readSessionDraft(programId: string, dayId: string): SessionDraft | null {
  const raw = draftsStorage.getString(draftKey(programId, dayId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionDraft;
    if (parsed.version !== DRAFT_VERSION) {
      clearSessionDraft(programId, dayId);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      clearSessionDraft(programId, dayId);
      return null;
    }
    return parsed;
  } catch {
    clearSessionDraft(programId, dayId);
    return null;
  }
}

export function writeSessionDraft(draft: Omit<SessionDraft, 'version' | 'savedAt'>): void {
  const toStore: SessionDraft = { ...draft, version: DRAFT_VERSION, savedAt: Date.now() };
  draftsStorage.set(draftKey(draft.programId, draft.dayId), JSON.stringify(toStore));
}

export function clearSessionDraft(programId: string, dayId: string): void {
  draftsStorage.remove(draftKey(programId, dayId));
}
