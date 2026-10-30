import { useEffect, useState } from 'react';

/**
 * Horodatage courant (ms) tenu en état : évite d'appeler Date.now() pendant le rendu
 * et rafraîchit l'écran à intervalle régulier (1 min par défaut) pour que les états
 * « en cours / terminé / jours restants » ne se figent pas.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
