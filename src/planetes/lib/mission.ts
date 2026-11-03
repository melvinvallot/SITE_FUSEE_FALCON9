import type { Mission } from './orbits';

/** Durées de l'animation, en secondes réelles. */
export interface Timing {
  /** Avance rapide jusqu'à la fenêtre de tir. */
  window: number;
  /** Trajet, du départ à la mise en orbite. */
  cruise: number;
}

export type Phase = 'window' | 'depart' | 'cruise' | 'brake' | 'arrived';

export interface Frame {
  phase: Phase;
  /** Date simulée, en jours depuis l'an 2000. */
  day: number;
  /** Avancement du trajet dans le temps simulé (0 au départ, 1 à l'arrivée). */
  u: number;
  /** Avancement du trajet dans le temps de l'animation. */
  s: number;
}

/** Part du trajet (temps d'animation) consacrée au départ, et début du freinage. */
export const DEPART_END = 0.07;
export const FLIP_START = 0.74;
export const BRAKE_START = 0.86;

/**
 * Les trajets longs durent plus longtemps à l'écran, mais sans proportion :
 * 7 s pour Mercure, environ 10 s pour Mars, un peu plus de 20 s pour Neptune.
 */
export function timing(m: Mission): Timing {
  const window = m.wait < 1 ? 0 : Math.min(3.6, Math.max(1.6, 1.4 + m.wait / 300));
  const cruise = 7 + 2.4 * Math.log2(Math.max(1, m.transfer.days / 100));
  return { window, cruise };
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Avance lente au départ et à l'arrivée, rapide au milieu du trajet. */
export const cruiseEase = (s: number) => s - (0.8 * Math.sin(2 * Math.PI * s)) / (2 * Math.PI);

/** État de la mission après `elapsed` secondes d'animation. */
export function frameAt(m: Mission, t: Timing, elapsed: number): Frame {
  if (elapsed < t.window) {
    return { phase: 'window', day: m.nowDay + m.wait * smooth(elapsed / t.window), u: 0, s: 0 };
  }
  const s = Math.min(1, (elapsed - t.window) / t.cruise);
  const u = cruiseEase(s);
  const day = m.launchDay + m.transfer.days * u;
  const phase: Phase = s >= 1 ? 'arrived' : s < DEPART_END ? 'depart' : s >= BRAKE_START ? 'brake' : 'cruise';
  return { phase, day, u, s };
}

/** Durée totale de l'animation, en secondes. */
export const totalSeconds = (t: Timing) => t.window + t.cruise;
