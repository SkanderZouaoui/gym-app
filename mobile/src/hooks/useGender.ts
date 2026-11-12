import { useMe } from './useMe';

export type Gender = 'male' | 'female';

/** Genre choisi dans « Informations personnelles » (ou à l'onboarding) ; undefined tant qu'il n'est pas connu. */
export function useGender(): Gender | undefined {
  const { data: user } = useMe();
  const g = (user?.fitnessProfile as { gender?: string } | null | undefined)?.gender;
  return g === 'male' || g === 'female' ? g : undefined;
}
