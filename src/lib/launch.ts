import { LAUNCH_ALTITUDE } from '../data/layout';
import { clamp } from './math';

/** Part de la séquence de lancement consacrée à l'allumage, au sol. */
export const IGNITION_SHARE = 0.12;

/** Intensité des moteurs (0..1) : les flammes montent avant le décollage. */
export const ignition = (launch: number): number => clamp(launch / IGNITION_SHARE);

/** Altitude du lanceur : nulle pendant l'allumage, puis accélération quadratique. */
export const launchLift = (launch: number): number => {
  const t = clamp((launch - IGNITION_SHARE) / (1 - IGNITION_SHARE));
  return t * t * LAUNCH_ALTITUDE;
};
