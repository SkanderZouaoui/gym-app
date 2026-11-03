import { useEffect, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';

/** Brouillon de séance en cours (sets/poids/reps saisis) — isolé du cache React Query pour ne jamais
 * être purgé par un changement de buster côté cache de requêtes. */
const draftsStorage = createMMKV({ id: 'muscleup-drafts' });

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
  repsTouched?: boolean;
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
  /** Nom du programme, affiché dans la bannière « séance en cours » (absent des brouillons plus anciens). */
  programName?: string;
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

const DRAFT_PREFIX = 'session-draft:';

/** Séance en cours la plus récente (brouillon valide), ou null. Sert à la bannière « séance en cours ». */
export function getActiveSessionDraft(): SessionDraft | null {
  let latest: SessionDraft | null = null;
  for (const key of draftsStorage.getAllKeys()) {
    if (!key.startsWith(DRAFT_PREFIX)) continue;
    const [programId, dayId] = key.slice(DRAFT_PREFIX.length).split(':');
    if (!programId || !dayId) continue;
    const draft = readSessionDraft(programId, dayId);
    if (draft && (!latest || draft.savedAt > latest.savedAt)) latest = draft;
  }
  return latest;
}

/** Suit en continu la séance en cours : se met à jour à chaque écriture ou suppression de brouillon. */
export function useActiveSessionDraft(): SessionDraft | null {
  const [draft, setDraft] = useState<SessionDraft | null>(getActiveSessionDraft);
  useEffect(() => {
    setDraft(getActiveSessionDraft());
    const listener = draftsStorage.addOnValueChangedListener(() => setDraft(getActiveSessionDraft()));
    return () => listener.remove();
  }, []);
  return draft;
}
