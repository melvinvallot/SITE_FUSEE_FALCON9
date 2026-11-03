import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { BODY_RADIUS, LAYOUT } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';
import { GridFin } from '../primitives/GridFin';
import { useSceneState } from '../SceneStateContext';

const { base, top } = LAYOUT.interstage;
const HEIGHT = top - base;
const HINGE = HEIGHT - 0.42;
const ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

export function Interstage() {
  const m = useMaterials();
  const state = useSceneState();
  const fins = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const s = state.current;
    const deploy = Math.max(s.legs, s.focus.interstage);
    fins.current.forEach((f) => f?.rotation.set((Math.PI / 2) * deploy, 0, 0));
  });

  return (
    <PartGroup id="interstage" base={base}>
      <mesh position={[0, HEIGHT / 2, 0]} material={m.carbon} castShadow>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, HEIGHT, 48, 1, true]} />
      </mesh>
      {ANGLES.map((angle, i) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <group position={[0, HINGE, BODY_RADIUS + 0.035]}>
            <group ref={(g) => (fins.current[i] = g)}>
              <GridFin material={m.titanium} />
            </group>
          </group>
        </group>
      ))}
    </PartGroup>
  );
}
