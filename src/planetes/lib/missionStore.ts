import { createStore } from '../../lib/store';
import type { Phase } from './mission';

/** Valeurs affichées pendant la mission, publiées par la scène environ 10 fois par seconde. */
export interface Hud {
  phase: Phase | 'idle';
  /** Date simulée, en jours depuis l'an 2000. */
  day: number;
  /** Avancement du trajet, de 0 à 1. */
  progress: number;
  /** Vitesse par rapport au Soleil, en km/s. */
  speed: number;
  /** Distance à la Terre, en km. */
  fromEarth: number;
}

export const hudStore = createStore<Hud>({ phase: 'idle', day: 0, progress: 0, speed: 0, fromEarth: 0 });
