/**
 * Ce que l'on sait de l'appareil : écran tactile, puissance graphique.
 * Sert à adapter les textes d'aide (toucher plutôt que cliquer) et la
 * qualité du rendu 3D (téléphones et tablettes ménagés).
 */

const query = (q: string): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;

/** Écran tactile sans souris : téléphone ou tablette. */
export function isTouchDevice(): boolean {
  return query('(hover: none) and (pointer: coarse)');
}

/**
 * Appareil à ménager : tactile, ou peu de cœurs / de mémoire.
 * `?hq=1` dans l'adresse force la qualité maximale.
 */
export function isLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('hq') === '1') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const littleMemory = (nav.deviceMemory ?? 8) <= 4;
  return isTouchDevice() || fewCores || littleMemory;
}

/** Densité de pixels maximale du rendu 3D : plafonnée sur les appareils modestes. */
export function maxPixelRatio(desktop: number, lowPower = isLowPower()): number {
  return lowPower ? Math.min(desktop, 1.5) : desktop;
}

/** Format de l'écran (largeur / hauteur). */
export type Framing = 'portrait' | 'standard' | 'wide';

/** Classe un rapport largeur / hauteur : portrait (téléphone, tablette debout), standard, panoramique (téléphone couché). */
export function framingFor(aspect: number): Framing {
  if (aspect < 0.9) return 'portrait';
  if (aspect > 1.75) return 'wide';
  return 'standard';
}

/**
 * Sur écran panoramique, l'image montre plus de décor en largeur : on écarte
 * d'autant le décalage latéral de la caméra pour que la fusée reste du côté
 * opposé au texte, comme sur un écran d'ordinateur (16/10).
 */
export function lateralScale(aspect: number): number {
  // Au carré : le texte occupe la moitié de l'écran couché, il faut pousser la fusée plus loin.
  return Math.min(2, Math.max(1, (aspect / 1.6) ** 2));
}
