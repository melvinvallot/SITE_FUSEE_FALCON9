import { useMemo } from 'react';
import { CylinderGeometry } from 'three';
import { LAYOUT, RADIUS, STACK_YAW } from '../../../data/layout';
import { CutawayView } from '../CutawayView';
import { useMaterials } from '../materials';
import { TankSection } from '../primitives/TankSection';
import { Frost } from '../primitives/Frost';
import { STEEL_TILE, scaleUv } from '../textures';

const { base, top } = LAYOUT.booster;
const H = top - base;
/** Hauteur des points de capture, sous les ailerons. */
export const CATCH_PIN_Y = 15.3;

/** Fût du propulseur Super Heavy, avec sa vue en coupe. */
export function Booster() {
  const m = useMaterials();
  const geo = useMemo(
    () => ({
      barrel: scaleUv(new CylinderGeometry(RADIUS, RADIUS, H, 72, 1, true), 2 * Math.PI * RADIUS, H, STEEL_TILE),
      skirt: scaleUv(new CylinderGeometry(RADIUS + 0.02, RADIUS + 0.04, 1.1, 72, 1, true), 2 * Math.PI * RADIUS, 1.1, STEEL_TILE),
    }),
    [],
  );

  return (
    <group>
      <mesh geometry={geo.barrel} material={m.steel} position={[0, base + H / 2, 0]} />
      <mesh geometry={geo.skirt} material={m.sooty} position={[0, 0.55, 0]} />
      {/* Bouclier du compartiment moteurs et dôme avant. */}
      <mesh material={m.sooty} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RADIUS + 0.03, 64]} />
      </mesh>
      <mesh material={m.sooty} position={[0, top - (RADIUS - 0.02) * Math.cos(Math.PI / 6), 0]}>
        <sphereGeometry args={[RADIUS - 0.02, 48, 10, 0, Math.PI * 2, 0, Math.PI / 6]} />
      </mesh>
      {/* Givre des réservoirs d'oxygène et de méthane liquides, séparés par le dôme commun. */}
      <Frost bottom={1.3} top={9.5} />
      <Frost bottom={10.0} top={16.3} />
      {/* Gaines de câbles et conduites extérieures. */}
      <mesh material={m.steel} position={[-RADIUS * 0.72, 8.6, -RADIUS * 0.72]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.26, 15, 0.14]} />
      </mesh>
      <mesh material={m.sooty} position={[RADIUS * 0.74, 3.2, -RADIUS * 0.7]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[0.18, 4.4, 0.12]} />
      </mesh>
      {/* Points de capture, saisis par les bras de la tour. */}
      {[1, -1].map((side) => (
        <group
          key={side}
          // Placés face aux bras de la tour (±z dans la scène), quelle que soit l'orientation du lanceur.
          position={[-side * (RADIUS + 0.08) * Math.sin(STACK_YAW), CATCH_PIN_Y, side * (RADIUS + 0.08) * Math.cos(STACK_YAW)]}
          rotation={[0, -STACK_YAW, 0]}
        >
          <mesh material={m.sooty}>
            <boxGeometry args={[0.42, 0.22, 0.2]} />
          </mesh>
          <mesh material={m.plumbing} position={[0, -0.14, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.26]} />
          </mesh>
        </group>
      ))}
      <CutawayView>
        <TankSection halfWidth={RADIUS - 0.04} bottom={1.1} top={9.7} bottomBulge={0.36} topBulge={-0.34} material={m.lox} />
        <TankSection halfWidth={RADIUS - 0.04} bottom={9.72} top={16.6} bottomBulge={0.34} topBulge={0.3} material={m.methane} />
        <mesh material={m.methane} position={[0, 5.2, 0.004]}>
          <planeGeometry args={[0.16, 8.6]} />
        </mesh>
      </CutawayView>
    </group>
  );
}
