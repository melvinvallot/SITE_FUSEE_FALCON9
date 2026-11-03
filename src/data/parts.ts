import type { PartId, RocketPart } from '../types';

export const PARTS: Record<PartId, RocketPart> = {
  fairing: {
    id: 'fairing',
    name: 'Coiffe',
    altitude: { from: 57, to: 70 },
    summary:
      "Deux demi-coquilles en composite carbone protègent la charge utile pendant la traversée de l'atmosphère. Une fois l'air trop rare pour l'abîmer, des poussoirs pneumatiques les écartent, puis chaque moitié redescend sous parachute pour être récupérée en mer.",
    specs: [
      { label: 'Hauteur', value: '13,1 m' },
      { label: 'Diamètre', value: '5,2 m' },
      { label: 'Structure', value: 'Carbone sur nid d’abeille aluminium' },
    ],
    explodeOffset: [0, 6.4, 0],
  },
  secondStage: {
    id: 'secondStage',
    name: 'Deuxième étage',
    altitude: { from: 42, to: 57 },
    summary:
      "Un seul moteur Merlin Vacuum, doté d'une tuyère géante optimisée pour le vide, place la charge sur son orbite. Il peut se rallumer plusieurs fois, ce qui permet de déposer des satellites sur des orbites différentes au cours d'une même mission.",
    specs: [
      { label: 'Moteur', value: '1 × Merlin Vacuum' },
      { label: 'Poussée dans le vide', value: '981 kN' },
      { label: 'Durée de combustion', value: '≈ 6 min 30' },
    ],
    explodeOffset: [0, 4.8, 0],
  },
  interstage: {
    id: 'interstage',
    name: 'Interétage et ailerons',
    altitude: { from: 36, to: 42 },
    summary:
      "Cette jupe en fibre de carbone abrite la tuyère du deuxième étage et porte le système de séparation pneumatique. À son sommet, quatre ailerons en grille en titane se déploient au retour pour piloter le premier étage pendant sa descente hypersonique.",
    specs: [
      { label: 'Matériau', value: 'Composite carbone' },
      { label: 'Ailerons en grille', value: '4, en titane' },
      { label: 'Séparation', value: 'Poussoirs pneumatiques' },
    ],
    explodeOffset: [0, 3.0, 0],
  },
  firstStage: {
    id: 'firstStage',
    name: 'Premier étage',
    altitude: { from: 3, to: 36 },
    summary:
      "Deux réservoirs en alliage aluminium-lithium contiennent le kérosène RP-1 et l'oxygène liquide. Après environ deux minutes et demie de poussée, l'étage se sépare, fait demi-tour et revient se poser sur une barge ou près du pas de tir.",
    specs: [
      { label: 'Ergols', value: 'RP-1 et oxygène liquide' },
      { label: 'Durée de combustion', value: '≈ 2 min 40' },
      { label: 'Réutilisation', value: 'Atterrissage vertical' },
    ],
    explodeOffset: [0, 1.6, 0],
  },
  engines: {
    id: 'engines',
    name: 'Octaweb et neuf Merlin',
    altitude: { from: 0, to: 3 },
    summary:
      "Neuf moteurs Merlin 1D sont montés sur une structure appelée Octaweb : huit en couronne autour d'un moteur central. La disposition tolère la perte d'un moteur en vol, et seul le moteur central se rallume pour les freinages du retour.",
    specs: [
      { label: 'Poussée au décollage', value: '7 607 kN' },
      { label: 'Cycle', value: 'Générateur de gaz' },
      { label: 'Moteurs', value: '9 × Merlin 1D' },
    ],
    explodeOffset: [0, 0, 0],
  },
  legs: {
    id: 'legs',
    name: "Jambes d'atterrissage",
    altitude: { from: 0, to: 10 },
    summary:
      "Quatre jambes en fibre de carbone restent plaquées contre le fuselage pendant la montée. Quelques secondes avant le contact, un système à hélium sous pression les déploie, et elles encaissent le choc de l'atterrissage.",
    specs: [
      { label: 'Nombre', value: '4' },
      { label: 'Matériau', value: 'Carbone et nid d’abeille' },
      { label: 'Déploiement', value: 'Hélium sous pression' },
    ],
    explodeOffset: [0, 1.6, 0],
  },
};

/** Ordre de présentation, du sommet vers la base. */
export const PART_ORDER: readonly PartId[] = [
  'fairing',
  'secondStage',
  'interstage',
  'firstStage',
  'engines',
  'legs',
];
