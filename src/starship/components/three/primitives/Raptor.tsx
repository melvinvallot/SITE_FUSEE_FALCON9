import { useMemo } from 'react';
import { CylinderGeometry, LatheGeometry, SphereGeometry, Vector2 } from 'three';
import type { MaterialSet } from '../materials';

export type RaptorVariant = 'sea' | 'boost' | 'vacuum';

/** Profil de tuyère en cloche, du col (y = 0) vers la sortie (y = -length). */
export function bellGeometry(length: number, throat: number, exit: number, segments = 32): LatheGeometry {
  const steps = 18;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return new Vector2(throat + (exit - throat) * Math.pow(t, 0.58), -t * length);
  });
  return new LatheGeometry(points, segments);
}

/** Dimensions des trois variantes, en unités (1 u = 4 m). */
export const RAPTOR_DIMENSIONS: Record<RaptorVariant, { exit: number; bell: number; head: number }> = {
  sea: { exit: 0.142, bell: 0.36, head: 0.32 },
  boost: { exit: 0.142, bell: 0.33, head: 0.26 },
  vacuum: { exit: 0.29, bell: 0.95, head: 0.34 },
};

// Géométries partagées par tous les moteurs du lanceur (jamais modifiées).
const shared = (() => {
  const g = {} as Record<RaptorVariant, { bell: LatheGeometry; liner: LatheGeometry }> & {
    chamber: CylinderGeometry;
    dome: SphereGeometry;
    pump: CylinderGeometry;
    pipe: CylinderGeometry;
  };
  for (const v of ['sea', 'boost', 'vacuum'] as const) {
    const d = RAPTOR_DIMENSIONS[v];
    g[v] = { bell: bellGeometry(d.bell, 0.05, d.exit), liner: bellGeometry(d.bell * 0.22, 0.048, 0.05 + (d.exit - 0.05) * 0.4, 20) };
  }
  g.chamber = new CylinderGeometry(0.058, 0.05, 0.12, 20);
  g.dome = new SphereGeometry(0.07, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  g.pump = new CylinderGeometry(0.03, 0.03, 0.11, 14);
  g.pipe = new CylinderGeometry(0.012, 0.012, 0.16, 8);
  return g;
})();

interface RaptorProps {
  variant: RaptorVariant;
  materials: MaterialSet;
  position?: readonly [number, number, number];
}

/**
 * Moteur Raptor simplifié pour l'assemblage (y = 0 au plan de montage,
 * la tuyère descend sous le plan). Version détaillée : `RaptorShowcase`.
 */
export function Raptor({ variant, materials, position = [0, 0, 0] }: RaptorProps) {
  const d = RAPTOR_DIMENSIONS[variant];
  const bellMaterial = variant === 'vacuum' ? materials.vacuum : materials.nozzle;
  return (
    <group position={position as [number, number, number]}>
      <mesh geometry={shared.dome} material={materials.plumbing} position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={shared.chamber} material={materials.plumbing} position={[0, -d.head + 0.12, 0]} />
      <mesh geometry={shared.pump} material={materials.copper} position={[0.07, -0.1, 0.02]} />
      <mesh geometry={shared.pump} material={materials.plumbing} position={[-0.07, -0.1, -0.02]} />
      <group position={[0, -d.head + 0.06, 0]}>
        <mesh geometry={shared[variant].bell} material={bellMaterial} />
        <mesh geometry={shared[variant].liner} material={materials.copper} scale={[0.97, 1, 0.97]} />
      </group>
    </group>
  );
}

/** Fond de tuyère : profondeur sous le plan de montage. */
export const raptorDepth = (variant: RaptorVariant): number =>
  RAPTOR_DIMENSIONS[variant].head - 0.06 + RAPTOR_DIMENSIONS[variant].bell;

/** Profil lissé d'une turbopompe (carter). */
export function pumpHousing(): LatheGeometry {
  const pts = [
    new Vector2(0, 0.12),
    new Vector2(0.05, 0.11),
    new Vector2(0.075, 0.07),
    new Vector2(0.08, 0),
    new Vector2(0.06, -0.06),
    new Vector2(0.035, -0.1),
    new Vector2(0, -0.11),
  ];
  return new LatheGeometry(pts, 24);
}

/** Détermine les positions des moteurs d'une couronne. */
export function ring(count: number, radius: number, phase = 0): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius];
  });
}

export function useRaptorGeometry() {
  return useMemo(() => shared, []);
}
