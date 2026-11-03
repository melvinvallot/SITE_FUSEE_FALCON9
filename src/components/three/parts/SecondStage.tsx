import { BODY_RADIUS, LAYOUT } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';
import { Bell } from '../primitives/Bell';

const { base, top, nozzleLength } = LAYOUT.secondStage;
const HEIGHT = top - base;

export function SecondStage() {
  const m = useMaterials();
  return (
    <PartGroup id="secondStage" base={base}>
      <mesh position={[0, HEIGHT / 2, 0]} material={m.hull} castShadow>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, HEIGHT, 48]} />
      </mesh>
      <mesh position={[0, HEIGHT - 0.06, 0]} material={m.carbon}>
        <cylinderGeometry args={[BODY_RADIUS + 0.004, BODY_RADIUS + 0.004, 0.08, 48, 1, true]} />
      </mesh>
      <mesh position={[0, HEIGHT + 0.06, 0]} material={m.steel}>
        <cylinderGeometry args={[0.18, BODY_RADIUS * 0.95, 0.12, 32]} />
      </mesh>
      {/* Merlin Vacuum : chambre puis grande tuyère en niobium */}
      <mesh position={[0, -0.08, 0]} material={m.copper}>
        <cylinderGeometry args={[0.07, 0.06, 0.16, 24]} />
      </mesh>
      <group position={[0, -0.16, 0]}>
        <Bell length={nozzleLength - 0.16} throat={0.05} exit={0.33} material={m.niobium} segments={48} />
      </group>
    </PartGroup>
  );
}
