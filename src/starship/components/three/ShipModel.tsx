import { useMemo } from 'react';
import { ShipBody } from './parts/ShipBody';
import { ShipEngines } from './parts/ShipEngines';
import { ShipNose } from './parts/ShipNose';
import { LAYOUT, RADIUS } from '../../data/layout';
import { useMaterials } from './materials';
import { Plume } from './primitives/Plume';
import { ShipVariantContext } from './ShipVariant';

interface ShipModelProps {
  /** Jambes d'atterrissage de la version lunaire. */
  legs?: boolean;
  /** Version lunaire : ni volets, ni satellites, mais des propulseurs d'atterrissage haut sur la coque. */
  lunar?: boolean;
  /** Ouverture de la trappe de largage (0..1), lue à chaque image. */
  door?: () => number;
  /** Poussée des moteurs principaux (0..1), lue à chaque image. */
  thrust?: () => number;
  /** Poussée des propulseurs d'atterrissage (version lunaire). */
  thrusters?: () => number;
}

/** Hauteur des propulseurs d'atterrissage, sous le nez. */
const THRUSTER_Y = 25.4;
const THRUSTERS = 4;
const SINGLE: readonly (readonly [number, number])[] = [[0, 0]];

/**
 * Vaisseau seul, base à l'origine, pour les décors (orbite, Lune).
 */
export function ShipModel({ legs = false, lunar = false, door, thrust, thrusters }: ShipModelProps) {
  const m = useMaterials();
  const variant = useMemo(() => ({ flaps: !lunar, shield: !lunar, payload: false }), [lunar]);
  return (
    <ShipVariantContext.Provider value={variant}>
      <group position={[0, -LAYOUT.ship.base, 0]}>
        <ShipNose />
        <ShipBody door={door} />
        <ShipEngines flames={!!thrust} thrust={thrust} />
        {legs &&
          Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i} position={[Math.sin(a) * RADIUS, LAYOUT.ship.base + 0.9, Math.cos(a) * RADIUS]} rotation={[0, a, 0]}>
                <mesh material={m.sooty} position={[0, -0.5, 0.22]} rotation={[0.42, 0, 0]}>
                  <boxGeometry args={[0.12, 1.15, 0.12]} />
                </mesh>
                <mesh material={m.sooty} position={[0, -0.98, 0.45]}>
                  <cylinderGeometry args={[0.2, 0.24, 0.06, 16]} />
                </mesh>
              </group>
            );
          })}
        {lunar &&
          Array.from({ length: THRUSTERS }, (_, i) => {
            const a = ((i + 0.5) / THRUSTERS) * Math.PI * 2;
            return (
              <group key={i} position={[Math.sin(a) * (RADIUS + 0.12), THRUSTER_Y, Math.cos(a) * (RADIUS + 0.12)]} rotation={[0, a, 0]}>
                {/* Carénage du propulseur, plaqué sur la coque, tuyère vers le bas et un peu vers l'extérieur. */}
                <mesh material={m.sooty} position={[0, 0.25, -0.05]}>
                  <boxGeometry args={[0.42, 0.9, 0.22]} />
                </mesh>
                <group rotation={[-0.28, 0, 0]}>
                  <mesh material={m.nozzle} position={[0, -0.28, 0]}>
                    <cylinderGeometry args={[0.07, 0.12, 0.22, 16, 1, true]} />
                  </mesh>
                  {thrusters && (
                    <group position={[0, -0.4, 0]}>
                      <Plume nozzles={SINGLE} nozzleRadius={0.1} radius={0.22} length={3.2} intensity={thrusters} spread={() => 1} light={0} />
                    </group>
                  )}
                </group>
              </group>
            );
          })}
      </group>
    </ShipVariantContext.Provider>
  );
}
