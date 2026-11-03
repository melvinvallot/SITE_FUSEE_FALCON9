import { clamp, lerp, smoothstep } from '../../lib/math';
import { BOOSTER_PIVOT, CATCH_BASE, LAUNCH_ALTITUDE } from '../data/layout';

/** Part de la séquence de lancement consacrée à l'allumage, au sol. */
export const IGNITION_SHARE = 0.12;

/** Intensité des moteurs du propulseur au sol (0..1). */
export const ignition = (launch: number): number => clamp(launch / IGNITION_SHARE);

/** Altitude de l'ensemble : nulle pendant l'allumage, puis accélération quadratique. */
export const launchLift = (launch: number): number => {
  const t = clamp((launch - IGNITION_SHARE) / (1 - IGNITION_SHARE));
  return t * t * LAUNCH_ALTITUDE;
};

/**
 * Avancement réel de la séparation. Entre l'ascension et la séparation, la fusée
 * monte d'abord d'un bloc ; les étages ne se détachent que sur la fin, très haut
 * au-dessus du pas de tir (la tour est alors loin hors du cadre).
 */
export const stage = (sep: number): number => smoothstep((sep - 0.55) / 0.45);

/** Moteurs du propulseur au décollage et pendant l'ascension, coupés à la séparation. */
export const ascentThrust = (launch: number, sep: number): number => ignition(launch) * (1 - smoothstep(stage(sep) * 3));

/** Cloche : 0 hors de [a, b], 1 au centre, transitions douces. */
export const bump = (x: number, a: number, b: number): number => {
  if (x <= a || x >= b) return 0;
  const mid = (a + b) / 2;
  return x < mid ? smoothstep((x - a) / (mid - a)) : smoothstep((b - x) / (b - mid));
};

export interface BoosterPose {
  x: number;
  /** Altitude du pivot (centre du propulseur). */
  y: number;
  /** Bascule autour de l'axe z, en radians. */
  angle: number;
}

/**
 * Pose du propulseur Super Heavy : il monte avec le vaisseau, bascule
 * après la séparation, puis redescend se faire capturer par la tour.
 */
export function boosterPose(launch: number, sepInput: number, capture: number): BoosterPose {
  const sep = stage(sepInput);
  const flight: BoosterPose = {
    x: -1.6 * smoothstep(sep),
    y: launchLift(launch) + BOOSTER_PIVOT - 0.8 * sep,
    angle: Math.PI * 0.85 * smoothstep(sep),
  };
  if (capture <= 0) return flight;
  return {
    x: lerp(flight.x, 0, smoothstep(capture * 1.4)),
    // Descente linéaire : la caméra, interpolée de la même façon, suit le propulseur.
    y: lerp(flight.y, CATCH_BASE + BOOSTER_PIVOT, capture),
    angle: lerp(flight.angle, 0, smoothstep(capture * 1.6)),
  };
}

/** Altitude de la base du vaisseau, qui continue seul vers l'orbite. */
export const shipLift = (launch: number, sepInput: number, capture: number): number => {
  const sep = stage(sepInput);
  return launchLift(launch) + 10 * sep * sep + 2.5 * sep + 40 * capture;
};

/** Allumage de retour (« boostback ») : le propulseur, couché, repart vers le pas de tir. */
export const boostbackBurn = (capture: number): number => bump(capture, 0.1, 0.46);

/** Allumage d'atterrissage : freinage final au-dessus de la tour, éteint à la capture. */
export const landingBurn = (capture: number): number => bump(capture, 0.68, 1.02);

/** Poussée des moteurs du propulseur : décollage, retour, puis allumage d'atterrissage. */
export const boosterThrust = (launch: number, sep: number, capture: number): number =>
  Math.max(ascentThrust(launch, sep), boostbackBurn(capture), landingBurn(capture));

/** Poussée des moteurs du vaisseau : allumés pendant la séparation à chaud. */
export const shipThrust = (sep: number, capture: number): number =>
  clamp(stage(sep) * 5) * (1 - smoothstep(capture * 2.5));

/** Fermeture des bras de capture, à la toute fin du retour. */
export const armsClosure = (capture: number): number => smoothstep((capture - 0.9) / 0.1);
