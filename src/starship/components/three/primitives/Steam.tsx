import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { useSceneState } from '../SceneStateContext';
import { ignition, launchLift } from '../../../lib/flight';

interface SteamProps {
  count?: number;
  /** Altitude du sol. */
  ground: number;
}

const dummy = new Object3D();

/**
 * Nuage de vapeur du déluge d'eau : il jaillit sous la table de lancement à
 * l'allumage, puis roule sur le sol pendant que la fusée s'élève.
 */
export function Steam({ count = 140, ground }: SteamProps) {
  const mesh = useRef<InstancedMesh>(null);
  const state = useSceneState();
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#e3e6ea',
        emissive: '#ff8c42',
        emissiveIntensity: 0,
        roughness: 1,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const puffs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
        const a = (i / count) * Math.PI * 2 + r(1) * 0.6;
        return {
          angle: a,
          reach: 2 + Math.abs(r(2)) * 9,
          size: 0.8 + Math.abs(r(3)) * 1.6,
          rise: Math.abs(r(4)) * 3,
          phase: r(5) * 6.28,
        };
      }),
    [count],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const s = state.current;
    const ig = ignition(s.launch);
    const spread = Math.min(1.6, ig + launchLift(s.launch) * 0.03);
    const visible = ig > 0.001 && s.env < 0.5 && s.capture < 0.6;
    m.visible = visible;
    if (!visible) return;
    material.opacity = 0.6 * Math.min(1, ig * 1.4) * (1 - s.capture);
    material.emissiveIntensity = 0.35 * ig * Math.max(0, 1 - launchLift(s.launch) / 25);
    const t = clock.elapsedTime;
    puffs.forEach((p, i) => {
      const r = 1.5 + p.reach * spread;
      const wobble = Math.sin(t * 0.6 + p.phase) * 0.25;
      dummy.position.set(Math.cos(p.angle) * r, ground + 0.6 + p.rise * spread + wobble, Math.sin(p.angle) * r);
      dummy.scale.setScalar(p.size * (0.4 + spread * 0.9));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
      <icosahedronGeometry args={[1, 3]} />
    </instancedMesh>
  );
}
