import { CatmullRomCurve3, CylinderGeometry, Euler, LatheGeometry, Quaternion, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three';
import { FINE, Kit } from '../detail';
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

/** Rayon de la tuyère à la fraction t de sa longueur (0 au col, 1 à la sortie). */
const bellRadius = (throat: number, exit: number, t: number): number => throat + (exit - throat) * Math.pow(t, 0.58);

const tube = (pts: [number, number, number][], r: number): TubeGeometry =>
  new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 16, r, 6, false);

/** Vérin d'orientation, du plan de montage vers la chambre de combustion. */
function actuator(kit: Kit, a: number, from: number, to: number, top: number, bottom: number): void {
  const p0 = new Vector3(Math.cos(a) * from, top, Math.sin(a) * from);
  const p1 = new Vector3(Math.cos(a) * to, bottom, Math.sin(a) * to);
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
  const e = new Euler().setFromQuaternion(q);
  // Corps du vérin et tige plus fine.
  kit.add(new CylinderGeometry(0.014, 0.014, len * 0.6, 8), [mid.x + dir.x * len * 0.18, mid.y + dir.y * len * 0.18, mid.z + dir.z * len * 0.18], [e.x, e.y, e.z]);
  kit.add(new CylinderGeometry(0.007, 0.007, len, 6), [mid.x, mid.y, mid.z], [e.x, e.y, e.z]);
}

/**
 * Géométries fusionnées d'un moteur, par matériau : une poignée d'appels de
 * dessin par moteur, malgré les turbopompes, tuyauteries, collecteurs,
 * vérins et cerclages de la tuyère.
 */
function buildVariant(v: RaptorVariant) {
  const d = RAPTOR_DIMENSIONS[v];
  const throatY = -d.head + 0.06;
  const ringY = (t: number) => throatY - t * d.bell;
  const plumbing = new Kit();
  const copper = new Kit();
  const bell = new Kit();

  // Tête motrice : dôme de l'injecteur, chambre, bride au col.
  plumbing.add(new SphereGeometry(0.07, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0, -0.02, 0], [Math.PI, 0, 0]);
  plumbing.add(new CylinderGeometry(0.058, 0.05, 0.12, 20), [0, -d.head + 0.12, 0]);
  plumbing.ring(0.056, 0.008, throatY + 0.005, Math.PI * 2, 0, 20);
  // Bloc du cardan, sous le plan de montage.
  plumbing.box([0.06, 0.03, 0.06], [0, -0.005, 0]);
  // Turbopompes oxygène (cuivrée) et méthane, avec leurs préchambres.
  copper.add(pumpHousing(), [0.075, -0.1, 0.02], [0, 0, 0], [0.42, 0.55, 0.42]);
  plumbing.add(pumpHousing(), [-0.075, -0.1, -0.02], [0, 0, 0], [0.42, 0.55, 0.42]);
  plumbing.cyl(0.018, 0.018, 0.05, [0.075, -0.05, 0.02], [0, 0, 0], 10);
  plumbing.cyl(0.018, 0.018, 0.05, [-0.075, -0.05, -0.02], [0, 0, 0], 10);
  // Collecteur de refroidissement en haut de la tuyère.
  plumbing.ring(bellRadius(0.05, d.exit, 0.12) + 0.008, 0.009, ringY(0.12), Math.PI * 2, 0, 24);
  if (FINE) {
    // Conduites des pompes vers l'injecteur et vers le collecteur.
    plumbing.add(tube([[0.075, -0.15, 0.02], [0.09, -0.19, 0.05], [0.06, ringY(0.12), 0.06]], 0.01));
    plumbing.add(tube([[-0.075, -0.15, -0.02], [-0.09, -0.19, -0.05], [-0.06, ringY(0.12), -0.06]], 0.01));
    plumbing.add(tube([[0.05, -0.06, -0.06], [0.07, -0.12, -0.07], [0.04, -0.17, -0.05]], 0.007));
    plumbing.add(tube([[-0.05, -0.06, 0.06], [-0.07, -0.12, 0.07], [-0.04, -0.17, 0.05]], 0.007));
    // Brides boulonnées des pompes.
    plumbing.ring(0.03, 0.004, -0.075, Math.PI * 2, 0, 12);
    if (v !== 'boost') {
      // Deux vérins à 90° : les moteurs orientables (pas la couronne fixe).
      actuator(plumbing, Math.PI / 4, 0.11, 0.06, -0.01, -d.head + 0.1);
      actuator(plumbing, (3 * Math.PI) / 4, 0.11, 0.06, -0.01, -d.head + 0.1);
    }
  }
  // Tuyère, chemise intérieure cuivrée et cerclages de raidissement.
  bell.add(bellGeometry(d.bell, 0.05, d.exit), [0, throatY, 0]);
  copper.add(bellGeometry(d.bell * 0.22, 0.048, 0.05 + (d.exit - 0.05) * 0.4, 20), [0, throatY, 0], [0, 0, 0], [0.97, 1, 0.97]);
  const stiffeners = v === 'vacuum' ? [0.3, 0.5, 0.68, 0.84, 0.97] : v === 'sea' ? [0.55, 0.97] : [0.97];
  for (const t of stiffeners) bell.ring(bellRadius(0.05, d.exit, t) + 0.003, t > 0.95 ? 0.006 : 0.004, ringY(t), Math.PI * 2, 0, 32);
  return { plumbing: plumbing.build(), copper: copper.build(), bell: bell.build() };
}

// Géométries partagées par tous les moteurs du lanceur (jamais modifiées).
const shared = {
  sea: buildVariant('sea'),
  boost: buildVariant('boost'),
  vacuum: buildVariant('vacuum'),
};

interface RaptorProps {
  variant: RaptorVariant;
  materials: MaterialSet;
  position?: readonly [number, number, number];
}

/**
 * Moteur Raptor de l'assemblage (y = 0 au plan de montage, la tuyère
 * descend sous le plan). Version agrandie et animée : `RaptorShowcase`.
 */
export function Raptor({ variant, materials, position = [0, 0, 0] }: RaptorProps) {
  const g = shared[variant];
  return (
    <group position={position as [number, number, number]}>
      <mesh geometry={g.plumbing} material={materials.plumbing} />
      <mesh geometry={g.copper} material={materials.copper} />
      <mesh geometry={g.bell} material={variant === 'vacuum' ? materials.vacuum : materials.nozzle} />
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
