/** Entier de pagination issu d'une query string : valeur par défaut si absent/invalide, bornée à [0, max]. */
export function page(value: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
}
