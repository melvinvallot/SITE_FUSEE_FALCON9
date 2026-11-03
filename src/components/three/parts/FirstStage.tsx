import { BODY_RADIUS, LAYOUT } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';

const { base, top } = LAYOUT.firstStage;
const HEIGHT = top - base;

/** Repères structurels : jonction des réservoirs et anneaux de raidissement. */
const RINGS = [0.12, HEIGHT * 0.3, HEIGHT - 0.05];

export function FirstStage() {
  const m = useMaterials();
  return (
    <PartGroup id="firstStage" base={base}>
      <mesh position={[0, HEIGHT / 2, 0]} material={m.hull} castShadow receiveShadow>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, HEIGHT, 64]} />
      </mesh>
      {RINGS.map((y, i) => (
        <mesh key={y} position={[0, y, 0]} material={i === 0 ? m.carbon : m.steel}>
          <cylinderGeometry args={[BODY_RADIUS + 0.006, BODY_RADIUS + 0.006, i === 0 ? 0.25 : 0.03, 64, 1, true]} />
        </mesh>
      ))}
      {/* Gaine de câbles le long des réservoirs */}
      <mesh position={[0, HEIGHT / 2, BODY_RADIUS + 0.02]} material={m.steel}>
        <boxGeometry args={[0.07, HEIGHT - 0.4, 0.04]} />
      </mesh>
    </PartGroup>
  );
}
