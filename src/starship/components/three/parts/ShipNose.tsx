import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { LatheGeometry, Vector2, type Group } from 'three';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { CutawayView } from '../CutawayView';
import { useMaterials } from '../materials';
import { Flap } from '../primitives/Flap';
import { useSceneState } from '../SceneStateContext';
import { STEEL_TILE, TILE_TILE, scaleUv } from '../textures';

const { barrelTop, top } = LAYOUT.ship;
const H = top - barrelTop;

/** Rayon du nez à une hauteur relative t (0 à la base, 1 à la pointe). */
export const noseRadius = (t: number): number => RADIUS * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.6);

function profile(scale = 1): Vector2[] {
  const steps = 28;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return new Vector2(noseRadius(t) * scale, t * H);
  });
}

/** Nez du vaisseau : ogive, tuiles côté vent et volets avant. */
export function ShipNose() {
  const m = useMaterials();
  const state = useSceneState();
  const flaps = useRef<(Group | null)[]>([]);

  const geo = useMemo(
    () => ({
      shell: scaleUv(new LatheGeometry(profile(), 72), 2 * Math.PI * RADIUS, H, STEEL_TILE),
      shield: scaleUv(new LatheGeometry(profile(1.013), 72, -Math.PI / 2, Math.PI), Math.PI * RADIUS, H, TILE_TILE),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const s = state.current;
    const swing = s.flaps * Math.sin(clock.elapsedTime * 1.3 + 1.2) * 0.55 - s.pitch * 0.2;
    flaps.current.forEach((f) => f?.rotation.set(0, swing, 0));
  });

  const flapBase = 0.15;
  const lean = Math.atan2(RADIUS - noseRadius(0.5), H * 0.5);

  return (
    <group position={[0, barrelTop, 0]}>
      <mesh geometry={geo.shell} material={m.steel} />
      <mesh geometry={geo.shield} material={m.tiles} />
      <mesh material={m.sooty} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.01, 48]} />
      </mesh>
      {[1, -1].map((side, i) => (
        <group
          key={side}
          position={[side * noseRadius(flapBase / H), flapBase, 0]}
          rotation={[0, 0, side * lean]}
          scale={[side, 1, 1]}
        >
          <group ref={(g) => (flaps.current[i] = g)}>
            <Flap materials={m} length={2.1} root={0.72} tip={0.42} />
          </group>
        </group>
      ))}
      {/* Réservoir d'appoint d'oxygène, logé dans le nez. */}
      <CutawayView>
        <mesh material={m.lox} position={[0, 1.6, 0]}>
          <circleGeometry args={[0.42, 40]} />
        </mesh>
      </CutawayView>
    </group>
  );
}
