import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, type Group } from 'three';
import { clamp } from '../../../../lib/math';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { CutawayView } from '../CutawayView';
import { useMaterials } from '../materials';
import { Flap } from '../primitives/Flap';
import { TankSection } from '../primitives/TankSection';
import { Frost } from '../primitives/Frost';
import { useShipVariant } from '../ShipVariant';
import { useSceneState } from '../SceneStateContext';
import { Kit, useKits } from '../detail';
import { ShipDetails, hingeCover } from './ShipDetails';
import { STEEL_TILE, TILE_TILE, scaleUv } from '../textures';

const { base, barrelTop } = LAYOUT.ship;
const H = barrelTop - base;
const DOOR_Y = 26.0;
const DOOR_H = 0.95;
const DOOR_ARC = 1.1;
const SATELLITES = 6;
/** Hauteur de la trappe de largage, partagée avec les décors qui larguent des satellites. */
export const PAYLOAD_DOOR_Y = DOOR_Y;

/** Fût du vaisseau : réservoirs, bouclier thermique, volets arrière et soute. */
export function ShipBody({ door: doorOverride }: { door?: () => number } = {}) {
  const m = useMaterials();
  const state = useSceneState();
  const variant = useShipVariant();
  const flaps = useRef<(Group | null)[]>([]);
  const door = useRef<Group>(null);
  const sats = useRef<(Group | null)[]>([]);

  const geo = useMemo(() => {
    const barrel = scaleUv(new CylinderGeometry(RADIUS, RADIUS, H, 72, 1, true), 2 * Math.PI * RADIUS, H, STEEL_TILE);
    const tilesH = H - 0.3;
    const shield = scaleUv(
      new CylinderGeometry(RADIUS + 0.014, RADIUS + 0.014, tilesH, 72, 1, true, -Math.PI / 2, Math.PI),
      Math.PI * RADIUS,
      tilesH,
      TILE_TILE,
    );
    const doorArc = (r: number) => new CylinderGeometry(r, r, DOOR_H, 16, 1, true, Math.PI - DOOR_ARC / 2, DOOR_ARC);
    return { barrel, shield, slot: doorArc(RADIUS + 0.006), door: doorArc(RADIUS + 0.02) };
  }, []);

  const covers = useKits(() => {
    const k = new Kit();
    hingeCover(k, 3.75, 0.13, 0.08);
    return { steel: k.build() };
  });

  useFrame(({ clock }) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const swing = s.flaps * Math.sin(t * 1.3) * 0.45 + s.pitch * 0.25;
    flaps.current.forEach((f, i) => f?.rotation.set(0, (i ? -1 : 1) * swing, 0));
    door.current?.position.set(0, (doorOverride ? doorOverride() : s.door) * (DOOR_H + 0.05), 0);
    sats.current.forEach((g, i) => {
      const p = clamp(s.door * 1.5 - i * 0.09);
      g?.position.set(Math.sin(i * 1.7) * 0.25 * p, (i - SATELLITES / 2) * 0.1 + p * i * 0.12, -(RADIUS - 0.35) - p * (2.2 + i * 0.75));
      g?.rotation.set(p * 0.2 * i, p * 0.4 * (i % 2 ? 1 : -1), 0);
    });
  });

  return (
    <group>
      <mesh geometry={geo.barrel} material={m.steel} position={[0, base + H / 2, 0]} />
      <Frost bottom={19.2} top={22.3} thetaStart={Math.PI * 0.62} thetaLength={Math.PI * 0.76} />
      <Frost bottom={22.65} top={24.45} thetaStart={Math.PI * 0.62} thetaLength={Math.PI * 0.76} />
      {variant.shield && <mesh geometry={geo.shield} material={m.tiles} position={[0, base + 0.3 + (H - 0.3) / 2, 0]} />}
      {/* Fonds : dôme arrière et cloison sous le nez (visibles en vue éclatée). */}
      <mesh material={m.cavity} position={[0, base + 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.01, 48]} />
      </mesh>
      <mesh material={m.sooty} position={[0, barrelTop - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS - 0.01, 48]} />
      </mesh>
      {/* Gaine de câbles, côté sous le vent. */}
      <mesh material={m.steel} position={[-RADIUS * 0.72, base + H / 2, -RADIUS * 0.72]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.22, H - 0.6, 0.12]} />
      </mesh>
      <ShipDetails m={m} />
      {/* Volets arrière, sur la frontière entre tuiles et acier. */}
      {variant.flaps && [1, -1].map((side, i) => (
        <group key={side} position={[side * RADIUS, base + 0.55, 0]} scale={[side, 1, 1]}>
          {/* Carénage de la charnière et de ses moteurs électriques, côté sous le vent. */}
          <mesh geometry={covers.steel} material={m.steel} />
          <group ref={(g) => (flaps.current[i] = g)}>
            <Flap materials={m} length={3.9} root={1.25} tip={0.8} />
          </group>
        </group>
      ))}
      {/* Trappe de largage, sur la face arrière (-z). */}
      <mesh geometry={geo.slot} material={m.cavity} position={[0, DOOR_Y, 0]} />
      <group ref={door}>
        <mesh geometry={geo.door} material={m.steel} position={[0, DOOR_Y, 0]} />
      </group>
      {variant.payload && Array.from({ length: SATELLITES }, (_, i) => (
        <group key={i} ref={(g) => (sats.current[i] = g)}>
          <group position={[0, DOOR_Y, 0]}>
            <mesh material={m.panel} position={[0, 0, 0]}>
              <boxGeometry args={[1.0, 0.05, 0.62]} />
            </mesh>
            <mesh material={m.plumbing} position={[0, 0.035, 0]}>
              <boxGeometry args={[0.9, 0.02, 0.5]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Vue en coupe : oxygène liquide en bas, méthane en haut, tube de descente. */}
      <CutawayView>
        <TankSection halfWidth={RADIUS - 0.04} bottom={19.05} top={22.45} bottomBulge={0.32} topBulge={-0.3} material={m.lox} />
        <TankSection halfWidth={RADIUS - 0.04} bottom={22.47} top={25.05} bottomBulge={0.3} topBulge={0.34} material={m.methane} />
        <mesh material={m.methane} position={[0, 20.7, 0.004]}>
          <planeGeometry args={[0.12, 3.3]} />
        </mesh>
        <mesh material={m.cavity} position={[0, 26.0, -0.004]}>
          <planeGeometry args={[2 * RADIUS - 0.08, 1.4]} />
        </mesh>
      </CutawayView>
    </group>
  );
}
