import { createContext, useContext, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Keyframe, SceneState } from '../../types';
import type { Store } from '../../lib/store';
import { damp } from '../../lib/math';
import { sampleTimeline } from '../../lib/timeline';

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

  // Priorité négative : s'exécute avant les autres abonnés, sans prendre la main sur le rendu.
  useFrame((_, delta) => {
    const target = progress.get();
    smoothed.current = reducedMotion ? target : damp(smoothed.current, target, 3.2, Math.min(delta, 0.1));
    state.current = sampleTimeline(keyframes, smoothed.current);
  }, -1);

  return <SceneStateContext.Provider value={state}>{children}</SceneStateContext.Provider>;
}

export function useSceneState(): MutableRefObject<SceneState> {
  const ctx = useContext(SceneStateContext);
  if (!ctx) throw new Error('useSceneState doit être utilisé dans <TimelineDriver>.');
  return ctx;
}
