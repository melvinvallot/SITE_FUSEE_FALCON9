import { clamp } from '../../lib/math';

/**
 * Progression (0..1) répartie par section : la section i correspond
 * exactement à i / (n - 1) quand son haut atteint le haut de l'écran,
 * même si certaines sections sont plus hautes que l'écran.
 *
 * @param scrollY défilement courant
 * @param tops position du haut de chaque section dans la page
 * @param maxScroll défilement maximal (hauteur de page moins hauteur d'écran)
 */
export function sectionProgress(scrollY: number, tops: readonly number[], maxScroll: number): number {
  const n = tops.length;
  if (n < 2 || maxScroll <= 0) return 0;
  // Une section trop basse pour atteindre le haut de l'écran est ramenée au défilement maximal.
  const anchors = tops.map((t) => Math.min(t, maxScroll));
  if (scrollY <= anchors[0]!) return 0;
  if (scrollY >= anchors[n - 1]!) return 1;
  let i = 0;
  while (i < n - 2 && scrollY >= anchors[i + 1]!) i++;
  const from = anchors[i]!;
  const span = anchors[i + 1]! - from;
  const local = span <= 0 ? 1 : clamp((scrollY - from) / span);
  return (i + local) / (n - 1);
}
