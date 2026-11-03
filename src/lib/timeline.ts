import type { Keyframe, PartId, SceneState } from '../types';
import { lerp, lerpVec3, smoothstep } from './math';

export const PART_IDS: readonly PartId[] = [
  'fairing',
  'secondStage',
  'interstage',
  'firstStage',
  'engines',
  'legs',
];

const focusVector = (id: PartId | null): Record<PartId, number> =>
  Object.fromEntries(PART_IDS.map((p) => [p, p === id ? 1 : 0])) as Record<PartId, number>;

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

/** Interpole l'état de la scène pour une progression de défilement (0..1). */
export function sampleTimeline(keyframes: readonly Keyframe[], progress: number): SceneState {
  const { from, to, t } = locate(keyframes.length, progress);
  const a = keyframes[from]!;
  const b = keyframes[to]!;
  const fa = focusVector(a.focus);
  const fb = focusVector(b.focus);

  return {
    cameraPosition: lerpVec3(a.cameraPosition, b.cameraPosition, t),
    cameraTarget: lerpVec3(a.cameraTarget, b.cameraTarget, t),
    explode: lerp(a.explode, b.explode, t),
    legs: lerp(a.legs, b.legs, t),
    launch: lerp(a.launch, b.launch, t),
    spin: lerp(a.spin, b.spin, t),
    focus: Object.fromEntries(PART_IDS.map((p) => [p, lerp(fa[p], fb[p], t)])) as Record<PartId, number>,
  };
}

/** Index de la section la plus proche de la progression courante. */
export const activeIndex = (count: number, progress: number): number =>
  count <= 1 ? 0 : Math.round(Math.min(Math.max(progress, 0), 1) * (count - 1));
