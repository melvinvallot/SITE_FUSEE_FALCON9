import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { lerp, smoothstep } from '../../../../lib/math';
import { boostbackBurn, ascentThrust, landingBurn, launchLift } from '../../../lib/flight';
import { useMaterials } from '../materials';
import { Plume } from '../primitives/Plume';
import { Raptor, ring } from '../primitives/Raptor';
import { RaptorShowcase } from '../primitives/RaptorShowcase';
import { useSceneState } from '../SceneStateContext';

const MOUNT_Y = 0.45;
const CENTER = ring(3, 0.2, Math.PI / 6);
const INNER = ring(10, 0.56, 0);
const OUTER = ring(20, 0.95, Math.PI / 20);
/** Position du moteur présenté en gros plan, dans le repère du groupe. */
export const SHOWCASE = { x: 0, y: -3.4, z: 2.6, scale: 3 };

/** Les 33 Raptor du propulseur : 13 orientables au centre, 20 fixes en couronne. */
export function BoosterEngines({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const m = useMaterials();
  const state = useSceneState();
  const featured = useRef<Group>(null);
  const showcase = useRef<Group>(null);
  const all = useMemo(() => [...CENTER, ...INNER, ...OUTER], []);
  const steerable = useMemo(() => [...CENTER, ...INNER], []);
  const [fx, fz] = CENTER[0]!;

  useFrame(({ clock }) => {
    const k = smoothstep(state.current.raptor);
    if (featured.current) featured.current.visible = k < 0.02;
    const g = showcase.current;
    if (!g) return;
    g.visible = k >= 0.02;
    if (!g.visible) return;
    g.position.set(lerp(fx, SHOWCASE.x, k), lerp(MOUNT_Y, SHOWCASE.y, k), lerp(fz, SHOWCASE.z, k));
    g.scale.setScalar(lerp(1, SHOWCASE.scale, k));
    g.rotation.y = reducedMotion ? 0.5 : clock.elapsedTime * 0.25;
  });

  return (
    <group>
      <group position={[0, MOUNT_Y, 0]}>
        {all.map(([x, z], i) =>
          i === 0 ? (
            <group key={i} ref={featured}>
              <Raptor variant="sea" materials={m} position={[x, 0, z]} />
            </group>
          ) : (
            <Raptor key={i} variant={i < 13 ? 'sea' : 'boost'} materials={m} position={[x, 0, z]} />
          ),
        )}
      </group>
      <group ref={showcase}>
        <RaptorShowcase materials={m} />
      </group>
      <group position={[0, MOUNT_Y - 0.62, 0]}>
        <Plume
          nozzles={all}
          nozzleRadius={0.14}
          radius={1.05}
          length={10}
          intensity={() => {
            const s = state.current;
            return ascentThrust(s.launch, s.sep);
          }}
          spread={() => Math.min(1, launchLift(state.current.launch) / 45)}
          flicker={!reducedMotion}
          light={260}
        />
        <Plume
          nozzles={steerable}
          nozzleRadius={0.14}
          radius={0.6}
          length={5}
          intensity={() => Math.max(boostbackBurn(state.current.capture), landingBurn(state.current.capture))}
          flicker={!reducedMotion}
          light={120}
        />
      </group>
    </group>
  );
}
