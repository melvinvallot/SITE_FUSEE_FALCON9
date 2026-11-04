import { clamp, smoothstep } from '../../lib/math';
import { createStore } from '../../lib/store';
import { DEFAULT_DEPLOYMENT, DEPLOYMENTS } from '../data/deployments';

export interface DeployState {
  /** Vol choisi dans `DEPLOYMENTS`. */
  index: number;
  /** Numéro de lecture : change à chaque nouveau largage, pour relancer l'animation. */
  run: number;
}

/** Vol choisi sur le sélecteur, lu par la scène 3D à chaque image. */
export const deployStore = createStore<DeployState>({ index: DEFAULT_DEPLOYMENT, run: 0 });

/** Choisit un vol et relance le largage (même si le vol était déjà choisi). */
export function selectDeployment(index: number): void {
  const i = clamp(Math.round(index), 0, DEPLOYMENTS.length - 1);
  deployStore.set((prev) => ({ index: i, run: prev.run + 1 }));
}

/** Ouverture de la trappe avant le premier satellite, en secondes. */
export const DOOR_SECONDS = 1.2;
/** Durée de sortie d'un satellite, de la soute à l'extérieur de la coque. */
export const EXIT_SECONDS = 1.1;
/** Vitesse d'éloignement après la sortie, en unités par seconde, et distance au-delà de laquelle on masque. */
const DRIFT_SPEED = 2;
const DRIFT_MAX = 45;

/** Durée totale visée pour faire sortir toute la pile, quel que soit le nombre de satellites. */
const STACK_SECONDS = 9;

/** Intervalle entre deux satellites : régulier, plus serré quand la pile est grande. */
export const releaseInterval = (count: number): number => Math.min(0.9, STACK_SECONDS / Math.max(1, count));

/** Durée complète d'un largage, trappe refermée comprise. */
export const deployDuration = (count: number): number =>
  DOOR_SECONDS + releaseInterval(count) * Math.max(0, count - 1) + EXIT_SECONDS + 1.5;

/** Ouverture de la trappe (0..1) à l'instant `t` du largage. */
export function doorOpening(t: number, count: number): number {
  const close = deployDuration(count) - 1.2;
  return smoothstep(t / DOOR_SECONDS) * (1 - smoothstep((t - close) / 1));
}

export interface SatellitePose {
  /** Sortie de la soute : 0 = rangé, 1 = hors de la coque. */
  out: number;
  /** Position dans le repère du vaisseau (axe y), trappe tournée vers -z. */
  x: number;
  y: number;
  z: number;
  /** Rotation lente sur lui-même après la sortie, en radians. */
  spin: number;
  /** Déploiement des panneaux solaires (Starlink V3). */
  unfold: number;
  /** Trop loin pour être vu : le satellite est masqué. */
  gone: boolean;
}

/**
 * Pose du satellite `i` (sur `count`) à l'instant `t` du largage. Les satellites
 * sont empilés à plat dans la soute et sortent un à un par la fente, comme les
 * bonbons d'un distributeur, puis s'éloignent lentement en éventail.
 */
export function satellitePose(i: number, count: number, t: number, hull: number, doorY: number): SatellitePose {
  const start = DOOR_SECONDS + i * releaseInterval(count);
  const out = smoothstep((t - start) / EXIT_SECONDS);
  const after = Math.max(0, t - start - EXIT_SECONDS);
  // Éloignement lent et régulier : les satellites forment un chapelet sous la trappe, puis se perdent au loin.
  const drift = DRIFT_SPEED * after;
  const fan = (i / Math.max(1, count - 1) - 0.5) * 2;
  const stack = (i - (count - 1) / 2) * Math.min(0.06, 0.8 / Math.max(1, count));
  return {
    out,
    gone: drift > DRIFT_MAX,
    x: Math.sin(i * 2.3) * 0.08 * drift,
    y: doorY + stack * (1 - out) + fan * drift * 0.18,
    z: -(hull - 0.45) - out * 1.1 - drift,
    spin: after * 0.12 * (i % 2 ? 1 : -1),
    unfold: smoothstep((after - 0.4) / 1.6),
  };
}

/** Instant figé sans animation (mouvements réduits) : toute la pile est sortie, en chapelet. */
export const settledTime = (count: number): number => deployDuration(count) + 2;
