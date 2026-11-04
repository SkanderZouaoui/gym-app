import { useEffect, useRef, useState } from 'react';
import { useMutationState } from '@tanstack/react-query';
import { useNetworkStatusContext } from './NetworkStatusContext';

export type SyncPhase = 'idle' | 'waiting' | 'sending' | 'done';

/** Durée d'affichage de « Tout est synchronisé » une fois la file vidée. */
const DONE_VISIBLE_MS = 3000;

/** Modifications faites par l'utilisateur et pas encore reçues par le serveur (séance enregistrée, programme modifié…).
 * - `waiting` : hors ligne, elles attendent le retour du réseau ;
 * - `sending` : en ligne, l'envoi est en cours ;
 * - `done` : la file vient de se vider (affiché brièvement) ;
 * - `idle` : rien en attente. */
export function useSyncStatus(): { phase: SyncPhase; pending: number } {
  const { isOnline } = useNetworkStatusContext();
  const pending = useMutationState({ filters: { status: 'pending' }, select: (m) => m.state.status }).length;
  const [done, setDone] = useState(false);
  const hadPending = useRef(false);

  useEffect(() => {
    if (pending > 0) {
      hadPending.current = true;
      setDone(false);
      return;
    }
    if (!hadPending.current) return;
    hadPending.current = false;
    setDone(true);
    const timer = setTimeout(() => setDone(false), DONE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const phase: SyncPhase = pending > 0 ? (isOnline ? 'sending' : 'waiting') : done ? 'done' : 'idle';
  return { phase, pending };
}
