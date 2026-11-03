import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type Mesh } from 'three';
import { BODY_RADIUS, LAYOUT, LEG_DEPLOY_ANGLE } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';
import { useSceneState } from '../SceneStateContext';

const { base, length } = LAYOUT.legs;
const PIVOT_Z = BODY_RADIUS + 0.045;
const STRUT_ANCHOR = new Vector3(0, 1.0, BODY_RADIUS);
const STRUT_ON_LEG = 1.15;
const ANGLES = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
const UP = new Vector3(0, 1, 0);

interface LegRefs {
  leg: Group | null;
  strut: Mesh | null;
}

export function LandingLegs() {
  const m = useMaterials();
  const state = useSceneState();
  const refs = useRef<LegRefs[]>(ANGLES.map(() => ({ leg: null, strut: null })));
  const tmp = useMemo(() => ({ end: new Vector3(), dir: new Vector3() }), []);

  useFrame(() => {
    const angle = LEG_DEPLOY_ANGLE * state.current.legs;
    tmp.end.set(0, STRUT_ON_LEG * Math.cos(angle), PIVOT_Z + STRUT_ON_LEG * Math.sin(angle));
    tmp.dir.subVectors(tmp.end, STRUT_ANCHOR);
    const len = tmp.dir.length();
    refs.current.forEach(({ leg, strut }) => {
      leg?.rotation.set(angle, 0, 0);
      if (strut) {
        strut.position.copy(STRUT_ANCHOR).addScaledVector(tmp.dir, 0.5);
        strut.quaternion.setFromUnitVectors(UP, tmp.dir.clone().normalize());
        strut.scale.set(1, Math.max(len, 0.001), 1);
        strut.visible = len > 0.25;
      }
    });
  });

  return (
    <PartGroup id="legs" base={base}>
      {ANGLES.map((a, i) => (
        <group key={a} rotation={[0, a, 0]}>
          <group position={[0, 0, PIVOT_Z]} ref={(g) => (refs.current[i]!.leg = g)}>
            <mesh position={[0, length / 2, 0]} material={m.carbon} castShadow>
              <boxGeometry args={[0.15, length, 0.06]} />
            </mesh>
            <mesh position={[0, length - 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}>
              <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
            </mesh>
          </group>
          <mesh ref={(s) => (refs.current[i]!.strut = s)} material={m.steel}>
            <cylinderGeometry args={[0.025, 0.025, 1, 10]} />
          </mesh>
        </group>
      ))}
    </PartGroup>
  );
}
