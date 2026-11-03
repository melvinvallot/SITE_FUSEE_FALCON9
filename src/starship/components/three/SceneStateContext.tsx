import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp } from '../../../lib/math';
import type { Store } from '../../../lib/store';
import { sampleTimeline } from '../../lib/timeline';
import type { Keyframe, SceneState } from '../../types';

const SceneStateContext = createContext<MutableRefObject<SceneState> | null>(null);

interface TimelineDriverProps {
  keyframes: readonly Keyframe[];
  progress: Store<number>;
  reducedMotion?: boolean;
  children: ReactNode;
}

/**
 * Lit la progression du défilement à chaque image, l'adoucit, et publie
 * l'état interpolé de la scène dans une ref partagée (aucun rendu React).
 */
export function TimelineDriver({ keyframes, progress, reducedMotion = false, children }: TimelineDriverProps) {
  const smoothed = useRef(progress.get());
  const state = useRef<SceneState>(sampleTimeline(keyframes, smoothed.current));

  useFrame((_, delta) => {
    const target = progress.get();
    smoothed.current = reducedMotion ? target : damp(smoothed.current, target, 2.6, Math.min(delta, 0.1));
    state.current = sampleTimeline(keyframes, smoothed.current);
  }, -2);

  return <SceneStateContext.Provider value={state}>{children}</SceneStateContext.Provider>;
}

export function useSceneState(): MutableRefObject<SceneState> {
  const ctx = useContext(SceneStateContext);
  if (!ctx) throw new Error('useSceneState doit être utilisé dans <TimelineDriver>.');
  return ctx;
}
