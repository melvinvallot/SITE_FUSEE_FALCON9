import type { Vec3 } from '../../../types';
import type { MaterialSet } from '../materials';
import { Bell } from './Bell';

interface MerlinEngineProps {
  position?: Vec3;
  materials: MaterialSet;
  /** Facteur d'échelle global du moteur. */
  scale?: number;
}

/** Moteur Merlin 1D simplifié : chambre de combustion et tuyère. */
export function MerlinEngine({ position = [0, 0, 0], materials, scale = 1 }: MerlinEngineProps) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.05, 0]} material={materials.copper}>
        <cylinderGeometry args={[0.035, 0.03, 0.1, 20]} />
      </mesh>
      <mesh position={[0.045, -0.04, 0]} material={materials.steel}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
      </mesh>
      <group position={[0, -0.1, 0]}>
        <Bell length={0.48} throat={0.024} exit={0.085} material={materials.nozzle} segments={28} />
      </group>
    </group>
  );
}
