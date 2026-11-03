import type { FocusId, Vec3 } from '../types';

/**
 * Cotes du modèle 3D, en unités de scène : 1 unité = 4 m.
 * Le système complet mesure 124 m (31 unités) pour 9 m de diamètre.
 */
export const METERS_PER_UNIT = 4;
export const RADIUS = 1.125;

export const LAYOUT = {
  /** Super Heavy : de 0 à 68 m, puis l'anneau de séparation jusqu'à 72 m. */
  booster: { base: 0, top: 17 },
  hotStage: { base: 17, top: 18 },
  /** Vaisseau Starship : de 72 à 124 m. */
  ship: { base: 18, barrelTop: 26.75, top: 31 },
  /** Soute, côté « sous le vent » du vaisseau (-z). */
  payloadBay: { from: 24.6, to: 27.4 },
} as const;

/**
 * Orientation du lanceur autour de son axe : le bouclier thermique (+z local)
 * regarde vers la droite, à l'opposé de la tour, et les volets restent visibles de profil.
 */
export const STACK_YAW = Math.PI / 3;

/** Convertit un point du repère du lanceur (avant rotation) en coordonnées de la scène. */
export const toWorld = ([x, y, z]: Vec3): Vec3 => [
  x * Math.cos(STACK_YAW) + z * Math.sin(STACK_YAW),
  y,
  -x * Math.sin(STACK_YAW) + z * Math.cos(STACK_YAW),
];

/** Centre du propulseur, pivot de sa bascule après la séparation. */
export const BOOSTER_PIVOT = (LAYOUT.booster.base + LAYOUT.hotStage.top) / 2;
/** Centre du vaisseau, pivot de sa bascule à l'horizontale. */
export const SHIP_PIVOT = (LAYOUT.ship.base + LAYOUT.ship.top) / 2;

/** Sous-ensembles animés indépendamment. */
export type GroupId = 'nose' | 'shipBody' | 'shipEngines' | 'hotStage' | 'booster' | 'gridFins' | 'boosterEngines';

/** Décalage de chaque sous-ensemble en vue éclatée. */
export const EXPLODE_OFFSETS: Record<GroupId, Vec3> = {
  nose: [0, 7.5, 0],
  shipBody: [0, 5.5, 0],
  shipEngines: [0, 4, 0],
  hotStage: [0, 2.4, 0],
  booster: [0, 0, 0],
  gridFins: [0, 0, 0],
  boosterEngines: [0, -3, 0],
};

/** Éléments mis en valeur qui éclairent chaque sous-ensemble. */
export const GROUP_FOCUS: Record<GroupId, readonly FocusId[]> = {
  nose: ['ship', 'nose', 'payload', 'heatShield'],
  shipBody: ['ship', 'payload', 'heatShield', 'shipTanks'],
  shipEngines: ['ship', 'shipEngines'],
  hotStage: ['hotStage'],
  booster: ['booster'],
  gridFins: ['booster', 'gridFins'],
  boosterEngines: ['booster', 'boosterEngines', 'raptor'],
};

/** Hauteur du pas de tir : la table de lancement culmine à y = 0, le sol est 5 unités plus bas. */
export const GROUND_Y = -5;
/** Position de la tour de lancement et de capture. */
export const TOWER_X = -6.4;
/** Hauteur (base du propulseur) où il est capturé par les bras de la tour. */
export const CATCH_BASE = 2.4;
/** Altitude atteinte à la fin de l'ascension, en unités. */
export const LAUNCH_ALTITUDE = 140;
