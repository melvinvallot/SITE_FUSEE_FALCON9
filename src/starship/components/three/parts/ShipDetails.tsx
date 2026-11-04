import { BoxGeometry, CylinderGeometry } from 'three';
import { useShipVariant } from '../ShipVariant';
import { LAYOUT, RADIUS, STACK_YAW } from '../../../data/layout';
import { FINE, Kit, towerAngle, useKits } from '../detail';
import type { MaterialSet } from '../materials';
import { STEEL_TILE, TILE_TILE } from '../textures';

const { base, barrelTop } = LAYOUT.ship;
/** Pas des anneaux d'acier soudés (1,8 m), comme sur la texture. */
export const RING_PITCH = 0.45;
/** Angle de la gaine de câbles (repère des coques). */
export const RACEWAY_ANGLE = (-3 * Math.PI) / 4;
/** Les ailerons latéraux (« chines ») courent du volet arrière jusqu'au nez. */
const CHINE = { from: base + 4.55, to: barrelTop + 0.02, width: 0.13 };

/** Petit propulseur de contrôle d'attitude (gaz froid) : bossage, buse, orifice sombre. */
export function rcsPod(sooty: Kit, cavity: Kit, a: number, y: number, r: number): void {
  sooty.onHull(new BoxGeometry(0.16, 0.12, 0.03), a, y, r, [0, 0, 0.012]);
  for (const dx of [-0.04, 0.04]) {
    sooty.onHull(new CylinderGeometry(0.022, 0.03, 0.035, 10), a, y, r, [dx, 0, 0.04], [Math.PI / 2, 0, 0]);
    cavity.onHull(new CylinderGeometry(0.014, 0.014, 0.01, 10), a, y, r, [dx, 0, 0.058], [Math.PI / 2, 0, 0]);
  }
}

/** Plaque de raccordement au sol (« QD ») : ergols, électricité et gaz y transitent avant le décollage. */
export function qdPlate(sooty: Kit, cavity: Kit, plumbing: Kit, a: number, y: number, r: number, w = 0.55, h = 0.36): void {
  sooty.onHull(new BoxGeometry(w, h, 0.035), a, y, r, [0, 0, 0.012]);
  sooty.onHull(new BoxGeometry(w + 0.06, 0.025, 0.05), a, y + h / 2, r, [0, 0, 0.02]);
  const ports = [-w * 0.3, 0, w * 0.3];
  ports.forEach((dx, i) => {
    const pr = i === 1 ? 0.06 : 0.045;
    plumbing.onHull(new CylinderGeometry(pr + 0.012, pr + 0.012, 0.03, 16), a, y + 0.02, r, [dx, 0, 0.04], [Math.PI / 2, 0, 0]);
    cavity.onHull(new CylinderGeometry(pr, pr, 0.01, 16), a, y + 0.02, r, [dx, 0, 0.058], [Math.PI / 2, 0, 0]);
  });
  // Connecteurs électriques sous les vannes.
  for (const dx of [-0.08, 0, 0.08]) cavity.onHull(new BoxGeometry(0.04, 0.03, 0.01), a, y - h * 0.32, r, [dx, 0, 0.034]);
  if (FINE) {
    // Vis de fixation sur le pourtour.
    for (let i = 0; i < 8; i++) {
      const dx = -w / 2 + 0.03 + (i / 7) * (w - 0.06);
      for (const dy of [-h / 2 + 0.025, h / 2 - 0.04])
        plumbing.onHull(new CylinderGeometry(0.008, 0.008, 0.01, 6), a, y + dy, r, [dx, 0, 0.033], [Math.PI / 2, 0, 0]);
    }
  }
}

/**
 * Détails du fût du vaisseau : cordons de soudure, ailerons latéraux qui
 * bordent le bouclier thermique, gaine de câbles et ses colliers, conduite
 * secondaire, jupe arrière raidie, propulseurs d'attitude et plaque de raccordement.
 */
