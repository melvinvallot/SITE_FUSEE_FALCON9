import type { Keyframe } from '../types';

/**
 * Une image clé par section de la page, dans le même ordre.
 * Les cibles de caméra sont décalées horizontalement pour que la fusée
 * se place du côté opposé au texte.
 */
export const KEYFRAMES: readonly Keyframe[] = [
  {
    sectionId: 'accueil',
    cameraPosition: [10, 6, 26],
    cameraTarget: [-3.4, 6.6, 0],
    explode: 0, legs: 0, launch: 0, spin: 0.18, focus: null,
  },
  {
    sectionId: 'anatomie',
    cameraPosition: [-15, 11, 37],
    cameraTarget: [3.6, 10, 0],
    explode: 1, legs: 0, launch: 0, spin: 0.08, focus: null,
  },
  {
    sectionId: 'coiffe',
    cameraPosition: [4.6, 21, 6.4],
    cameraTarget: [-1.7, 19.4, 0],
    explode: 1, legs: 0, launch: 0, spin: 0, focus: 'fairing',
  },
  {
    sectionId: 'deuxieme-etage',
    cameraPosition: [-4.8, 16.2, 6.8],
    cameraTarget: [1.9, 14.8, 0],
    explode: 1, legs: 0, launch: 0, spin: 0, focus: 'secondStage',
  },
  {
    sectionId: 'interetage',
    cameraPosition: [3.8, 12.8, 4.8],
    cameraTarget: [-1.4, 11.6, 0],
    explode: 1, legs: 0, launch: 0, spin: 0, focus: 'interstage',
  },
  {
    sectionId: 'premier-etage',
    cameraPosition: [-7.5, 7.5, 12],
    cameraTarget: [3.2, 5.9, 0],
    explode: 1, legs: 0, launch: 0, spin: 0, focus: 'firstStage',
  },
  {
    sectionId: 'moteurs',
    cameraPosition: [2.6, -2.8, 3.6],
    cameraTarget: [-0.9, 0.1, 0],
    explode: 1, legs: 0, launch: 0, spin: 0, focus: 'engines',
  },
  {
    sectionId: 'jambes',
    cameraPosition: [-6.5, 1.5, 8.5],
    cameraTarget: [2.2, 1.8, 0],
    explode: 0, legs: 1, launch: 0, spin: 0, focus: 'legs',
  },
  {
    sectionId: 'decollage',
    cameraPosition: [11, 4, 28],
    cameraTarget: [-3.4, 6.8, 0],
    explode: 0, legs: 0, launch: 0.12, spin: 0, focus: null,
  },
  {
    sectionId: 'en-vol',
    cameraPosition: [-9, 4, 24],
    cameraTarget: [3.2, 8, 0],
    explode: 0, legs: 0, launch: 1, spin: 0, focus: null,
  },
];
