import { useMemo } from 'react';
import type { Vec3 } from '../../../types';
import { BODY_RADIUS, LAYOUT } from '../../../data/layout';
import { useMaterials } from '../materials';
import { PartGroup } from '../PartGroup';
import { MerlinEngine } from '../primitives/MerlinEngine';
import { Flame } from '../primitives/Flame';

const { base, top, nozzleLength } = LAYOUT.engines;
const HEIGHT = top - base;
const RING_RADIUS = 0.255;

/** Positions des neuf moteurs : un au centre et huit en couronne. */
export function octawebLayout(ringRadius = RING_RADIUS): Vec3[] {
  const ring = Array.from({ length: 8 }, (_, i): Vec3 => {
    const a = (i / 8) * Math.PI * 2;
    return [Math.cos(a) * ringRadius, 0, Math.sin(a) * ringRadius];
  });
  return [[0, 0, 0], ...ring];
}

interface EngineSectionProps {
  reducedMotion?: boolean;
}

export function EngineSection({ reducedMotion = false }: EngineSectionProps) {
  const m = useMaterials();
  const engines = useMemo(() => octawebLayout(), []);
  return (
    <PartGroup id="engines" base={base}>
      <mesh position={[0, HEIGHT / 2, 0]} material={m.steel} castShadow>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS * 0.98, HEIGHT, 48]} />
      </mesh>
      <mesh position={[0, 0.01, 0]} material={m.carbon}>
        <cylinderGeometry args={[BODY_RADIUS * 0.99, BODY_RADIUS * 0.99, 0.02, 48]} />
      </mesh>
      {engines.map((p, i) => (
        <MerlinEngine key={i} position={p} materials={m} />
      ))}
      <Flame y={-nozzleLength + 0.02} radius={BODY_RADIUS} flicker={!reducedMotion} />
    </PartGroup>
  );
}
