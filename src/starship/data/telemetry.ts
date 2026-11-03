import type { TelemetryPoint } from '../lib/telemetry';
import { SECTIONS } from './sections';

const at = (id: string): number => {
  const index = SECTIONS.findIndex((s) => s.id === id);
  if (index < 0) throw new Error(`Section inconnue : ${id}`);
  return index / (SECTIONS.length - 1);
};

/**
 * Repères approximatifs d'un vol d'essai type, en km et km/h.
 * Les deux étages partagent les mêmes valeurs jusqu'à la séparation.
 */
export const TELEMETRY: readonly TelemetryPoint[] = [
  { at: at('decollage'), time: 0, booster: { altitude: 0, speed: 0 }, ship: { altitude: 0, speed: 0 } },
  { at: at('ascension'), time: 62, booster: { altitude: 12, speed: 1500 }, ship: { altitude: 12, speed: 1500 } },
  { at: at('separation'), time: 162, booster: { altitude: 70, speed: 5800 }, ship: { altitude: 70, speed: 5800 } },
  { at: at('retour'), time: 200, booster: { altitude: 90, speed: 2600 }, ship: { altitude: 105, speed: 8500 } },
  { at: at('descente'), time: 330, booster: { altitude: 14, speed: 1300 }, ship: { altitude: 145, speed: 19000 } },
  { at: at('atterrissage'), time: 395, booster: { altitude: 1, speed: 450 }, ship: { altitude: 150, speed: 23500 } },
  { at: at('capture'), time: 412, booster: { altitude: 0, speed: 0 }, ship: { altitude: 150, speed: 24500 } },
];
