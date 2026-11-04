import type { FocusId, Keyframe, Scalars, Vec3 } from '../types';
import { toWorld } from './layout';

const DEFAULTS: Scalars = {
  fov: 32,
  explode: 0,
  cutaway: 0,
  site: 0,
  compare: 0,
  flaps: 0,
  door: 0,
  pitch: 0,
  plasma: 0,
  fins: 0,
  raptor: 0,
  launch: 0,
  sep: 0,
  capture: 0,
  refuel: 0,
  env: 0,
  sway: 0,
  alt: 0,
};

const frame = (
  sectionId: string,
  cameraPosition: Vec3,
  cameraTarget: Vec3,
  focus: FocusId | null,
  values: Partial<Scalars> = {},
): Keyframe => ({ ...DEFAULTS, ...values, sectionId, cameraPosition, cameraTarget, focus });

/** Vue éclatée commune aux fiches détaillées. */
const exploded: Partial<Scalars> = { explode: 1 };

/**
 * Une image clé par section de la page, dans le même ordre. La cible de la
 * caméra est décalée pour placer la fusée du côté opposé au texte.
 * Pendant l'ascension, les positions sont relatives à l'altitude atteinte.
 */
/**
 * Après la capture, le vol reste terminé : sans cela, le passage vers l'orbite
 * ramènerait capture, sep et launch à 0 et le propulseur, encore visible pendant
 * la première moitié du fondu, remonterait avant de disparaître.
 */
const landed: Partial<Scalars> = { launch: 1, sep: 1, capture: 1 };

export const KEYFRAMES: readonly Keyframe[] = [
  frame('accueil', [26, 6, 64], [-12.5, 14, 0], null, { site: 1, sway: 1 }),
  frame('echelle', [-14, 9, 62], [13, 13, 0], null, { site: 1, compare: 1, sway: 0.5 }),
  frame('vue-eclatee', [26, 19, 66], [-10, 17, 0], null, { ...exploded, sway: 0.6 }),

  frame('vaisseau', [-17, 33, 36], [6, 30.5, 0], 'ship', exploded),
  frame('nez', [8.5, 39, 13], [-3, 36.2, 0], 'nose', { ...exploded, flaps: 1 }),
  frame('soute', toWorld([-6.5, 33.5, -24]), toWorld([-4.6, 31.6, 0]), 'payload', { ...exploded, door: 1, fov: 34 }),
  // Vaisseau assemblé et seul (le propulseur est masqué), couché comme pendant la rentrée.
  frame('bouclier', toWorld([44, 20.5, 11]), toWorld([0, 24.5, 11]), 'heatShield', { pitch: 1, plasma: 1, fov: 34 }),
  frame('reservoirs', [-13, 30, 23], [4.4, 28.5, 0], 'shipTanks', { ...exploded, cutaway: 1 }),
  frame('moteurs-vaisseau', [6, 17.8, 7.5], [-1.8, 21.6, 0], 'shipEngines', exploded),

  frame('anneau', [-7, 22.8, 9], [2.3, 19.9, 0], 'hotStage', exploded),
  frame('super-heavy', [24, 12, 42], [-7.5, 8.5, 0], 'booster', { ...exploded, cutaway: 1 }),
  frame('ailerons', [-7.5, 19, 9], [2.6, 16, 0], 'gridFins', { ...exploded, fins: 1 }),
  frame('moteurs-propulseur', [4.5, -10, 5.5], [-1.5, -3.2, 0], 'boosterEngines', exploded),
  frame('raptor', [0.6, -6.4, 8.8], [4.6, -7.5, 1.3], 'raptor', { ...exploded, raptor: 1, fov: 30 }),

  frame('pas-de-tir', [-16, 6, 60], [11, 14, 0], null, { site: 1, sway: 0.5 }),
  frame('decollage', [26, 1, 60], [-10.5, 10, 0], null, { site: 1, launch: 0.12 }),
  frame('ascension', [24, -3, 62], [11, 5, 0], null, { site: 1, launch: 0.62, alt: 0.3 }),
  frame('separation', [32, 20, 84], [-13, 24, 0], null, { site: 1, launch: 1, sep: 1, alt: 1 }),
  // Retour du propulseur, étalé sur quatre sections : demi-tour, descente, freinage, capture.
  frame('retour', [-24, 19, 76], [11, 9, 0], null, { site: 1, launch: 1, sep: 1, capture: 0.3, alt: 0.9 }),
  frame('descente', [27, 2, 68], [-10, 11, 0], null, { site: 1, launch: 1, sep: 1, capture: 0.6, alt: 0.45, fins: 1 }),
  frame('atterrissage', [-19, 4, 52], [8, 10, 0], null, { site: 1, launch: 1, sep: 1, capture: 0.86, alt: 0.04 }),
  frame('capture', [22, 7, 60], [-11, 12, 0], null, { ...landed, site: 1 }),

  frame('ravitaillement', [-10, 26, 64], [15, 12, 0], null, { ...landed, env: 1, refuel: 1, fov: 34, sway: 0.6 }),
  frame('destinations', [12, 5, 42], [-7, 10, 0], null, { ...landed, env: 2, sway: 0.5 }),
  frame('fin', [-32, 12, 72], [11, 9, 0], null, { ...landed, env: 2, sway: 1 }),
];
