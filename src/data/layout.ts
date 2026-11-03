/**
 * Cotes du modèle 3D, en unités de scène (1 unité ≈ 5 m).
 * Chaque sous-ensemble est positionné par la base de son groupe.
 */
export const BODY_RADIUS = 0.37;

export const LAYOUT = {
  engines: { base: 0, top: 0.6, nozzleLength: 0.6 },
  firstStage: { base: 0.6, top: 8.0 },
  interstage: { base: 8.0, top: 9.2 },
  secondStage: { base: 9.2, top: 11.8, nozzleLength: 1.2 },
  fairing: { base: 11.8, top: 14.4, radius: 0.52 },
  legs: { base: 0.6, length: 2.2 },
} as const;

/** Angle d'ouverture des jambes déployées, en radians. */
export const LEG_DEPLOY_ANGLE = (155 * Math.PI) / 180;

/** Hauteur de vol atteinte à la fin de la séquence de lancement. */
export const LAUNCH_ALTITUDE = 34;
