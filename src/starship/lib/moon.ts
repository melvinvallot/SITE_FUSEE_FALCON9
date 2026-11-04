import { clamp, lerp, smoothstep } from '../../lib/math';
import { bump } from './flight';

/**
 * Voyage vers la Lune, en deux temps pilotés par le défilement :
 * - `tli` (0..1) : départ de l'orbite terrestre (injection translunaire) ;
 * - `land` (0..1) : arrivée en orbite lunaire, descente et alunissage.
 */

export interface DeparturePose {
  /** Avance du vaisseau le long de sa trajectoire (vers -x), en unités. */
  advance: number;
  /** Poussée des moteurs principaux (0..1). */
  thrust: number;
  /** Éloignement de la Terre : 0 = orbite basse, 1 = la Terre est déjà loin derrière. */
  recede: number;
  /** Rapprochement apparent de la Lune (0..1). */
  approach: number;
}

/** Part de `tli` consacrée à la fermeture de la trappe et à la mise en attitude, avant l'allumage. */
export const IGNITION_AT = 0.18;

export function departure(tli: number): DeparturePose {
  const t = clamp(tli);
  const burn = clamp((t - IGNITION_AT) / (1 - IGNITION_AT));
  return {
    advance: burn * burn * 28,
    thrust: smoothstep(burn * 5),
    recede: smoothstep(burn),
    approach: smoothstep((burn - 0.2) / 0.8),
  };
}

export interface LandingPose {
  /** Position du vaisseau (base des moteurs) au-dessus du site d'alunissage. */
  x: number;
  y: number;
  /** Inclinaison autour de z : π/2 = couché (moteurs vers l'avant, freinage), 0 = debout. */
  tilt: number;
  /** Moteurs Raptor : freinage en orbite, puis rallumage pour la descente finale, coupés au contact. */
  main: number;
  /** Nuage de poussière soulevé près du sol (0..1). */
  dust: number;
}

/** Altitude de départ de la descente, en unités au-dessus du site. */
export const LANDING_START_Y = 95;

/** Pose du vaisseau lunaire pendant la descente, de l'orbite lunaire (0) au sol (1). */
export function landing(land: number): LandingPose {
  const t = clamp(land);
  // Trajectoire : longue glissade freinée, puis descente presque verticale.
  const glide = smoothstep(t / 0.62);
  const final = smoothstep((t - 0.55) / 0.4);
  return {
    x: lerp(lerp(-70, -3, glide), 0, final),
    y: lerp(lerp(LANDING_START_Y, 14, glide), 0, final),
    tilt: (Math.PI / 2) * (1 - smoothstep((t - 0.2) / 0.38)),
    main: Math.max(bump(t, 0.04, 0.6), bump(t, 0.52, 1)),
    // La poussière se soulève à l'approche du sol puis retombe une fois posé.
    dust: bump(t, 0.6, 1),
  };
}

/** Part du déplacement du vaisseau suivie par la caméra au départ : il gagne un peu de terrain à l'écran. */
const DEPARTURE_FOLLOW = 0.75;

/**
 * Décalage (x, y) de la caméra pour suivre le vaisseau pendant le voyage vers la Lune.
 * Les images clés de ces décors sont donc exprimées par rapport au vaisseau.
 */
export function shipFollow(env: number, tli: number, land: number): [number, number] {
  if (env >= 2.5) {
    const p = landing(land);
    return [p.x, p.y];
  }
  if (env >= 1.5) return [-departure(tli).advance * DEPARTURE_FOLLOW, 0];
  return [0, 0];
}
