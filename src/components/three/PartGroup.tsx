import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, type Color, type Group } from 'three';
import type { PartId } from '../../types';
import { PARTS } from '../../data/parts';
import { useSceneState } from './SceneStateContext';

interface PartGroupProps {
  id: PartId;
  /** Altitude de la base de la pièce sur le lanceur assemblé. */
  base: number;
  children: ReactNode;
}

interface Tracked {
  material: MeshStandardMaterial;
  base: Color;
}

/**
 * Groupe animé commun à toutes les pièces : il gère le déplacement en
 * vue éclatée et l'atténuation des pièces qui ne sont pas présentées.
 */
export function PartGroup({ id, base, children }: PartGroupProps) {
  const group = useRef<Group>(null);
  const tracked = useRef<Tracked[]>([]);
  const state = useSceneState();
  const [ox, oy, oz] = PARTS[id].explodeOffset;

  useLayoutEffect(() => {
    const seen = new Set<MeshStandardMaterial>();
    group.current?.traverse((obj) => {
      if (obj instanceof Mesh && obj.material instanceof MeshStandardMaterial && !seen.has(obj.material)) {
        seen.add(obj.material);
      }
    });
    tracked.current = [...seen].map((material) => ({ material, base: material.color.clone() }));
  }, []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    g.position.set(ox * s.explode, base + oy * s.explode, oz * s.explode);

    const strongest = Math.max(...Object.values(s.focus));
    const dim = Math.max(0, strongest - s.focus[id]);
    for (const { material, base: c } of tracked.current) {
      material.color.copy(c).multiplyScalar(1 - 0.75 * dim);
      material.envMapIntensity = 1 - 0.75 * dim;
    }
  });

  return (
    <group ref={group} name={id}>
      {children}
    </group>
  );
}
