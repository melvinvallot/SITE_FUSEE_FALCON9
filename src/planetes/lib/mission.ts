import type { Mission } from './orbits';

/** Durées de l'animation, en secondes réelles. */
export interface Timing {
  /** Avance rapide jusqu'à la fenêtre de tir. */
  window: number;
  /** Scène du départ de la Terre (moteurs allumés, caméra qui suit le vaisseau). */
  depart: number;
  /** Rythme du trajet : le trajet entier durerait ce temps sans la scène de départ. */
  cruise: number;
  /** Part du trajet (avancement `s`) parcourue pendant la scène de départ. */
  departEnd: number;
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
  /** Valeur de `s` à la fin de la scène de départ. */
  departEnd: number;
}

/** Durée de la scène de départ de la Terre, en secondes (avant : environ 1 s). */
export const DEPART_SECONDS = 3;
/** Début du retournement et du freinage (avancement du trajet). */
export const FLIP_START = 0.74;
export const BRAKE_START = 0.86;

/**
 * Les trajets longs durent plus longtemps à l'écran, mais sans proportion :
 * 7 s pour Mercure, environ 10 s pour Mars, un peu plus de 20 s pour Neptune.
 */
export function timing(m: Mission): Timing {
  const window = m.wait < 1 ? 0 : Math.min(3.6, Math.max(1.6, 1.4 + m.wait / 300));
  const cruise = 7 + 2.4 * Math.log2(Math.max(1, m.transfer.days / 100));
  // Pendant le départ, le vaisseau accélère régulièrement jusqu'au rythme du trajet :
  // il couvre donc la moitié de ce qu'il couvrirait à pleine vitesse.
  const departEnd = DEPART_SECONDS / (2 * cruise);
  return { window, depart: DEPART_SECONDS, cruise, departEnd };
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Avance lente au départ et à l'arrivée, rapide au milieu du trajet. */
export const cruiseEase = (s: number) => s - (0.8 * Math.sin(2 * Math.PI * s)) / (2 * Math.PI);

/** État de la mission après `elapsed` secondes d'animation. */
export function frameAt(m: Mission, t: Timing, elapsed: number): Frame {
  const departEnd = t.departEnd;
  if (elapsed < t.window) {
    return { phase: 'window', day: m.nowDay + m.wait * smooth(elapsed / t.window), u: 0, s: 0, departEnd };
  }
  const e = elapsed - t.window;
  // Départ : accélération régulière (s croît comme le carré du temps), sans à-coup à la fin.
  const s = e < t.depart ? departEnd * (e / t.depart) ** 2 : Math.min(1, departEnd + (e - t.depart) / t.cruise);
  const u = cruiseEase(s);
  const day = m.launchDay + m.transfer.days * u;
  const phase: Phase = s >= 1 ? 'arrived' : e < t.depart ? 'depart' : s >= BRAKE_START ? 'brake' : 'cruise';
  return { phase, day, u, s, departEnd };
}

/** Durée totale de l'animation, en secondes. */
export const totalSeconds = (t: Timing) => t.window + t.depart + t.cruise * (1 - t.departEnd);
