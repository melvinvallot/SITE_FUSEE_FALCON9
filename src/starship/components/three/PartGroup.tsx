import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, type Color, type Group } from 'three';
import { EXPLODE_OFFSETS, GROUP_FOCUS, type GroupId } from '../../data/layout';
import { dimming } from '../../lib/timeline';
import { useSceneState } from './SceneStateContext';

interface Tracked {
  material: MeshStandardMaterial;
  color: Color;
  emissive: number;
}

/**
 * Groupe commun à tous les sous-ensembles du lanceur : déplacement en vue
 * éclatée et atténuation de ce qui n'est pas présenté.
 */
export function PartGroup({ id, children }: { id: GroupId; children: ReactNode }) {
  const group = useRef<Group>(null);
  const tracked = useRef<Tracked[]>([]);
  const state = useSceneState();
  const [ox, oy, oz] = EXPLODE_OFFSETS[id];

  useLayoutEffect(() => {
    const seen = new Set<MeshStandardMaterial>();
    group.current?.traverse((obj) => {
      if (obj instanceof Mesh && obj.material instanceof MeshStandardMaterial) seen.add(obj.material);
    });
    tracked.current = [...seen].map((material) => ({
      material,
      color: material.color.clone(),
      emissive: material.emissiveIntensity,
    }));
  }, []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    g.position.set(ox * s.explode, oy * s.explode, oz * s.explode);
    const dim = dimming(s.focus, GROUP_FOCUS[id]);
    for (const t of tracked.current) {
      t.material.color.copy(t.color).multiplyScalar(1 - 0.72 * dim);
      t.material.envMapIntensity = 1 - 0.75 * dim;
      t.material.emissiveIntensity = t.emissive * (1 - 0.8 * dim);
    }
  });

  return (
    <group ref={group} name={id}>
      {children}
    </group>
  );
}
