import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { LatheGeometry, Vector2, type Group } from 'three';
import { BODY_RADIUS, LAYOUT } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';
import { Payload } from '../primitives/Payload';
import { useSceneState } from '../SceneStateContext';

const { base, top, radius } = LAYOUT.fairing;
const HEIGHT = top - base;

/** Profil de la coiffe : jupe conique, partie cylindrique puis ogive. */
function fairingProfile(): Vector2[] {
  const cyl = HEIGHT * 0.5;
  const points = [new Vector2(BODY_RADIUS, 0), new Vector2(radius, 0.2), new Vector2(radius, cyl)];
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const r = radius * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.08 * t);
    points.push(new Vector2(Math.max(r, i === steps ? 0 : 0.02), cyl + t * (HEIGHT - cyl)));
  }
  return points;
}

export function Fairing() {
  const materials = useMaterials();
  const state = useSceneState();
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);

  const [halfA, halfB] = useMemo(() => {
    const profile = fairingProfile();
    return [new LatheGeometry(profile, 48, 0, Math.PI), new LatheGeometry(profile, 48, Math.PI, Math.PI)];
  }, []);

  useFrame(() => {
    const open = state.current.explode;
    left.current?.position.set(0.75 * open, 0, 0);
    left.current?.rotation.set(0, 0, -0.16 * open);
    right.current?.position.set(-0.75 * open, 0, 0);
    right.current?.rotation.set(0, 0, 0.16 * open);
  });

  return (
    <PartGroup id="fairing" base={base}>
      <group ref={left}>
        <mesh geometry={halfA} material={materials.hull} castShadow />
      </group>
      <group ref={right}>
        <mesh geometry={halfB} material={materials.hull} castShadow />
      </group>
      <Payload y={0.15} materials={materials} />
    </PartGroup>
  );
}
