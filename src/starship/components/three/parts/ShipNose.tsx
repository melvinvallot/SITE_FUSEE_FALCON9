import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, LatheGeometry, Vector2, type Group } from 'three';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { CutawayView } from '../CutawayView';
import { useMaterials } from '../materials';
import { Flap } from '../primitives/Flap';
import { useShipVariant } from '../ShipVariant';
import { useSceneState } from '../SceneStateContext';
import { FINE, Kit, useKits } from '../detail';
import { RING_PITCH, hingeCover, rcsPod } from './ShipDetails';
import { STEEL_TILE, TILE_TILE, scaleUv } from '../textures';

const { barrelTop, top } = LAYOUT.ship;
const H = top - barrelTop;

/** Rayon du nez à une hauteur relative t (0 à la base, 1 à la pointe). */
export const noseRadius = (t: number): number => RADIUS * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.6);

function profile(scale = 1, from = 0): Vector2[] {
  const steps = 28;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + (i / steps) * (1 - from);
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

  const kits = useKits(() => {
    const steel = new Kit();
    const sooty = new Kit();
    const cavity = new Kit();
    const tiles = new Kit();
    // Cordons de soudure des anneaux coniques, côté acier.
    for (let y = RING_PITCH; y / H < 0.84; y += RING_PITCH) steel.ring(noseRadius(y / H) + 0.003, 0.005, y, Math.PI, 0, 56);
    // Pointe entièrement couverte de tuiles.
    tiles.add(new LatheGeometry(profile(1.016, 0.9), 48));
    // Propulseurs d'attitude avant, côté acier.
    if (FINE) for (const a of [Math.PI - 0.5, Math.PI + 0.5]) rcsPod(sooty, cavity, a, H * 0.3, noseRadius(0.3) - 0.01);
    // Points d'appui pour la capture du vaisseau par la tour.
    for (const a of [Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35]) {
      const y = H * 0.12;
      sooty.onHull(new BoxGeometry(0.26, 0.2, 0.05), a, y, noseRadius(0.12), [0, 0, 0.01]);
      sooty.onHull(new BoxGeometry(0.16, 0.08, 0.16), a, y + 0.02, noseRadius(0.12), [0, 0, 0.08]);
    }
    const cover = new Kit();
    hingeCover(cover, 2.0, 0.085, 0.04);
    return {
      steel: steel.build(STEEL_TILE),
      sooty: sooty.build(STEEL_TILE),
      cavity: cavity.build(),
      tiles: scaleUv(tiles.build(), 2 * Math.PI * RADIUS * 0.3, H * 0.1, TILE_TILE),
      cover: cover.build(),
    };
  });

  useFrame(({ clock }) => {
    const s = state.current;
    const swing = s.flaps * Math.sin(clock.elapsedTime * 1.3 + 1.2) * 0.55 - s.pitch * 0.2;
    flaps.current.forEach((f) => f?.rotation.set(0, swing, 0));
  });

  const variant = useShipVariant();
  const flapBase = 0.15;
  const lean = Math.atan2(RADIUS - noseRadius(0.5), H * 0.5);

  return (
    <group position={[0, barrelTop, 0]}>
      <mesh geometry={geo.shell} material={m.steel} />
      {variant.shield && <mesh geometry={geo.shield} material={m.tiles} />}
      <mesh geometry={kits.steel} material={m.steel} />
      <mesh geometry={kits.sooty} material={m.sooty} />
      <mesh geometry={kits.cavity} material={m.hole} />
      {variant.shield && <mesh geometry={kits.tiles} material={m.tiles} />}
      <mesh material={m.sooty} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.01, 48]} />
      </mesh>
      {variant.flaps && [1, -1].map((side, i) => (
        <group
          key={side}
          position={[side * noseRadius(flapBase / H), flapBase, 0]}
          rotation={[0, 0, side * lean]}
          scale={[side, 1, 1]}
        >
          <mesh geometry={kits.cover} material={m.steel} />
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
