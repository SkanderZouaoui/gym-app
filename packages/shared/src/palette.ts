/**
 * Dérivation d'une palette de couleurs complète (soft/hover/pressed/border/ink)
 * à partir des quelques couleurs de base choisies dans le back-office
 * (Branding). Utilisé par le mobile pour appliquer le branding dynamique sur
 * ThemeContext, et par le back-office pour l'aperçu/calcul de contraste.
 */

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || "#000").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: number[]): string {
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function mixColors(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

function luminance(c: string): number {
  const [r, g, b] = hexToRgb(c).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function bestOnColor(c: string): string {
  return contrastRatio(c, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#111111";
}

/** Assure un ratio de contraste minimal de `target` entre `c` et `bg`, en
 * mélangeant `c` vers le noir ou le blanc (selon la luminosité de `bg`). */
function ensureContrast(c: string, bg: string, target: number): string {
  const towards = luminance(bg) > 0.18 ? "#000000" : "#FFFFFF";
  let t = 0;
  let out = rgbToHex(hexToRgb(c));
  while (contrastRatio(out, bg) < target && t < 1) {
    t += 0.03;
    out = mixColors(c, towards, t);
  }
  return out;
}

export interface DerivedColorFamily {
  base: string;
  hover: string;
  pressed: string;
  soft: string;
  border: string;
  ink: string;
  on: string;
}

/** Dérive hover/pressed/soft/border/ink/on à partir d'une seule couleur de
 * base `c`, sur une surface `surface` (claire ou sombre selon `dark`). */
export function deriveColorFamily(c: string, surface: string, dark: boolean): DerivedColorFamily {
  const soft = mixColors(surface, c, dark ? 0.2 : 0.12);
  return {
    base: rgbToHex(hexToRgb(c)),
    hover: dark ? mixColors(c, "#FFFFFF", 0.12) : mixColors(c, "#000000", 0.1),
    pressed: mixColors(c, "#000000", dark ? 0.25 : 0.2),
    soft,
    border: ensureContrast(mixColors(surface, c, dark ? 0.5 : 0.35), surface, 3),
    ink: ensureContrast(ensureContrast(c, soft, 4.5), surface, 4.5),
    on: bestOnColor(c),
  };
}
