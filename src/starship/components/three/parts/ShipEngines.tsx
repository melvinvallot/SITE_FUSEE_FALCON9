import { useMemo } from 'react';
import { RADIUS } from '../../../data/layout';
import { shipThrust } from '../../../lib/flight';
import { useMaterials } from '../materials';
import { Plume } from '../primitives/Plume';
import { Raptor, ring } from '../primitives/Raptor';
import { useSceneState } from '../SceneStateContext';

const MOUNT_Y = 19.2;
const SEA = ring(3, 0.32, Math.PI / 2);
const VAC = ring(3, 0.74, Math.PI / 2 + Math.PI / 3);

/** Moteurs du vaisseau : trois Raptor au centre, trois Raptor Vacuum autour. */
export function ShipEngines({ flames = true }: { flames?: boolean }) {
  const m = useMaterials();
  const state = useSceneState();
  const nozzles = useMemo(() => [...SEA, ...VAC], []);

  return (
    <group position={[0, MOUNT_Y, 0]}>
      {/* Plaque de poussée et bouclier arrière. */}
      <mesh material={m.sooty} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[RADIUS - 0.03, RADIUS - 0.03, 0.06, 48]} />
      </mesh>
      {SEA.map(([x, z], i) => (
        <Raptor key={`s${i}`} variant="sea" materials={m} position={[x, 0, z]} />
      ))}
      {VAC.map(([x, z], i) => (
        <Raptor key={`v${i}`} variant="vacuum" materials={m} position={[x, 0, z]} />
      ))}
      {flames && (
        <group position={[0, -1.22, 0]}>
          <Plume
            nozzles={nozzles}
            nozzleRadius={0.2}
            radius={0.95}
            length={7}
            intensity={() => shipThrust(state.current.sep, state.current.capture)}
            spread={() => 1}
            light={0}
          />
        </group>
      )}
    </group>
  );
}
