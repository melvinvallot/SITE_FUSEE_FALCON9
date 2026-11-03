const cache = new Map<number, Intl.NumberFormat>();

/** Nombre à la française : espace fine insécable pour les milliers, virgule décimale. */
export function formatNumber(value: number, decimals = 0): string {
  let f = cache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    cache.set(decimals, f);
  }
  return f.format(value);
}

/** Courbe de décélération utilisée par les compteurs. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
