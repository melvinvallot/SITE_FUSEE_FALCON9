import type { GaugeItem } from '../types';

/** Jauge de hauteur : chaque élément occupe sa hauteur réelle sur les 124 m. */
export const GAUGE_ITEMS: readonly GaugeItem[] = [
  { id: 'nose', name: 'Nez et volets avant', from: 107, to: 124, sectionId: 'nez', lane: 0 },
  { id: 'payload', name: 'Soute', from: 98, to: 110, sectionId: 'soute', lane: 1 },
  { id: 'shipTanks', name: 'Réservoirs du vaisseau', from: 75, to: 107, sectionId: 'reservoirs', lane: 0 },
  { id: 'shipEngines', name: 'Moteurs du vaisseau', from: 72, to: 77, sectionId: 'moteurs-vaisseau', lane: 1 },
  { id: 'hotStage', name: 'Anneau de séparation', from: 68, to: 72, sectionId: 'anneau', lane: 0 },
  { id: 'gridFins', name: 'Ailerons en grille', from: 62, to: 68, sectionId: 'ailerons', lane: 1 },
  { id: 'booster', name: 'Propulseur Super Heavy', from: 4, to: 68, sectionId: 'super-heavy', lane: 0 },
  { id: 'boosterEngines', name: '33 moteurs Raptor', from: 0, to: 4, sectionId: 'moteurs-propulseur', lane: 0 },
];

export const GAUGE_TOTAL = 124;
