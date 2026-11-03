/**
 * Défilement programmé de la page (mode vidéo, séquence de lancement,
 * flèches du clavier), annulable à tout moment par l'utilisateur.
 */

let frame = 0;
let finish: ((done: boolean) => void) | null = null;

/** Courbe douce, lente au départ et à l'arrivée. */
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Position verticale du haut d'une section, dans la page. */
export function sectionTop(id: string): number | null {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  return el ? el.getBoundingClientRect().top + window.scrollY : null;
}

/** Vrai pendant un défilement programmé (pour ne pas le confondre avec l'utilisateur). */
export const isDriving = (): boolean => finish !== null;

/** Interrompt le défilement en cours ; la promesse correspondante renvoie `false`. */
export function cancelScroll(): void {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  const f = finish;
  finish = null;
  f?.(false);
}

/** Fait défiler jusqu'à `y` en `duration` ms. Renvoie `true` si le mouvement est allé au bout. */
export function scrollToY(y: number, duration: number): Promise<boolean> {
  cancelScroll();
  const start = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(max, y));
  return new Promise((resolve) => {
    if (duration <= 0 || Math.abs(target - start) < 1 || typeof requestAnimationFrame === 'undefined') {
      window.scrollTo(0, target);
      resolve(true);
      return;
    }
    finish = resolve;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start + (target - start) * easeInOut(t));
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        frame = 0;
        finish = null;
        resolve(true);
      }
    };
    frame = requestAnimationFrame(step);
  });
}

/** Fait défiler jusqu'au haut d'une section. */
export function scrollToSection(id: string, duration: number): Promise<boolean> {
  const y = sectionTop(id);
  return y === null ? Promise.resolve(false) : scrollToY(y, duration);
}

/** Index de la section la plus proche du haut de l'écran. */
export function nearestSection(ids: readonly string[]): number {
  let best = 0;
  let bestDist = Infinity;
  ids.forEach((id, i) => {
    const top = sectionTop(id);
    if (top === null) return;
    const d = Math.abs(top - window.scrollY);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
