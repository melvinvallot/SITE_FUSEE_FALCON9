import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { ignition, launchLift } from '../../../lib/launch';
import { useSceneState } from '../SceneStateContext';

interface SmokeProps {
  count?: number;
  /** Altitude du sol de la zone de lancement. */
  ground: number;
}

const dummy = new Object3D();

/** Nuage de vapeur au pied du lanceur pendant l'allumage et le décollage. */
export function Smoke({ count = 48, ground }: SmokeProps) {
  const mesh = useRef<InstancedMesh>(null);
  const state = useSceneState();
  const material = useMemo(
    () => new MeshStandardMaterial({ color: '#d9dee4', roughness: 1, transparent: true, depthWrite: false }),
    [],
  );
  const puffs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.4,
        reach: 1.2 + ((i * 7) % 11) / 4,
        size: 0.3 + ((i * 5) % 7) / 14,
        rise: ((i * 3) % 5) / 10,
      })),
    [count],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const { launch } = state.current;
    const ig = ignition(launch);
    const spread = ig + launchLift(launch) * 0.06;
    m.visible = ig > 0.001;
    material.opacity = 0.55 * Math.min(1, ig * 1.5);
    const t = clock.elapsedTime;
    puffs.forEach((p, i) => {
      const r = 0.6 + p.reach * spread;
      dummy.position.set(Math.cos(p.angle) * r, ground + 0.2 + p.rise * spread + Math.sin(t + i) * 0.05, Math.sin(p.angle) * r);
      dummy.scale.setScalar(p.size * (0.3 + spread * 0.8));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
      <icosahedronGeometry args={[1, 2]} />
    </instancedMesh>
  );
}
