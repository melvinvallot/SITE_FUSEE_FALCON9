import type { MaterialSet } from '../materials';

interface PayloadProps {
  y: number;
  materials: MaterialSet;
}

/** Satellite générique replié, logé sous la coiffe. */
export function Payload({ y, materials }: PayloadProps) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.06, 0]} material={materials.steel}>
        <cylinderGeometry args={[0.2, 0.3, 0.12, 32]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={materials.foil}>
        <boxGeometry args={[0.46, 0.85, 0.46]} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[side * 0.25, 0.55, 0]} material={materials.panel}>
          <boxGeometry args={[0.03, 0.78, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, 1.08, 0]} rotation={[Math.PI, 0, 0]} material={materials.steel}>
        <coneGeometry args={[0.12, 0.18, 24, 1, true]} />
      </mesh>
    </group>
  );
}
