import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { launchLift } from '../../lib/launch';
import { useSceneState } from './SceneStateContext';
import { Fairing } from './parts/Fairing';
import { SecondStage } from './parts/SecondStage';
import { Interstage } from './parts/Interstage';
import { FirstStage } from './parts/FirstStage';
import { EngineSection } from './parts/EngineSection';
import { LandingLegs } from './parts/LandingLegs';

interface RocketProps {
  reducedMotion?: boolean;
}

/** Assemble les six sous-ensembles et applique rotation et décollage. */
export function Rocket({ reducedMotion = false }: RocketProps) {
  const group = useRef<Group>(null);
  const state = useSceneState();

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    g.position.y = launchLift(s.launch);
    if (!reducedMotion) g.rotation.y += s.spin * Math.min(delta, 0.1);
    // Revient doucement à une orientation de référence quand la rotation s'arrête.
    if (s.spin < 0.02) g.rotation.y += (Math.round(g.rotation.y / (Math.PI * 2)) * Math.PI * 2 + 0.6 - g.rotation.y) * 0.04;
  });

  return (
    <group ref={group}>
      <Fairing />
      <SecondStage />
      <Interstage />
      <FirstStage />
      <EngineSection reducedMotion={reducedMotion} />
      <LandingLegs />
    </group>
  );
}
