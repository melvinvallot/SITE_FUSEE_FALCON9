import { lerp, lerpVec3, smoothstep } from '../../lib/math';
import type { FocusId, Keyframe, SceneState } from '../types';
import { SCALAR_KEYS } from '../types';

export const FOCUS_IDS: readonly FocusId[] = [
  'ship',
  'nose',
  'payload',
  'heatShield',
  'shipTanks',
  'shipEngines',
  'hotStage',
  'booster',
  'gridFins',
  'boosterEngines',
  'raptor',
];

const focusVector = (id: FocusId | null): Record<FocusId, number> =>
  Object.fromEntries(FOCUS_IDS.map((f) => [f, f === id ? 1 : 0])) as Record<FocusId, number>;

/**
 * Situe une progression globale entre deux images clés réparties
 * uniformément. Renvoie les indices encadrants et le facteur local adouci.
 */
export function locate(count: number, progress: number): { from: number; to: number; t: number } {
  if (count < 1) throw new Error('Au moins une image clé est requise.');
  if (count === 1) return { from: 0, to: 0, t: 0 };
  const scaled = Math.min(Math.max(progress, 0), 1) * (count - 1);
  const from = Math.min(Math.floor(scaled), count - 2);
  return { from, to: from + 1, t: smoothstep(scaled - from) };
}

/** Interpole l'état complet de la scène pour une progression de défilement (0..1). */
export function sampleTimeline(keyframes: readonly Keyframe[], progress: number): SceneState {
  const { from, to, t } = locate(keyframes.length, progress);
  const a = keyframes[from]!;
  const b = keyframes[to]!;
  const fa = focusVector(a.focus);
  const fb = focusVector(b.focus);
  const scalars = Object.fromEntries(SCALAR_KEYS.map((k) => [k, lerp(a[k], b[k], t)])) as Omit<
    SceneState,
    'cameraPosition' | 'cameraTarget' | 'focus'
  >;

  return {
    ...scalars,
    cameraPosition: lerpVec3(a.cameraPosition, b.cameraPosition, t),
    cameraTarget: lerpVec3(a.cameraTarget, b.cameraTarget, t),
    focus: Object.fromEntries(FOCUS_IDS.map((f) => [f, lerp(fa[f], fb[f], t)])) as Record<FocusId, number>,
  };
}

/** Index de la section la plus proche de la progression courante. */
export const activeIndex = (count: number, progress: number): number =>
  count <= 1 ? 0 : Math.round(Math.min(Math.max(progress, 0), 1) * (count - 1));

/**
 * Atténuation d'un sous-ensemble : 0 s'il fait partie des éléments mis en
 * valeur (ou si rien ne l'est), jusqu'à 1 s'il est hors sujet.
 */
export function dimming(focus: Record<FocusId, number>, lights: readonly FocusId[]): number {
  const strongest = Math.max(...Object.values(focus));
  const own = Math.max(0, ...lights.map((f) => focus[f]));
  return Math.max(0, strongest - own);
}