export function ShipDetails({ m }: { m: MaterialSet }) {
  const variant = useShipVariant();
  const g = useKits(() => {
    const steel = new Kit();
    const sooty = new Kit();
    const tiles = new Kit();
    const cavity = new Kit();
    const plumbing = new Kit();

    // Cordons de soudure en relief, côté acier (le bouclier les recouvre côté vent).
    for (let y = base + RING_PITCH; y < barrelTop - 0.05; y += RING_PITCH) steel.ring(RADIUS + 0.003, 0.0055, y, Math.PI);
    steel.ring(RADIUS + 0.004, 0.008, barrelTop - 0.01, Math.PI * 2);

    // Ailerons latéraux : profil en coin, acier dessous, tuiles dessus (côté vent).
    const len = CHINE.to - CHINE.from;
    for (const side of [1, -1]) {
      const x = side * (RADIUS + CHINE.width / 2 - 0.01);
      steel.box([CHINE.width, len, 0.05], [x, CHINE.from + len / 2, -0.005]);
      tiles.box([CHINE.width + 0.012, len, 0.016], [x, CHINE.from + len / 2, 0.026]);
      // Extrémités biseautées.
      steel.box([CHINE.width * 0.7, 0.22, 0.045], [x - side * 0.02, CHINE.from - 0.06, -0.005], [0, 0, side * 0.5]);
      if (FINE) {
        // Supports internes visibles sous l'aileron.
        for (let y = CHINE.from + 0.3; y < CHINE.to - 0.1; y += RING_PITCH)
          sooty.box([CHINE.width - 0.02, 0.025, 0.02], [x, y, -0.04]);
      }
    }

    // Jupe arrière : raidisseurs verticaux et bandeaux, sous le bouclier.
    sooty.ring(RADIUS + 0.004, 0.012, base + 0.03, Math.PI * 2);
    sooty.ring(RADIUS + 0.004, 0.008, base + 0.29, Math.PI * 2);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      sooty.onHull(new BoxGeometry(0.03, 0.26, 0.018), a, base + 0.16, RADIUS, [0, 0, 0.004]);
    }

    // Gaine de câbles : colliers réguliers et conduite secondaire.
    for (let y = base + 0.5; y < barrelTop - 0.3; y += 0.5) {
      sooty.onHull(new BoxGeometry(0.3, 0.035, 0.03), RACEWAY_ANGLE, y, RADIUS, [0, 0, 0.09]);
    }
    const pipeA = RACEWAY_ANGLE + 0.2;
    plumbing.onHull(new CylinderGeometry(0.022, 0.022, barrelTop - base - 1.2, 10), pipeA, base + (barrelTop - base) / 2 + 0.2, RADIUS, [0, 0, 0.04]);
    if (FINE) {
      for (let y = base + 0.8; y < barrelTop - 0.4; y += 0.4)
        sooty.onHull(new BoxGeometry(0.07, 0.025, 0.06), pipeA, y, RADIUS, [0, 0, 0.03]);
      // Boîtiers électroniques (avionique, batteries) le long de la gaine.
      for (const y of [base + 1.4, base + 5.2]) sooty.onHull(new BoxGeometry(0.2, 0.32, 0.07), RACEWAY_ANGLE - 0.22, y, RADIUS, [0, 0, 0.03]);
    }

    // Propulseurs d'attitude à l'arrière, côté acier.
    for (const a of [Math.PI - 0.55, Math.PI + 0.55]) rcsPod(sooty, cavity, a, base + 1.25, RADIUS);

    // Plaque de raccordement au sol, tournée vers la tour, à côté de la gaine de câbles.
    qdPlate(sooty, cavity, plumbing, towerAngle(STACK_YAW) - 0.24, base + 0.62, RADIUS);

    // Antennes (liaisons Starlink et télémétrie) : petits dômes plats.
    for (const [a, y] of [
      [Math.PI - 0.3, base + 6.6],
      [Math.PI + 0.32, base + 3.1],
    ] as const) {
      sooty.onHull(new CylinderGeometry(0.09, 0.1, 0.03, 20), a, y, RADIUS, [0, 0, 0.012], [Math.PI / 2, 0, 0]);
      plumbing.onHull(new CylinderGeometry(0.06, 0.06, 0.012, 20), a, y, RADIUS, [0, 0, 0.032], [Math.PI / 2, 0, 0]);
    }

    return { steel: steel.build(STEEL_TILE), sooty: sooty.build(STEEL_TILE), tiles: tiles.build(TILE_TILE), cavity: cavity.build(), plumbing: plumbing.build() };
  });

  return (
    <group>
      <mesh geometry={g.steel} material={m.steel} />
      <mesh geometry={g.sooty} material={m.sooty} />
      {variant.shield && <mesh geometry={g.tiles} material={m.tiles} />}
      <mesh geometry={g.cavity} material={m.hole} />
      <mesh geometry={g.plumbing} material={m.fitting} />
    </group>
  );
}

/** Carénage de charnière d'un volet (repère du volet : charnière selon y, côté sous le vent en –z). */
export function hingeCover(kit: Kit, length: number, radius: number, from = 0): void {
  kit.capsule(radius, length - 2 * radius, [0.02, from + length / 2, -radius * 0.55], [0, 0, 0], [0.75, 1, 1]);
}
