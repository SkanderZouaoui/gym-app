/** Rectangle en pixels d'écran, relatif au coin haut-gauche de l'image affichée. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Size {
  w: number;
  h: number;
}
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/** Taille d'affichage d'une image de proportions `natural` contenue dans `area` (sans déformation). */
export function containSize(natural: Size, area: Size): Size {
  const scale = Math.min(area.w / natural.w, area.h / natural.h);
  return { w: natural.w * scale, h: natural.h * scale };
}

/** Plus grand cadre de proportions `ratio` (largeur / hauteur) centré dans `bounds` ; `null` = toute l'image. */
export function boxForRatio(bounds: Size, ratio: number | null): Box {
  if (!ratio) return { x: 0, y: 0, w: bounds.w, h: bounds.h };
  const w = Math.min(bounds.w, bounds.h * ratio);
  const h = w / ratio;
  return { x: (bounds.w - w) / 2, y: (bounds.h - h) / 2, w, h };
}

/** Déplace le cadre sans le laisser sortir de l'image. */
export function moveBox(start: Box, dx: number, dy: number, bounds: Size): Box {
  return { ...start, x: clamp(start.x + dx, 0, bounds.w - start.w), y: clamp(start.y + dy, 0, bounds.h - start.h) };
}

/**
 * Redimensionne le cadre en tirant sur un coin (le coin opposé reste fixe). Avec `ratio`, les proportions sont conservées ;
 * le cadre reste dans l'image et ne devient jamais plus petit que `min`.
 */
export function resizeCorner(start: Box, corner: Corner, dx: number, dy: number, bounds: Size, ratio: number | null, min: number): Box {
  const dirX = corner === 'tr' || corner === 'br' ? 1 : -1;
  const dirY = corner === 'bl' || corner === 'br' ? 1 : -1;
  const ax = dirX > 0 ? start.x : start.x + start.w; // coin opposé, fixe
  const ay = dirY > 0 ? start.y : start.y + start.h;
  const px = clamp((dirX > 0 ? start.x + start.w : start.x) + dx, 0, bounds.w);
  const py = clamp((dirY > 0 ? start.y + start.h : start.y) + dy, 0, bounds.h);
  const availW = dirX > 0 ? bounds.w - ax : ax;
  const availH = dirY > 0 ? bounds.h - ay : ay;

  let w = dirX * (px - ax);
  let h = dirY * (py - ay);
  if (ratio) {
    w = Math.min(Math.max(w, h * ratio), availW, availH * ratio);
    w = Math.max(w, Math.min(min, availW, availH * ratio));
    h = w / ratio;
  } else {
    w = clamp(w, Math.min(min, availW), availW);
    h = clamp(h, Math.min(min, availH), availH);
  }
  return { x: dirX > 0 ? ax : ax - w, y: dirY > 0 ? ay : ay - h, w, h };
}

/** Zone à rogner en pixels de l'image d'origine, d'après le cadre affiché sur l'image de taille `bounds`. */
export function boxToPixels(box: Box, bounds: Size, natural: Size): { originX: number; originY: number; width: number; height: number } {
  const sx = natural.w / bounds.w;
  const sy = natural.h / bounds.h;
  const originX = clamp(Math.round(box.x * sx), 0, natural.w - 1);
  const originY = clamp(Math.round(box.y * sy), 0, natural.h - 1);
  return {
    originX,
    originY,
    width: clamp(Math.round(box.w * sx), 1, natural.w - originX),
    height: clamp(Math.round(box.h * sy), 1, natural.h - originY),
  };
}
