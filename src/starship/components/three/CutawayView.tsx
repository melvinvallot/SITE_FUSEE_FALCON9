import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { smoothstep } from '../../../lib/math';
import { STACK_YAW } from '../../data/layout';
import { useSceneState } from './SceneStateContext';

/**
 * Contenu visible seulement en vue en coupe : un plan tourné vers la caméra
 * qui passe par l'axe du lanceur, et qui se déploie de la gauche vers la droite.
 */
export function CutawayView({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const state = useSceneState();

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const k = smoothstep((state.current.cutaway - 0.55) / 0.45);
    g.visible = k > 0.01;
    if (!g.visible) return;
    // Orientation dans le repère du lanceur, lui-même tourné de STACK_YAW.
    g.rotation.y = Math.atan2(camera.position.x, camera.position.z) - STACK_YAW;
    g.scale.set(k, 1, 1);
  });

  return (
    <group ref={group}>
      <group position={[0, 0, 0.012]}>{children}</group>
    </group>
  );
}
